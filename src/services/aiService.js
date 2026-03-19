/**
 * AI service
 * Multi-provider LLM API calls and component analysis
 */

import { toHex, ha, isLight, hexToRgb } from './colorUtils.js';

const __DEV__ = import.meta.env.DEV;
const devLog = (...args) => { if (__DEV__) console.log(...args); };
const devError = (...args) => { if (__DEV__) console.error(...args); };

/** Build headers for worker API calls, with optional dev bypass key */
function workerHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) {
    h['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY;
  }
  return h;
}

/**
 * Make a direct API call to an LLM provider (for local testing)
 * Supports Claude, OpenAI (GPT-4o), and Google Gemini
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} prompt - Analysis prompt
 * @param {number} maxTokens - Max output tokens
 * @param {string} provider - Provider name (claude-haiku, gpt4o-mini, gemini-flash, etc.)
 * @param {Object} devKeys - Developer API keys {anthropic, openai, gemini}
 * @returns {Promise<Object>} {text, parsed} result
 */
export async function directAPICall(
  imageBase64,
  prompt,
  maxTokens,
  provider,
  devKeys
) {
  const mediaType = imageBase64.startsWith('/9j/')
    ? 'image/jpeg'
    : imageBase64.startsWith('iVBOR')
      ? 'image/png'
      : 'image/png';

  if (provider.startsWith('claude')) {
    if (!devKeys.anthropic) throw new Error('No Anthropic API key configured');
    const model =
      provider === 'claude-sonnet'
        ? 'claude-sonnet-4-20250514'
        : 'claude-haiku-4-5-20251001';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': devKeys.anthropic,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Claude API error');
    const text = data.content?.[0]?.text || '';
    return { text, parsed: tryParseJSON(text) };
  }

  if (provider.startsWith('gpt') || provider === 'o4-mini') {
    if (!devKeys.openai) throw new Error('No OpenAI API key configured');
    const modelMap = {
      'gpt4o': 'gpt-4o',
      'gpt4o-mini': 'gpt-4o-mini',
      'gpt-4.1': 'gpt-4.1',
      'o4-mini': 'o4-mini',
      'gpt5-mini': 'gpt-5-mini',
      'gpt5': 'gpt-5.4',
      'gpt5-nano': 'gpt-5-nano',
    };
    const model = modelMap[provider] || 'gpt-4o-mini';
    // GPT-5 series and o4-mini use max_completion_tokens instead of max_tokens
    const useNewTokenParam = model.startsWith('gpt-5') || model.startsWith('o4-');
    const tokenParam = useNewTokenParam
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens };
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devKeys.openai}`,
      },
      body: JSON.stringify({
        model,
        ...tokenParam,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageBase64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'OpenAI API error');
    const text = data.choices?.[0]?.message?.content || '';
    return { text, parsed: tryParseJSON(text) };
  }

  const openrouterModelMap = {
    'hunter-alpha': 'openrouter/hunter-alpha',
    'grok-4.1-fast': 'x-ai/grok-4.1-fast',
    'qwen3.5-35b': 'qwen/qwen3.5-35b-a3b',
    'qwen3.5-9b': 'qwen/qwen3.5-9b',
    'qwen3.5-flash': 'qwen/qwen3.5-flash-02-23',
  };
  if (openrouterModelMap[provider]) {
    if (!devKeys.openrouter) throw new Error('No OpenRouter API key configured');
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${devKeys.openrouter}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: openrouterModelMap[provider],
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageBase64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
        // Disable thinking for Qwen 3.5 models to get clean JSON output
        ...((['qwen3.5-35b', 'qwen3.5-9b', 'qwen3.5-flash'].includes(provider)) && {
          chat_template_kwargs: { enable_thinking: false },
        }),
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'OpenRouter API error');
    const text = data.choices?.[0]?.message?.content || '';
    return { text, parsed: tryParseJSON(text) };
  }

  if (provider === 'gemini-flash') {
    if (!devKeys.gemini) throw new Error('No Gemini API key configured');
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${devKeys.gemini}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mediaType, data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    const data = await resp.json();
    if (!resp.ok || data.error)
      throw new Error(data.error?.message || 'Gemini API error');
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, parsed: tryParseJSON(text) };
  }

  throw new Error(`No API key for provider: ${provider}`);
}

/**
 * Build component-specific analysis prompt with type hints
 * @param {string} typeId - Component type ID (button, card, navbar, etc.)
 * @param {string} label - Component label/name
 * @param {Object} [COMP_META] - Optional component metadata
 * @param {Object} [COMP_SKELETON] - Optional component skeleton config
 * @returns {string} Detailed analysis prompt
 */
export function buildComponentPrompt(
  typeId,
  label,
  COMP_META,
  COMP_SKELETON
) {
  const meta = COMP_META?.[typeId];
  const cfg = COMP_SKELETON?.[typeId];

  if (!cfg) {
    return `You are a UI design analyst. Analyze this cropped UI element: "${label}".
Return ONLY valid JSON with these fields:
{ "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "border":"none or value", "padding":"Npx Npx", "fontSize":"Npx", "shadow":"none or value", "variant":"primary|secondary|custom", "description":"brief factual description", "confidence": 0.0-1.0 }
Rules:
- Extract ONLY what you can directly observe in the image
- Do NOT guess brand guidelines or design system rules
- Use standard front-end naming conventions
- If uncertain about a value, omit it rather than guess
- confidence: 0.8+ if clearly visible, 0.5-0.8 if partially visible, <0.5 if mostly guessed
Return ONLY valid JSON, no markdown, no explanation.`;
  }

  const stateHint =
    cfg.multiMode === 'state'
      ? `\nDetermine which STATE this element is in (e.g., expanded/collapsed, on/off, checked/unchecked, focus/default/error/disabled). Include "state" in your JSON.`
      : `\nIf you see visual differences from the default, include "variant" (e.g., filled, outline, ghost, soft).`;

  const metaHint = meta
    ? `\nThis component type is "${meta.description}". Known variants: [${meta.variants.join(', ')}]. Known states: [${meta.states.join(', ')}].`
    : '';

  return `You are a UI design analyst extracting visual properties from a cropped screenshot.
This is a "${label}" component (type: ${typeId}).${metaHint}

Analyze the image and return ONLY valid JSON matching this schema:
${cfg.promptSlots}
${stateHint}

Also include these fields:
- "variant": observed variant name (use standard naming: filled, outline, ghost, soft, etc.)
- "description": brief factual description of what you see (1 sentence)
- "label": any visible text in the element
- "confidence": 0.0-1.0 (how confident you are in the extraction)

Strict rules:
- Extract ONLY what is directly visible in the image
- Do NOT invent brand colors or design rules not shown
- Do NOT assume Tailwind/CSS classes — only report raw CSS values
- If a property is not clearly visible, OMIT it from the JSON
- Use #hex for colors, Npx for dimensions
- confidence: 0.8+ clearly visible, 0.5-0.8 partially visible, <0.5 uncertain
Return ONLY valid JSON, no markdown, no code fences, no explanation.`;
}

/**
 * Safely parse JSON with markdown code fence removal
 * @param {string} text - Text containing potential JSON
 * @returns {Object|null} Parsed JSON object or null if parse fails
 */
export function tryParseJSON(text) {
  if (!text) return null;
  // 1. Strip <think>...</think> reasoning blocks (Qwen, DeepSeek, etc.)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  // 2. Strip markdown code fences
  cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  // 3. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* fall through */ }
  // 4. Extract first JSON object from mixed text (non-greedy to avoid grabbing too much)
  const match = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* fall through */ }
  }
  // 5. Greedy fallback for deeply nested JSON
  const greedyMatch = cleaned.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    try {
      return JSON.parse(greedyMatch[0]);
    } catch { /* fall through */ }
  }
  // 6. Try to fix truncated JSON (missing closing braces)
  if (greedyMatch) {
    let attempt = greedyMatch[0];
    for (let i = 0; i < 5; i++) {
      attempt += '}';
      try {
        return JSON.parse(attempt);
      } catch { /* keep trying */ }
    }
  }
  return null;
}

/**
 * Analyze pixel data in an annotation region
 * Extracts dominant colors, luminance, and estimates component properties
 * @param {HTMLElement} canvas - Canvas element
 * @param {number} x - Region X coordinate
 * @param {number} y - Region Y coordinate
 * @param {number} w - Region width
 * @param {number} h - Region height
 * @returns {Object} Analysis result with colors, luminance, radius estimate, etc.
 */
export function analyzeAnnotationRegion(canvas, x, y, w, h) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(
    Math.round(x),
    Math.round(y),
    Math.round(w),
    Math.round(h)
  );
  const px = imgData.data;
  const totalPx = px.length / 4;

  // Collect pixel colors, compute average luminance
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  const colorBuckets = {};
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2],
      a = px[i + 3];
    if (a < 128) continue; // skip transparent
    sumR += r;
    sumG += g;
    sumB += b;

    // Quantize to 4-bit for bucketing
    const qr = (r >> 4) << 4,
      qg = (g >> 4) << 4,
      qb = (b >> 4) << 4;
    const key = `${qr},${qg},${qb}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }

  // Sort buckets → top 3 dominant colors
  const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1]);
  const dominantColors = sorted.slice(0, 3).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    return { hex: toHex(r, g, b), ratio: Math.round((count / totalPx) * 100) };
  });

  // Average color
  const avgR = Math.round(sumR / totalPx),
    avgG = Math.round(sumG / totalPx),
    avgB = Math.round(sumB / totalPx);
  const avgHex = toHex(avgR, avgG, avgB);
  const avgLum = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;

  // Background vs foreground guess — most dominant = bg, 2nd = fg
  const bgColor = dominantColors[0]?.hex || avgHex;
  const fgColor =
    dominantColors[1]?.hex || (avgLum > 128 ? '#333333' : '#ffffff');

  // Estimate border radius from region size (heuristic)
  const minDim = Math.min(w, h);
  const estimatedRadius =
    minDim < 30 ? 4 : minDim < 60 ? 8 : minDim < 120 ? 12 : 16;

  // Generate thumbnail data URL
  const thumbCanvas = document.createElement('canvas');
  const thumbScale = Math.min(80 / w, 60 / h, 1);
  thumbCanvas.width = Math.round(w * thumbScale);
  thumbCanvas.height = Math.round(h * thumbScale);
  const tCtx = thumbCanvas.getContext('2d');
  tCtx.drawImage(
    canvas,
    x,
    y,
    w,
    h,
    0,
    0,
    thumbCanvas.width,
    thumbCanvas.height
  );
  const thumbnail = thumbCanvas.toDataURL('image/png', 0.6);

  return {
    dominantColors,
    avgColor: avgHex,
    avgLum,
    bgColor,
    fgColor,
    estimatedRadius,
    thumbnail,
    width: Math.round(w),
    height: Math.round(h),
    aspectRatio: Math.round((w / h) * 100) / 100,
    inferredSize:
      w * h < 1500
        ? 'xs'
        : w * h < 4000
          ? 'sm'
          : w * h < 10000
            ? 'md'
            : w * h < 25000
              ? 'lg'
              : 'xl',
    inferredVariant: null,
  };
}

/**
 * Crop annotation region from canvas and convert to base64 PNG
 * @param {HTMLElement} canvas - Canvas element
 * @param {number} x - Region X coordinate
 * @param {number} y - Region Y coordinate
 * @param {number} w - Region width
 * @param {number} h - Region height
 * @returns {string} Base64-encoded PNG (without data URL prefix)
 */
export function cropAnnotationToBase64(canvas, x, y, w, h) {
  const crop = document.createElement('canvas');
  crop.width = Math.round(w);
  crop.height = Math.round(h);
  const ctx = crop.getContext('2d');
  ctx.drawImage(
    canvas,
    Math.round(x),
    Math.round(y),
    Math.round(w),
    Math.round(h),
    0,
    0,
    crop.width,
    crop.height
  );
  return crop.toDataURL('image/png').split(',')[1]; // raw base64
}

/**
 * Enhanced local analysis fallback (when no AI available)
 * Uses pixel data heuristics to estimate component properties
 * @param {Object} annotation - Annotation object with visual data
 * @returns {Object} Annotation with aiCSS property added
 */
export function enhancedLocalAnalysis(a) {
  const v = a.visual;
  if (!v) return a;

  const bgIsLight = isLight(v.bgColor);
  const hasBorder =
    v.dominantColors.length >= 2 &&
    v.dominantColors[1].ratio > 5 &&
    v.dominantColors[1].ratio < 20;

  // Determine variant from visual cues
  let variant = 'filled';
  if (v.avgLum > 220) variant = 'ghost';
  else if (v.avgLum > 180 && hasBorder) variant = 'outline';
  else if (v.avgLum > 160) variant = 'soft';

  const r = v.estimatedRadius;
  const sizeMap = {
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  };
  const padMap = {
    xs: '4px 10px',
    sm: '6px 14px',
    md: '8px 18px',
    lg: '12px 24px',
    xl: '14px 32px',
  };

  a.aiCSS = {
    elementType: a.typeId,
    css: {
      backgroundColor:
        variant === 'ghost' || variant === 'outline' ? 'transparent' : v.bgColor,
      color:
        variant === 'ghost' || variant === 'outline'
          ? v.fgColor || v.bgColor
          : bgIsLight
            ? '#333333'
            : '#ffffff',
      borderRadius: r + 'px',
      border:
        variant === 'outline'
          ? `2px solid ${v.fgColor || v.bgColor}`
          : 'none',
      padding: padMap[v.inferredSize] || '8px 18px',
      fontSize: sizeMap[v.inferredSize] || '14px',
      fontWeight: '600',
      boxShadow:
        variant === 'filled'
          ? `0 4px 12px ${ha(v.bgColor, 0.25)}`
          : 'none',
    },
    variant,
    label: '',
    description: `${variant} ${a.label}, bg:${v.bgColor}, ${v.width}×${v.height}`,
  };
  return a;
}

/**
 * Build prompt for comparing multiple annotations of the same type
 * Uses grouped axis hints to guide AI toward correct relationship classification
 * @param {string} typeId - Component type ID
 * @param {string} label - Component label
 * @param {number} annotationCount - Number of annotations being compared
 * @param {Object} [COMP_META] - Optional component metadata
 * @param {Object} [COMP_SKELETON] - Optional component skeleton config
 * @param {Object} [VARIATION_AXIS] - Variation axis definitions
 * @returns {string} Grouped comparison prompt
 */
export function buildGroupedComparisonPrompt(
  typeId,
  label,
  annotationCount,
  COMP_META,
  COMP_SKELETON,
  VARIATION_AXIS
) {
  const meta = COMP_META?.[typeId];
  const cfg = COMP_SKELETON?.[typeId];
  const va = VARIATION_AXIS?.[typeId] || { axis: 'variant', weight: 0.5, fallback: null, hint: '' };

  const axisExplanation = {
    variant:
      'visual style variants (e.g., filled vs outline vs ghost — same component, different visual treatment)',
    state:
      'interactive states (e.g., default vs focus vs error vs disabled — same component, different user interaction states)',
    semantic:
      'semantic/meaning variants (e.g., success vs warning vs danger vs info — same structure, different semantic purpose)',
    layout:
      'layout variants (e.g., centered vs left-aligned vs split — same content type, different spatial arrangement)',
  };

  const variantList = meta ? `Known variants: [${meta.variants.join(', ')}].` : '';
  const stateList = meta ? `Known states: [${meta.states.join(', ')}].` : '';

  return `You are a UI design analyst. You are shown ${annotationCount} cropped screenshots of "${label}" components (type: ${typeId}), arranged LEFT to RIGHT in a single composite image.
${meta ? `\nThis component is: "${meta.description}". ${variantList} ${stateList}` : ''}

Your primary task: DETERMINE THE RELATIONSHIP between these ${annotationCount} screenshots.

For this component type, the most likely axis of variation is: **${va.axis}** (${axisExplanation[va.axis]}).
${va.hint ? `\nHint: ${va.hint}` : ''}
${va.fallback ? `\nSecondary axis to consider: **${va.fallback}** (${axisExplanation[va.fallback]}).` : ''}

Return ONLY valid JSON with this structure:
{
  "relationship": "variants" | "states" | "semantic" | "independent",
  "axis": "${va.axis}" | "${va.fallback || 'variant'}" | "mixed",
  "reasoning": "one sentence explaining WHY you classified them this way",
  "confidence": 0.0-1.0,
  "items": [
    {
      "index": 0,
      "role": "descriptive name (e.g., filled-primary, outline, default-state, error-state, success-variant, etc.)",
      "description": "brief factual description of this specific screenshot",
      ${cfg ? `${cfg.promptSlots.slice(1)}` : `"bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "border":"none or value", "padding":"Npx Npx", "fontSize":"Npx" }`}
  ]
}

Classification rules:
- "variants": Different visual styles of the SAME component (e.g., filled button vs outline button). Shape/structure is similar, styling differs.
- "states": Different interactive states of ONE component (e.g., input default vs focus vs error). Same design, different interaction feedback.
- "semantic": Same structure, different meaning/color (e.g., success alert vs danger alert). Structure identical, color conveys meaning.
- "independent": Fundamentally different designs that happen to be the same component type. Structure, layout, or purpose is clearly different.

Strict rules:
- Analyze LEFT to RIGHT, index 0 = leftmost
- Extract ONLY what is directly visible
- Do NOT invent colors or styles not shown
- Use #hex for colors, Npx for dimensions
- The "role" field should use standard naming: filled, outline, ghost, soft, default, hover, focus, error, disabled, success, warning, danger, info, etc.
Return ONLY valid JSON, no markdown, no code fences.`;
}

/**
 * Composite multiple annotation crops into a single side-by-side image
 * Returns base64 PNG of the combined image
 * @param {HTMLElement} canvas - Canvas element
 * @param {Array} annotations - Array of annotation objects with x, y, w, h properties
 * @returns {string} Base64-encoded composite PNG (without data URL prefix)
 */
export function compositeAnnotationCrops(canvas, annotations) {
  const padding = 8;
  const labelHeight = 20;
  const crops = annotations.map((a, i) => {
    const w = Math.round(a.w),
      h = Math.round(a.h);
    const crop = document.createElement('canvas');
    crop.width = w;
    crop.height = h;
    const ctx = crop.getContext('2d');
    ctx.drawImage(
      canvas,
      Math.round(a.x),
      Math.round(a.y),
      w,
      h,
      0,
      0,
      w,
      h
    );
    return { canvas: crop, w, h, label: `#${i + 1}`, annotation: a };
  });

  // Calculate composite dimensions
  const maxH = Math.max(...crops.map((c) => c.h));
  const totalW = crops.reduce((sum, c) => sum + c.w + padding, 0) - padding;
  const compositeH = maxH + labelHeight + padding;

  const comp = document.createElement('canvas');
  comp.width = totalW;
  comp.height = compositeH;
  const ctx = comp.getContext('2d');

  // White background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, totalW, compositeH);

  // Draw each crop with label
  let offsetX = 0;
  crops.forEach((c, i) => {
    // Label
    ctx.fillStyle = '#666';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.label, offsetX + c.w / 2, 14);
    // Crop image
    ctx.drawImage(c.canvas, offsetX, labelHeight);
    // Separator line
    if (i < crops.length - 1) {
      ctx.strokeStyle = '#ccc';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(offsetX + c.w + padding / 2, 0);
      ctx.lineTo(offsetX + c.w + padding / 2, compositeH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    offsetX += c.w + padding;
  });

  return comp.toDataURL('image/png').split(',')[1]; // raw base64
}

/**
 * Local heuristic for group relationships when AI is unavailable
 * Infers relationship type from visual similarity
 * @param {Array} groupAnnos - Annotations of same type
 * @param {string} typeId - Component type ID
 * @param {Object} VARIATION_AXIS - Variation axis definitions
 */
function localGroupRelationship(groupAnnos, typeId, VARIATION_AXIS) {
  const va = VARIATION_AXIS?.[typeId] || { axis: 'variant', weight: 0.5 };

  // Compare visual similarity across the group
  const bgColors = groupAnnos.map((a) => a.visual?.bgColor || '#888');
  const uniqueBgs = [...new Set(bgColors)];
  const allSameBg = uniqueBgs.length === 1;

  // Heuristic: if all backgrounds are similar → likely states, if different → likely variants/semantic
  let relationship, axis;
  if (va.axis === 'state' && allSameBg) {
    relationship = 'states';
    axis = 'state';
  } else if (va.axis === 'semantic' && !allSameBg) {
    relationship = 'semantic';
    axis = 'semantic';
  } else {
    relationship = allSameBg ? 'states' : 'variants';
    axis = allSameBg ? 'state' : 'variant';
  }

  const variantNames = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary'];
  const stateNames = ['default', 'active', 'hover', 'focus', 'disabled'];
  const semanticNames = ['success', 'info', 'warning', 'danger', 'neutral'];

  groupAnnos.forEach((a, i) => {
    const namePool =
      axis === 'state'
        ? stateNames
        : axis === 'semantic'
          ? semanticNames
          : variantNames;
    const role = namePool[i] || `${axis}-${i + 1}`;
    a._relationship = {
      groupRelationship: relationship,
      axis,
      role,
      confidence: 0.4,
      reasoning: 'local heuristic',
    };
    if (a.visual) a.visual.inferredVariant = role;
  });
}

/**
 * Fallback: analyze each annotation individually when grouped analysis fails
 * @param {Array} groupAnnos - Annotations of same type
 * @param {HTMLElement} canvas - Canvas element
 * @param {Array} analysisLog - Analysis log array
 * @param {Function} onProgress - Progress callback
 * @param {number} startIdx - Starting progress index
 * @param {number} total - Total annotations
 * @param {Function} callAI - Function to call AI
 * @param {Object} getDevKeys - Function to get dev keys
 * @param {Object} getStoredEmail - Function to get stored email
 * @returns {Promise<void>}
 */
async function fallbackIndividualAnalysis(
  groupAnnos,
  canvas,
  analysisLog,
  onProgress,
  startIdx,
  total,
  callAI,
  getDevKeys,
  getStoredEmail,
  onResult,
  getSessionToken
) {
  const apiBase = window.PIC2UI_API_BASE || '';
  const dev = getDevKeys();
  const sessionToken = getSessionToken?.() || '';
  for (let i = 0; i < groupAnnos.length; i++) {
    const a = groupAnnos[i];
    if (onProgress) onProgress(startIdx + i, total, a.label, a.typeId);
    try {
      const base64 = cropAnnotationToBase64(canvas, a.x, a.y, a.w, a.h);
      const prompt = buildComponentPrompt(a.typeId, a.label);
      let aiResult,
        usedProvider = 'worker';
      if (apiBase) {
        const emailToSend = getStoredEmail();
        devLog(`[img2ui] 📤 Worker call (individual): email="${emailToSend}", provider="${window.selectedProvider}", annotation="${a.label}"`)
        const resp = await fetch(`${apiBase}/api/analyze-component`, {
          method: 'POST',
          headers: workerHeaders(),
          body: JSON.stringify({
            image_base64: base64,
            prompt,
            componentType: a.typeId,
            email: emailToSend,
            provider: window.selectedProvider,
            session_token: sessionToken,
          }),
        });
        devLog(`[img2ui] 📥 Worker response (individual): status=${resp.status}`)
        if (resp.ok) {
          const data = await resp.json();
          devLog('[img2ui] ✅ Worker parsed result:', { provider: data.provider, hasResult: !!data.parsed })
          devLog('[img2ui] 🔍 Raw AI result (individual):', JSON.stringify(data.parsed || data.result, null, 2)?.slice(0, 2000))
          aiResult =
            data.parsed ||
            tryParseJSON(data.result?.content?.[0]?.text) ||
            tryParseJSON(data.result?.choices?.[0]?.message?.content);
          usedProvider = data.provider || usedProvider;
        } else {
          const errBody = await resp.text()
          devError('[img2ui] ❌ Worker error (individual):', errBody)
        }
      } else if (dev.anthropic || dev.openai || dev.gemini) {
        const result = await directAPICall(base64, prompt, 1024, window.selectedProvider, dev);
        aiResult = result.parsed;
      }
      if (aiResult) {
        a.aiCSS = normalizeAIResult(aiResult);
        const entry = { label: a.label, typeId: a.typeId, method: 'ai', provider: usedProvider };
        analysisLog.push(entry);
        if (onResult) onResult(entry);
      } else {
        enhancedLocalAnalysis(a);
        const entry = { label: a.label, typeId: a.typeId, method: 'local', reason: 'AI no JSON' };
        analysisLog.push(entry);
        if (onResult) onResult(entry);
      }
    } catch (e) {
      enhancedLocalAnalysis(a);
      const entry = { label: a.label, typeId: a.typeId, method: 'local', reason: e.message };
      analysisLog.push(entry);
      if (onResult) onResult(entry);
    }
  }
  // Apply local relationship inference after individual analysis
  localGroupRelationship(groupAnnos, groupAnnos[0]?.typeId, window.VARIATION_AXIS);
}

/**
 * Analyze all annotations with AI (or local fallback)
 * Groups annotations by type, uses composite images for multiple items,
 * and applies gradient fallback: grouped AI → individual AI → local heuristic
 * @param {Object} context - Context object with canvas, annotations, helpers
 * @param {HTMLElement} context.canvas - Canvas element
 * @param {Array} context.annotations - Annotation objects
 * @param {Function} context.onProgress - Progress callback
 * @param {Function} context.getDevKeys - Function to get dev keys
 * @param {Function} context.getStoredEmail - Function to get stored email
 * @param {Object} context.COMP_META - Component metadata
 * @param {Object} context.COMP_SKELETON - Component skeleton config
 * @param {Object} context.VARIATION_AXIS - Variation axis definitions
 * @returns {Promise<void>}
 */
export async function analyzeAnnotationsWithAI(context) {
  const {
    canvas,
    annotations,
    onProgress,
    onResult,
    getDevKeys,
    getStoredEmail,
    getSessionToken,
    COMP_META,
    COMP_SKELETON,
    VARIATION_AXIS,
  } = context;

  if (!canvas || !annotations || !annotations.length) return;

  const annosWithImages = annotations.filter((a) => a.visual);
  if (!annosWithImages.length) return;

  const apiBase = window.PIC2UI_API_BASE || '';
  const email = getStoredEmail?.() || '';
  const sessionToken = getSessionToken?.() || '';
  const dev = getDevKeys?.() || {};
  const hasDirectKey = dev.anthropic || dev.openai || dev.gemini || dev.openrouter;
  const analysisLog = [];

  devLog(`[img2ui] 📧 Grouped analysis — email="${email}", apiBase="${apiBase || '(none)'}"`)

  // Helper: send image + prompt to AI
  async function callAI(base64, prompt, maxTokens, compType) {
    let aiResult,
      usedProvider = window.selectedProvider || 'worker';
    if (apiBase) {
      devLog(`[img2ui] 📤 Worker call (grouped): email="${email}", provider="${window.selectedProvider}"`)
      const resp = await fetch(`${apiBase}/api/analyze-component`, {
        method: 'POST',
        headers: workerHeaders(),
        body: JSON.stringify({
          image_base64: base64,
          prompt,
          componentType: compType,
          email,
          provider: window.selectedProvider,
          session_token: sessionToken,
        }),
      });
      devLog(`[img2ui] 📥 Worker response (grouped): status=${resp.status}`)
      if (!resp.ok) {
        const errBody = await resp.text()
        devError('[img2ui] ❌ Worker error (grouped):', errBody)
        throw new Error(`Worker API error ${resp.status}`);
      }
      const data = await resp.json();
      devLog('[img2ui] 🔍 Raw AI result (grouped):', JSON.stringify(data.parsed || data.result, null, 2)?.slice(0, 2000))
      aiResult =
        data.parsed ||
        tryParseJSON(data.result?.content?.[0]?.text) ||
        tryParseJSON(data.result?.choices?.[0]?.message?.content);
      usedProvider = data.provider || usedProvider;
    } else if (hasDirectKey) {
      const result = await directAPICall(
        base64,
        prompt,
        maxTokens,
        window.selectedProvider,
        dev
      );
      aiResult = result.parsed;
    }
    return { aiResult, usedProvider };
  }

  // Step 1: Group annotations by typeId
  const groups = {};
  for (const a of annosWithImages) {
    if (!groups[a.typeId]) groups[a.typeId] = [];
    groups[a.typeId].push(a);
  }

  let progressIdx = 0;
  const totalAnnotations = annosWithImages.length;

  // Step 2: Process each group — always individual analysis per annotation
  for (const [typeId, groupAnnos] of Object.entries(groups)) {
    for (const a of groupAnnos) {
      if (onProgress) onProgress(progressIdx, totalAnnotations, a.label, a.typeId);
      progressIdx++;

      if (!apiBase && !hasDirectKey) {
        const entry = { label: a.label, typeId, method: 'local', reason: 'No API key' };
        analysisLog.push(entry);
        if (onResult) onResult(entry);
        enhancedLocalAnalysis(a);
        continue;
      }
      try {
        const base64 = cropAnnotationToBase64(canvas, a.x, a.y, a.w, a.h);
        const prompt = buildComponentPrompt(typeId, a.label, COMP_META, COMP_SKELETON);
        const { aiResult, usedProvider } = await callAI(base64, prompt, 1024, typeId);
        if (aiResult) {
          a.aiCSS = normalizeAIResult(aiResult);
          a._relationship = {
            axis: 'single',
            role: aiResult.variant || 'primary',
            confidence: aiResult.confidence || 0.7,
          };
          const entry = { label: a.label, typeId, method: 'ai', provider: usedProvider, role: aiResult.variant };
          analysisLog.push(entry);
          if (onResult) onResult(entry);
        } else {
          enhancedLocalAnalysis(a);
          const entry = { label: a.label, typeId, method: 'local', reason: 'AI returned no JSON' };
          analysisLog.push(entry);
          if (onResult) onResult(entry);
        }
      } catch (e) {
        if (__DEV__) console.warn('AI analysis error:', e);
        enhancedLocalAnalysis(a);
        const entry = { label: a.label, typeId, method: 'local', reason: e.message };
        analysisLog.push(entry);
        if (onResult) onResult(entry);
      }
    }

    // Local relationship inference for multiple annotations of same type
    if (groupAnnos.length > 1) {
      localGroupRelationship(groupAnnos, typeId, VARIATION_AXIS);
    }
  }

  window._analysisLog = analysisLog;
}

/* ═══════════════════════════════════════════════
 * normalizeAIResult — unify CSS key names from AI responses
 * Ensures consistent key naming regardless of which model answered.
 * ═══════════════════════════════════════════════ */

const CSS_KEY_MAP = {
  bgcolor: 'backgroundColor',
  bgColor: 'backgroundColor',
  'bg-color': 'backgroundColor',
  background: 'backgroundColor',
  'background-color': 'backgroundColor',
  textcolor: 'color',
  textColor: 'color',
  'text-color': 'color',
  foregroundColor: 'color',
  fgColor: 'color',
  borderradius: 'borderRadius',
  'border-radius': 'borderRadius',
  radius: 'borderRadius',
  fontsize: 'fontSize',
  'font-size': 'fontSize',
  fontweight: 'fontWeight',
  'font-weight': 'fontWeight',
  boxshadow: 'boxShadow',
  'box-shadow': 'boxShadow',
  shadow: 'boxShadow',
};

/**
 * Normalize AI-returned CSS result into consistent key names
 * @param {Object} raw - Raw AI CSS result
 * @returns {Object} Normalized result with consistent keys
 */
export function normalizeAIResult(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined || v === '') continue;

    // Flatten nested `css` object
    if (k === 'css' && typeof v === 'object') {
      const nested = normalizeAIResult(v);
      Object.assign(out, nested);
      continue;
    }

    // Map known aliases
    const normalized = CSS_KEY_MAP[k] || CSS_KEY_MAP[k.toLowerCase()] || k;

    // Validate hex colors
    if (['backgroundColor', 'color', 'borderColor'].includes(normalized)) {
      out[normalized] = v;
      // Also keep skeleton-friendly aliases so compSkeleton render() can find them
      if (normalized === 'backgroundColor') out.bgColor = v;
      if (normalized === 'color') out.textColor = v;
      continue;
    }

    // Normalize dimension values: "16" → "16px"
    if (['borderRadius', 'fontSize', 'padding', 'margin', 'gap'].includes(normalized)) {
      if (typeof v === 'number') {
        out[normalized] = v + 'px';
      } else if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) {
        out[normalized] = v.trim() + 'px';
      } else {
        out[normalized] = v;
      }
      continue;
    }

    // Clamp confidence to 0-1
    if (normalized === 'confidence') {
      out[normalized] = Math.max(0, Math.min(1, Number(v) || 0));
      continue;
    }

    out[normalized] = v;
  }

  return out;
}

/* ═══════════════════════════════════════════════
 * analyzeHolisticDesign — full-image pass for global style signals
 * Sends the entire image to AI for:
 *  1. Style profile (rounded vs sharp, dense vs airy, etc.)
 *  2. Detected component types (which of the 25 are visible)
 *  3. Semantic token validation hints
 * Does NOT rewrite component schemas — only augments confidence & metadata.
 * ═══════════════════════════════════════════════ */

/**
 * Build the holistic analysis prompt
 * @param {string[]} knownComponentIds - All 25 component type IDs
 * @returns {string} Prompt string
 */
function buildHolisticPrompt(knownComponentIds) {
  return `You are a UI design analyst. Analyze the FULL screenshot of a web interface.

Your task: extract GLOBAL design characteristics. Do NOT invent things you cannot see.

Return ONLY valid JSON with this exact schema:
{
  "styleProfile": {
    "borderStyle": "rounded" | "sharp" | "mixed",
    "density": "compact" | "normal" | "spacious",
    "mood": "corporate" | "playful" | "minimal" | "bold" | "elegant",
    "elevation": "flat" | "subtle-shadow" | "heavy-shadow",
    "colorfulness": "monochrome" | "muted" | "colorful" | "vibrant"
  },
  "detectedComponents": ["navbar", "hero", ...],
  "globalHints": {
    "estimatedRadius": "none" | "sm" | "md" | "lg" | "xl" | "full",
    "primaryUsage": "buttons and navigation" | "headers only" | "throughout" | "accent only",
    "textContrast": "high" | "medium" | "low",
    "layoutStyle": "single-column" | "multi-column" | "dashboard" | "landing"
  },
  "confidence": 0.0-1.0
}

IMPORTANT RULES:
- "detectedComponents" must ONLY contain IDs from this list: [${knownComponentIds.join(', ')}]
- Only list components you can CLEARLY identify in the image
- If you cannot determine a field, use the most neutral/conservative value
- Do NOT guess brand names or specific frameworks
- confidence: 0.8+ if image is a clear UI screenshot, 0.5-0.8 for partial or ambiguous, <0.5 for non-UI
Return ONLY valid JSON, no markdown, no code fences.`;
}

/**
 * Run holistic design analysis on the full image
 * @param {Object} context - Same context shape as analyzeAnnotationsWithAI
 * @param {string} context.imageBase64 - Full image as base64
 * @param {Function} context.getDevKeys - Dev key getter
 * @param {string[]} context.knownComponentIds - All 25 component IDs
 * @param {Function} [context.onResult] - Callback for log entries
 * @returns {Promise<Object|null>} Holistic analysis result or null
 */
export async function analyzeHolisticDesign(context) {
  const {
    imageBase64,
    getDevKeys,
    getStoredEmail,
    getSessionToken,
    knownComponentIds,
    onResult,
  } = context;

  if (!imageBase64) return null;

  const dev = getDevKeys?.() || {};
  const apiBase = window.PIC2UI_API_BASE || '';
  const hasDirectKey = dev.anthropic || dev.openai || dev.gemini || dev.openrouter;

  if (!apiBase && !hasDirectKey) {
    // No AI available — return conservative defaults
    const entry = { label: 'Holistic Analysis', typeId: '_holistic', method: 'local', reason: 'No API key' };
    if (onResult) onResult(entry);
    return getDefaultHolisticResult();
  }

  const prompt = buildHolisticPrompt(knownComponentIds);

  try {
    let aiResult, usedProvider = window.selectedProvider || 'worker';

    if (apiBase) {
      devLog(`[img2ui] 📤 Worker call (holistic): apiBase="${apiBase}", provider="${window.selectedProvider}"`)
      const resp = await fetch(`${apiBase}/api/analyze-component`, {
        method: 'POST',
        headers: workerHeaders(),
        body: JSON.stringify({
          image_base64: imageBase64,
          prompt,
          componentType: '_holistic',
          email: getStoredEmail?.() || '',
          provider: window.selectedProvider,
          session_token: getSessionToken?.() || '',
        }),
      });
      devLog(`[img2ui] 📥 Worker response (holistic): status=${resp.status}`)
      if (resp.ok) {
        const data = await resp.json();
        devLog('[img2ui] ✅ Holistic result:', { provider: data.provider, hasResult: !!data.parsed })
        devLog('[img2ui] 🔍 Raw AI result (holistic):', JSON.stringify(data.parsed || data.result, null, 2)?.slice(0, 2000))
        aiResult =
          data.parsed ||
          tryParseJSON(data.result?.content?.[0]?.text) ||
          tryParseJSON(data.result?.choices?.[0]?.message?.content);
        usedProvider = data.provider || usedProvider;
      }
    } else if (hasDirectKey) {
      const result = await directAPICall(imageBase64, prompt, 1024, window.selectedProvider, dev);
      aiResult = result.parsed;
    }

    if (aiResult) {
      const entry = { label: 'Holistic Analysis', typeId: '_holistic', method: 'ai', provider: usedProvider };
      if (onResult) onResult(entry);
      return normalizeHolisticResult(aiResult, knownComponentIds);
    } else {
      const entry = { label: 'Holistic Analysis', typeId: '_holistic', method: 'local', reason: 'AI no JSON' };
      if (onResult) onResult(entry);
      return getDefaultHolisticResult();
    }
  } catch (e) {
    console.warn('Holistic analysis error:', e);
    const entry = { label: 'Holistic Analysis', typeId: '_holistic', method: 'local', reason: e.message };
    if (onResult) onResult(entry);
    return getDefaultHolisticResult();
  }
}

/**
 * Conservative default when AI is unavailable
 */
function getDefaultHolisticResult() {
  return {
    styleProfile: {
      borderStyle: 'rounded',
      density: 'normal',
      mood: 'corporate',
      elevation: 'subtle-shadow',
      colorfulness: 'muted',
    },
    detectedComponents: [],
    globalHints: {
      estimatedRadius: 'md',
      primaryUsage: 'throughout',
      textContrast: 'high',
      layoutStyle: 'single-column',
    },
    confidence: 0.2,
  };
}

/**
 * Validate and normalize holistic result — strip any hallucinated component IDs
 */
function normalizeHolisticResult(raw, knownIds) {
  const validStyles = ['rounded', 'sharp', 'mixed'];
  const validDensity = ['compact', 'normal', 'spacious'];
  const validMood = ['corporate', 'playful', 'minimal', 'bold', 'elegant'];
  const validElevation = ['flat', 'subtle-shadow', 'heavy-shadow'];
  const validColorfulness = ['monochrome', 'muted', 'colorful', 'vibrant'];
  const validRadius = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
  const validLayout = ['single-column', 'multi-column', 'dashboard', 'landing'];

  const sp = raw.styleProfile || {};
  const gh = raw.globalHints || {};
  const knownSet = new Set(knownIds);

  return {
    styleProfile: {
      borderStyle: validStyles.includes(sp.borderStyle) ? sp.borderStyle : 'rounded',
      density: validDensity.includes(sp.density) ? sp.density : 'normal',
      mood: validMood.includes(sp.mood) ? sp.mood : 'corporate',
      elevation: validElevation.includes(sp.elevation) ? sp.elevation : 'subtle-shadow',
      colorfulness: validColorfulness.includes(sp.colorfulness) ? sp.colorfulness : 'muted',
    },
    detectedComponents: (raw.detectedComponents || []).filter(id => knownSet.has(id)),
    globalHints: {
      estimatedRadius: validRadius.includes(gh.estimatedRadius) ? gh.estimatedRadius : 'md',
      primaryUsage: gh.primaryUsage || 'throughout',
      textContrast: ['high', 'medium', 'low'].includes(gh.textContrast) ? gh.textContrast : 'high',
      layoutStyle: validLayout.includes(gh.layoutStyle) ? gh.layoutStyle : 'single-column',
    },
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
  };
}
