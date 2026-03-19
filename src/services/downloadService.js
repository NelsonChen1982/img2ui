/**
 * Download service
 * Generate and export design system artifacts (JSON, SKILL.md, SKILL ZIP, DESIGN.md, HTML)
 */

import { buildSemanticTokens, buildDS } from './dsBuilder.js';
import { isLight, contrastRatio, relativeLuminance, hexToHsl } from './colorUtils.js';

/**
 * Derive a descriptive natural-language color name from a hex value using HSL analysis.
 * Returns a string like "Vibrant Sky Blue" or "Soft Warm Gray".
 * @param {string} hex - Hex color (#RRGGBB)
 * @returns {string} Descriptive color name
 */
function describeColor(hex) {
  if (!hex || !hex.startsWith('#')) return hex;
  const { h, s, l } = hexToHsl(hex);

  // Near-neutral colors (saturation < 10%)
  if (s < 10) {
    if (l < 8) return 'Near-Black';
    if (l < 20) return 'Charcoal';
    if (l < 35) return 'Dark Gray';
    if (l < 50) return 'Medium Gray';
    if (l < 70) return 'Soft Gray';
    if (l < 88) return 'Light Gray';
    if (l < 96) return 'Off-White';
    return 'Pure White';
  }

  // Hue name
  const hueNames = [
    [15, 'Red'], [35, 'Orange'], [55, 'Yellow'], [75, 'Yellow-Green'],
    [150, 'Green'], [180, 'Teal'], [210, 'Cyan'], [250, 'Blue'],
    [270, 'Indigo'], [300, 'Purple'], [330, 'Pink'], [360, 'Red'],
  ];
  let hueName = 'Red';
  for (const [boundary, name] of hueNames) {
    if (h <= boundary) { hueName = name; break; }
  }

  // Intensity qualifier from saturation
  let intensity = '';
  if (s > 75) intensity = 'Vibrant';
  else if (s > 50) intensity = 'Rich';
  else if (s > 30) intensity = 'Muted';
  else intensity = 'Soft';

  // Depth qualifier from lightness
  let depth = '';
  if (l < 20) depth = 'Deep Dark';
  else if (l < 35) depth = 'Deep';
  else if (l < 50) depth = '';
  else if (l < 65) depth = '';
  else if (l < 80) depth = 'Light';
  else depth = 'Pale';

  return [intensity, depth, hueName].filter(Boolean).join(' ');
}

/**
 * Generate the complete JSON output for the design system
 * @param {Object} DS - Design system object
 * @param {Array} annotations - Array of annotation objects
 * @param {Object} COMP_META - Component metadata
 * @param {Object} extractedColors - Array of extracted colors
 * @param {string} [selectedCSSFramework] - CSS framework (tailwind, vanilla, cssvar)
 * @returns {Object} Complete JSON output
 */
export function getJSONOutput(
  DS,
  annotations,
  COMP_META,
  extractedColors,
  selectedCSSFramework,
  holisticResult,
  analysisLog
) {
  const { colors, allColors, typo, spacing, radius, shadows, isDark, colorRatios, fonts } =
    DS;
  const cssFramework = selectedCSSFramework || 'tailwind';

  // Build semantic tokens
  const semanticTokens = buildSemanticTokens(colors, isDark);

  // Holistic data (may be null if AI unavailable)
  const holistic = holisticResult || null;
  const detectedSet = new Set((holistic?.detectedComponents) || []);

  // Analysis log stats
  const logEntries = analysisLog || [];
  const aiCount = logEntries.filter(l => l.method === 'ai' || l.method === 'ai-grouped').length;

  // Build annotated component data
  const annotatedGroups = {};
  for (const a of annotations || []) {
    if (!annotatedGroups[a.typeId]) annotatedGroups[a.typeId] = [];
    annotatedGroups[a.typeId].push(a);
  }

  // Build components — only detected/annotated get full detail
  const ALL_IDS = Object.keys(COMP_META || {});
  const detected = {};
  const catalog = ALL_IDS.slice();
  let compConfidenceSum = 0;

  for (const tid of ALL_IDS) {
    const meta = COMP_META[tid];
    const hasAnnotation = !!annotatedGroups[tid];
    const hasAIStyles = hasAnnotation && annotatedGroups[tid].some(a => a.aiCSS);
    const detectedInImage = detectedSet.has(tid);

    // 4-level confidence
    let compConf;
    if (hasAIStyles) compConf = 0.9;
    else if (hasAnnotation || detectedInImage) compConf = 0.7;
    else compConf = 0.4;
    compConfidenceSum += compConf;

    // Only include detected components (confidence >= 0.7) with full detail
    if (compConf >= 0.7) {
      const comp = {
        description: meta.description || '',
        confidence: compConf,
      };
      if (hasAnnotation) {
        const items = annotatedGroups[tid];
        comp.annotationCount = items.length;
        comp.analyzedStyles = items.map((a) => {
          const obj = {};
          if (a.aiCSS) {
            const slots = { ...a.aiCSS };
            if (slots.css) {
              Object.assign(slots, slots.css);
              delete slots.css;
            }
            obj.aiAnalyzed = slots;
          }
          if (a.visual) {
            obj.pixelExtracted = {
              bgColor: a.visual.bgColor || null,
              fgColor: a.visual.fgColor || null,
              inferredSize: a.visual.inferredSize || null,
              estimatedRadius: a.visual.estimatedRadius || null,
            };
          }
          return obj;
        });
      }
      detected[tid] = comp;
    }
  }

  // Global confidence scores
  const hasColors = (allColors || []).length >= 3;
  const holisticConf = holistic?.confidence || 0;
  const avgCompConf = ALL_IDS.length > 0 ? compConfidenceSum / ALL_IDS.length : 0;
  const confidence = {
    tokens: hasColors ? 0.85 : 0.5,
    semanticTokens: hasColors ? (holisticConf > 0.5 ? 0.8 : 0.7) : 0.4,
    components: Math.round(avgCompConf * 100) / 100,
    holistic: Math.round(holisticConf * 100) / 100,
    overall: Math.round(
      ((hasColors ? 0.85 : 0.5) * 0.3 + avgCompConf * 0.5 + holisticConf * 0.2) * 100
    ) / 100,
  };

  return {
    meta: {
      name: DS.name || 'Custom Design System',
      generatedBy: 'img2ui',
      version: '0.2.0',
      date: new Date().toISOString().slice(0, 10),
      cssFramework,
    },
    mode: isDark ? 'dark' : 'light',
    tokens: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        surface: colors.surface,
        text: colors.text,
        border: colors.border,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
      },
      fonts: {
        heading: fonts?.heading || 'Inter',
        body: fonts?.body || 'Inter',
        headingStack: `'${fonts?.heading || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        bodyStack: `'${fonts?.body || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      },
      typography: typo,
      extractedPalette: (allColors || []).map((hex, i) => ({
        hex,
        ratio: Math.round((colorRatios?.[i] || 0) * 100) / 100,
      })),
      spacing,
      radius,
      shadows,
    },
    semanticTokens,
    styleProfile: holistic?.styleProfile || null,
    globalHints: holistic?.globalHints || null,
    components: {
      detected,
      catalog,
    },
    confidence,
    analysis: {
      aiAnalyzed: aiCount,
      totalAnnotations: (annotations || []).length,
      holisticAvailable: !!holistic,
    },
  };
}

/**
 * Copy JSON to clipboard (with fallback to new window)
 * @param {Object} jsonOutput - JSON output object
 * @returns {Promise<void>}
 */
export async function copyJSON(jsonOutput) {
  const str = JSON.stringify(jsonOutput, null, 2);
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch {
    // Fallback: open in new window
    const w = window.open('', '_blank');
    if (w) {
      w.document.write('<pre>' + str + '</pre>');
      w.document.close();
    }
    return false;
  }
}

/**
 * Helper to download file as blob
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 * @returns {void}
 */
function dl(content, filename, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  } catch (e) {
    // Fallback: open in new window
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(
        `<html><head><title>${filename}</title></head><body><pre style="white-space:pre-wrap;font-size:13px;font-family:monospace;padding:20px;">${content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre></body></html>`
      );
      w.document.close();
    }
  }
}

/**
 * Download design system as JSON
 * @param {Object} DS - Design system object
 * @param {Array} annotations - Annotations array
 * @param {Object} COMP_META - Component metadata
 * @param {Array} extractedColors - Extracted colors
 * @param {string} cssFramework - CSS framework selection
 * @returns {void}
 */
export function downloadJSON(
  DS,
  annotations,
  COMP_META,
  extractedColors,
  cssFramework
) {
  if (!DS?.colors) {
    alert('Complete pipeline first');
    return;
  }
  const out = getJSONOutput(
    DS,
    annotations,
    COMP_META,
    extractedColors,
    cssFramework
  );
  dl(JSON.stringify(out, null, 2), 'design-system.json', 'application/json');
}

/**
 * Generate gotchas from design system properties
 * @param {Object} DS - Design system
 * @param {Object} semanticTokens - Derived semantic tokens
 * @param {Object|null} holistic - Holistic AI analysis
 * @param {string} lang - Language
 * @returns {string[]}
 */
function generateGotchas(DS, semanticTokens, holistic, lang) {
  const { colors, isDark, radius, fonts, shadows } = DS;
  const g = [];
  const L = lang || 'en';

  // 1. Primary contrast on surface
  const priContrast = contrastRatio(colors.primary, colors.surface);
  if (priContrast < 4.5) {
    if (L === 'zh') g.push(`Primary (${colors.primary}) 在 surface (${colors.surface}) 上對比度僅 ${priContrast.toFixed(1)}:1 — 小字需使用更深的替代色或加粗`);
    else if (L === 'ja') g.push(`Primary (${colors.primary}) と surface (${colors.surface}) のコントラスト比 ${priContrast.toFixed(1)}:1 — 小文字には代替色か太字を使用`);
    else g.push(`Primary (${colors.primary}) on surface (${colors.surface}) has only ${priContrast.toFixed(1)}:1 contrast — use bolder weight or darker shade for small text`);
  }

  // 2. text.onAction contrast check
  if (isLight(colors.primary)) {
    if (L === 'zh') g.push(`Primary 色偏亮 — 按鈕文字必須用 text.onAction (${semanticTokens['text.onAction']})，不要用白色`);
    else if (L === 'ja') g.push(`Primary色が明るい — ボタンテキストは text.onAction (${semanticTokens['text.onAction']}) を使用、白色禁止`);
    else g.push(`Primary is light — button text MUST use text.onAction (${semanticTokens['text.onAction']}), not white`);
  }

  // 3. Border vs surface similarity
  const borderLum = relativeLuminance(colors.border);
  const surfaceLum = relativeLuminance(colors.surface);
  if (Math.abs(borderLum - surfaceLum) < 0.06) {
    if (L === 'zh') g.push(`Border (${colors.border}) 與 surface 非常接近 — 不要只靠邊框區隔，改用陰影或間距`);
    else if (L === 'ja') g.push(`Border (${colors.border}) と surface が近すぎる — 境界線だけで区切らず、影や間隔を使用`);
    else g.push(`Border (${colors.border}) is very close to surface — use shadows or spacing as primary dividers, not borders alone`);
  }

  // 4. Dark mode elevation direction
  if (isDark) {
    if (L === 'zh') g.push(`深色主題：elevated 表面要比 surface 更亮（不是更暗）。不要使用純黑 #000`);
    else if (L === 'ja') g.push(`ダークテーマ：elevated surfaceはsurfaceより明るくする。純黒 #000 禁止`);
    else g.push(`Dark theme: elevated surfaces must be LIGHTER than surface, not darker. Never use pure black #000`);
  }

  // 5. Non-default font reminder
  const headingFont = fonts?.heading || 'Inter';
  const bodyFont = fonts?.body || 'Inter';
  if (headingFont !== 'Inter' || bodyFont !== 'Inter') {
    const fontList = [...new Set([headingFont, bodyFont].filter(f => f !== 'Inter'))].join(' + ');
    if (L === 'zh') g.push(`使用 ${fontList} 字體 — 不要 fallback 到 Inter 或系統字體，必須載入 Google Fonts`);
    else if (L === 'ja') g.push(`${fontList} フォント使用 — Inter やシステムフォントにフォールバックしないこと。Google Fontsインポート必須`);
    else g.push(`Uses ${fontList} — do NOT fall back to Inter or system fonts. Google Fonts import required`);
  }

  // 6. Radius extremes
  const radiusMd = parseInt(radius.md);
  if (radiusMd >= 16) {
    if (L === 'zh') g.push(`大圓角設計 (md=${radius.md}) — 小元素如 badge、tag 也需可見圓角`);
    else if (L === 'ja') g.push(`大きな角丸 (md=${radius.md}) — badge、tagなどの小要素にも角丸を適用`);
    else g.push(`Large radius design (md=${radius.md}) — even small elements like badges and tags need visible rounding`);
  } else if (radiusMd <= 3) {
    if (L === 'zh') g.push(`銳角設計 (md=${radius.md}) — 幾何風格，避免過度圓角，只在 pill 按鈕用 full`);
    else if (L === 'ja') g.push(`シャープコーナー (md=${radius.md}) — 幾何学的デザイン。fullはpillボタンのみ`);
    else g.push(`Sharp corners (md=${radius.md}) — geometric style, avoid rounding except radius.full for pills`);
  }

  // 7. Flat design — minimize shadows
  if (holistic?.styleProfile?.elevation === 'flat') {
    if (L === 'zh') g.push(`扁平設計 — 盡量少用陰影，改用邊框和色彩變化來表達層次`);
    else if (L === 'ja') g.push(`フラットデザイン — 影を最小限に。境界線と色の変化で深度を表現`);
    else g.push(`Flat design — minimize shadows. Use borders and color changes for depth instead`);
  }

  // 8. Dense layout
  if (holistic?.styleProfile?.density === 'compact') {
    if (L === 'zh') g.push(`緊湊佈局 — 使用小間距（spacing 0-3），不要加額外 padding`);
    else if (L === 'ja') g.push(`コンパクトレイアウト — 小さなスペーシング（0-3）を使用。余分なpaddingを追加しない`);
    else g.push(`Compact layout — use smaller spacing values (indices 0-3). Don't add extra padding`);
  }

  // 9. Info === Accent
  if (colors.info === colors.accent) {
    if (L === 'zh') g.push(`Info 色 = Accent 色 (${colors.info}) — info alert 和裝飾元素共用同一顏色`);
    else if (L === 'ja') g.push(`Info色 = Accent色 (${colors.info}) — infoアラートと装飾要素が同色`);
    else g.push(`Info color equals accent (${colors.info}) — info alerts and decorative elements share the same color`);
  }

  return g;
}

/**
 * Generate Style DNA description from holistic AI analysis
 */
function generateStyleDNA(holistic, isDark, lang) {
  const L = lang || 'en';
  if (!holistic?.styleProfile) {
    if (L === 'zh') return isDark ? '深色主題設計系統。' : '亮色主題設計系統。';
    if (L === 'ja') return isDark ? 'ダークテーマのデザインシステム。' : 'ライトテーマのデザインシステム。';
    return isDark ? 'Dark theme design system.' : 'Light theme design system.';
  }
  const sp = holistic.styleProfile;
  const gh = holistic.globalHints || {};

  const moodMap = { corporate: 'professional/corporate', playful: 'playful/friendly', minimal: 'clean/minimal', bold: 'bold/impactful', elegant: 'refined/elegant' };
  const moodZh = { corporate: '專業/企業風', playful: '活潑/親切', minimal: '簡潔/極簡', bold: '大膽/衝擊', elegant: '精緻/優雅' };
  const moodJa = { corporate: 'プロフェッショナル', playful: '親しみやすい', minimal: 'ミニマル', bold: '大胆', elegant: 'エレガント' };

  const mood = L === 'zh' ? (moodZh[sp.mood] || sp.mood) : L === 'ja' ? (moodJa[sp.mood] || sp.mood) : (moodMap[sp.mood] || sp.mood);
  const shape = sp.borderStyle === 'rounded' ? (L === 'zh' ? '圓角' : L === 'ja' ? '丸みのある' : 'rounded') : (L === 'zh' ? '銳角' : L === 'ja' ? 'シャープ' : 'sharp');
  const depth = sp.elevation === 'flat' ? (L === 'zh' ? '扁平' : L === 'ja' ? 'フラット' : 'flat') : sp.elevation === 'heavy-shadow' ? (L === 'zh' ? '強陰影' : L === 'ja' ? '強い影' : 'heavy shadows') : (L === 'zh' ? '微陰影' : L === 'ja' ? '微妙な影' : 'subtle shadows');
  const density = sp.density === 'compact' ? (L === 'zh' ? '緊湊' : L === 'ja' ? 'コンパクト' : 'compact') : sp.density === 'spacious' ? (L === 'zh' ? '寬鬆' : L === 'ja' ? 'ゆったり' : 'spacious') : (L === 'zh' ? '適中' : L === 'ja' ? '標準的' : 'normal');

  if (L === 'zh') return `${mood}風格，${shape}造型，${density}密度，${depth}深度。${gh.layoutStyle ? `佈局：${gh.layoutStyle}。` : ''}`;
  if (L === 'ja') return `${mood}スタイル、${shape}フォルム、${density}密度、${depth}深度。${gh.layoutStyle ? `レイアウト：${gh.layoutStyle}。` : ''}`;
  return `${mood[0].toUpperCase() + mood.slice(1)} style with ${shape} shapes, ${density} density, and ${depth} for depth.${gh.layoutStyle ? ` Layout: ${gh.layoutStyle}.` : ''}`;
}

/**
 * Build tokens reference markdown (full tables)
 */
function buildTokensReference(DS, lang) {
  const { colors, isDark, typo, spacing, radius, shadows, fonts } = DS;
  const semanticTokens = buildSemanticTokens(colors, isDark);
  const headingFont = fonts?.heading || 'Inter';
  const bodyFont = fonts?.body || 'Inter';
  const L = lang || 'en';
  const lines = [];

  lines.push(`# Design Tokens Reference`);
  lines.push(``);

  // Colors
  lines.push(`## Colors`);
  lines.push(``);
  lines.push(`| Token | Hex | Usage |`);
  lines.push(`|-------|-----|-------|`);
  lines.push(`| primary | \`${colors.primary}\` | Main brand color, CTA buttons |`);
  lines.push(`| secondary | \`${colors.secondary}\` | Secondary actions |`);
  lines.push(`| accent | \`${colors.accent}\` | Highlights, decorative |`);
  lines.push(`| surface | \`${colors.surface}\` | Page/card backgrounds |`);
  lines.push(`| text | \`${colors.text}\` | Primary text |`);
  lines.push(`| border | \`${colors.border}\` | Borders, dividers |`);
  lines.push(`| success | \`${colors.success}\` | Success states |`);
  lines.push(`| warning | \`${colors.warning}\` | Warning states |`);
  lines.push(`| danger | \`${colors.danger}\` | Error states |`);
  lines.push(`| info | \`${colors.info}\` | Informational |`);
  lines.push(``);

  // Semantic tokens
  lines.push(`## Semantic Tokens`);
  lines.push(``);
  lines.push(`| Token | Value | Usage |`);
  lines.push(`|-------|-------|-------|`);
  for (const [k, v] of Object.entries(semanticTokens)) {
    lines.push(`| ${k} | \`${v}\` | |`);
  }
  lines.push(``);

  // Typography
  lines.push(`## Typography`);
  lines.push(``);
  lines.push(`| Level | Size | Weight | Line Height | Font |`);
  lines.push(`|-------|------|--------|-------------|------|`);
  (typo || []).forEach(t => {
    const isHead = ['Display', 'H1', 'H2'].includes(t.name);
    lines.push(`| ${t.name} | ${t.size} | ${t.weight} | ${t.lh} | ${isHead ? headingFont : bodyFont} |`);
  });
  lines.push(``);

  // Spacing
  lines.push(`## Spacing`);
  lines.push(``);
  const spacingLabels = ['Hairline', 'Icon gap', 'Field gap', 'Section pad', 'Card pad', 'Group gap', 'Section gap', 'Page margin'];
  (spacing || []).forEach((v, i) => {
    lines.push(`- ${i}: \`${v}px\` — ${spacingLabels[i] || ''}`);
  });
  lines.push(``);

  // Radius + Shadows
  lines.push(`## Radius`);
  lines.push(``);
  lines.push(`sm: ${radius.sm} · md: ${radius.md} · lg: ${radius.lg} · xl: ${radius.xl} · full: ${radius.full}`);
  lines.push(``);
  lines.push(`## Shadows`);
  lines.push(``);
  lines.push(`- sm: \`${shadows.sm}\``);
  lines.push(`- md: \`${shadows.md}\``);
  lines.push(`- lg: \`${shadows.lg}\``);
  lines.push(``);

  return lines.join('\n');
}

/**
 * Build CSS custom properties block
 */
function buildTokensCSS(DS) {
  const { colors, isDark, typo, spacing, radius, shadows, fonts } = DS;
  const semanticTokens = buildSemanticTokens(colors, isDark);
  const lines = [':root {'];
  lines.push(`  /* Colors */`);
  for (const [k, v] of Object.entries(colors)) {
    lines.push(`  --color-${k}: ${v};`);
  }
  lines.push(``);
  lines.push(`  /* Semantic */`);
  for (const [k, v] of Object.entries(semanticTokens)) {
    lines.push(`  --${k.replace(/\./g, '-')}: ${v};`);
  }
  lines.push(``);
  lines.push(`  /* Typography */`);
  lines.push(`  --font-heading: '${fonts?.heading || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`);
  lines.push(`  --font-body: '${fonts?.body || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`);
  lines.push(``);
  lines.push(`  /* Spacing */`);
  (spacing || []).forEach((v, i) => lines.push(`  --spacing-${i}: ${v}px;`));
  lines.push(``);
  lines.push(`  /* Radius */`);
  for (const [k, v] of Object.entries(radius)) {
    lines.push(`  --radius-${k}: ${v};`);
  }
  lines.push(``);
  lines.push(`  /* Shadows */`);
  for (const [k, v] of Object.entries(shadows)) {
    lines.push(`  --shadow-${k}: ${v};`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Build Tailwind config extension
 */
function buildTailwindConfigJS(DS) {
  const { colors, isDark, radius, shadows, spacing, fonts } = DS;
  const semanticTokens = buildSemanticTokens(colors, isDark);
  return `/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: '${colors.primary}',
        secondary: '${colors.secondary}',
        accent: '${colors.accent}',
        surface: '${colors.surface}',
        border: '${colors.border}',
        success: '${colors.success}',
        warning: '${colors.warning}',
        danger: '${colors.danger}',
        info: '${colors.info}',
      },
      textColor: {
        DEFAULT: '${colors.text}',
        secondary: '${semanticTokens['text.secondary']}',
        disabled: '${semanticTokens['text.disabled']}',
        inverse: '${semanticTokens['text.inverse']}',
        onAction: '${semanticTokens['text.onAction']}',
      },
      backgroundColor: {
        page: '${semanticTokens['bg.page']}',
        card: '${semanticTokens['bg.card']}',
        elevated: '${semanticTokens['bg.elevated']}',
        sunken: '${semanticTokens['bg.sunken']}',
        overlay: '${semanticTokens['bg.overlay']}',
      },
      fontFamily: {
        heading: ['${fonts?.heading || 'Inter'}', 'sans-serif'],
        body: ['${fonts?.body || 'Inter'}', 'sans-serif'],
      },
      borderRadius: {
        sm: '${radius.sm}',
        DEFAULT: '${radius.md}',
        lg: '${radius.lg}',
        xl: '${radius.xl}',
      },
      boxShadow: {
        sm: '${shadows.sm}',
        DEFAULT: '${shadows.md}',
        lg: '${shadows.lg}',
      },
      spacing: {
${(spacing || []).map((v, i) => `        '${i}': '${v}px',`).join('\n')}
      },
    },
  },
}`;
}

/**
 * Build font import HTML
 */
function buildFontImport(DS) {
  const fonts = DS.fonts || {};
  const families = [...new Set([fonts.heading || 'Inter', fonts.body || 'Inter'])];
  const url = `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join('&')}&display=swap`;
  return `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${url}" rel="stylesheet">`;
}

/**
 * Build components reference markdown (detected components only)
 */
function buildComponentsReference(annotations, COMP_META, lang) {
  const L = lang || 'en';
  const groups = {};
  for (const a of annotations || []) {
    if (!groups[a.typeId]) groups[a.typeId] = [];
    groups[a.typeId].push(a);
  }

  const lines = [];
  lines.push(`# Component Specifications`);
  lines.push(``);

  for (const tid of Object.keys(COMP_META || {})) {
    const meta = COMP_META[tid];
    const isAnnotated = groups[tid]?.length > 0;
    lines.push(`## ${tid.charAt(0).toUpperCase() + tid.slice(1)}${isAnnotated ? ' (annotated)' : ''}`);
    lines.push(`${meta.description}`);
    lines.push(``);
    if (meta.variants?.length) lines.push(`Variants: ${meta.variants.join(', ')}`);
    if (meta.sizes?.length) lines.push(`Sizes: ${meta.sizes.join(', ')}`);
    lines.push(``);

    if (isAnnotated) {
      const items = groups[tid];
      items.forEach((a, i) => {
        const label = a.aiCSS?.variant ? a.aiCSS.variant : `variant ${i + 1}`;
        lines.push(`### ${label}`);
        if (a.aiCSS) {
          const slots = { ...a.aiCSS };
          delete slots.elementType;
          delete slots.innerElements;
          if (slots.css) { Object.assign(slots, slots.css); delete slots.css; }
          lines.push('```json', JSON.stringify(slots, null, 2), '```');
        } else if (a.visual) {
          lines.push(`bg: ${a.visual.bgColor}, fg: ${a.visual.fgColor}, radius: ~${a.visual.estimatedRadius}px, size: ${a.visual.inferredSize}`);
        }
        lines.push(``);
      });
    }
  }
  return lines.join('\n');
}

/**
 * Generate all SKILL folder files
 * @returns {Object} Map of { filePath: content }
 */
export function generateSKILLFolder(DS, DS_other, annotations, lang, COMP_META, extractedColors, cssFramework, holisticResult, analysisLog) {
  const fw = cssFramework || 'tailwind';
  const files = {
    'SKILL.md': buildMainSKILL(DS, DS_other, annotations, lang, COMP_META, holisticResult, fw),
    'references/tokens.md': buildTokensReference(DS, lang),
    'references/tokens.css': buildTokensCSS(DS),
    'references/components.md': buildComponentsReference(annotations, COMP_META, lang),
    'assets/font-import.html': buildFontImport(DS),
  };
  if (fw === 'tailwind') {
    files['assets/tailwind.config.js'] = buildTailwindConfigJS(DS);
  }
  // Include JSON IR
  files['design-system.json'] = JSON.stringify(
    getJSONOutput(DS, annotations, COMP_META, extractedColors, fw, holisticResult, analysisLog),
    null, 2
  );
  return files;
}

/**
 * Download SKILL folder as ZIP
 */
export async function downloadSKILLZip(DS, DS_other, annotations, lang, COMP_META, extractedColors, cssFramework, holisticResult, analysisLog) {
  if (!DS?.colors) { alert('Complete pipeline first'); return; }
  const files = generateSKILLFolder(DS, DS_other, annotations, lang, COMP_META, extractedColors, cssFramework, holisticResult, analysisLog);
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'design-system-skill.zip';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

/**
 * Build the concise main SKILL.md (80-120 lines, high signal)
 */
function buildMainSKILL(DS, DS_other, annotations, lang, COMP_META, holisticResult, fw) {
  const { colors, isDark, typo, spacing, radius, shadows, fonts } = DS;
  const semanticTokens = buildSemanticTokens(colors, isDark);
  const holistic = holisticResult || null;
  const headingFont = fonts?.heading || 'Inter';
  const bodyFont = fonts?.body || 'Inter';
  const L = lang || 'en';
  const name = DS.name || 'Design System';
  const fwLabel = { tailwind: 'Tailwind CSS', vanilla: 'Vanilla CSS', cssvar: 'CSS Variables' }[fw] || 'Tailwind CSS';

  const lines = [];

  // Header with trigger description
  lines.push(`# ${name} — Design System Skill`);
  lines.push(``);
  if (L === 'zh') {
    lines.push(`> 用於建構 ${name} 的 UI 時載入此 skill。所有值皆從參考圖片分析而來 — 嚴格遵守。`);
  } else if (L === 'ja') {
    lines.push(`> ${name} の UI 構築時にこのスキルを使用。全ての値は参照画像から分析 — 厳密に遵守。`);
  } else {
    lines.push(`> Use when building UI for ${name}. All values analyzed from reference image — follow strictly.`);
  }
  lines.push(``);
  lines.push(`- **Mode:** ${isDark ? 'Dark' : 'Light'} · **Framework:** ${fwLabel} · **Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(``);

  // Tokens — compact format
  lines.push(`## Tokens`);
  lines.push(``);
  lines.push(`### Colors`);
  lines.push(``);
  lines.push(`| Token | Hex |`);
  lines.push(`|-------|-----|`);
  for (const k of ['primary', 'secondary', 'accent', 'surface', 'text', 'border', 'success', 'warning', 'danger', 'info']) {
    lines.push(`| ${k} | \`${colors[k]}\` |`);
  }
  lines.push(``);

  // Typography compact
  lines.push(`### Typography`);
  lines.push(``);
  lines.push(`Heading: \`${headingFont}\` · Body: \`${bodyFont}\``);
  lines.push(``);
  lines.push((typo || []).map(t => `${t.name} ${t.size}/${t.weight}`).join(' · '));
  lines.push(``);

  // Layout compact
  lines.push(`### Layout`);
  lines.push(``);
  lines.push(`Spacing: ${(spacing || []).map(v => v + 'px').join(' · ')}`);
  lines.push(`Radius: ${Object.entries(radius).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  lines.push(`Shadows: sm · md · lg`);
  lines.push(``);

  // Style DNA
  lines.push(`## Style DNA`);
  lines.push(``);
  lines.push(generateStyleDNA(holistic, isDark, L));
  lines.push(``);

  // Gotchas
  const gotchas = generateGotchas(DS, semanticTokens, holistic, L);
  if (gotchas.length > 0) {
    lines.push(`## ⚠ Gotchas`);
    lines.push(``);
    gotchas.forEach(g => lines.push(`- ${g}`));
    lines.push(``);
  }

  // Detected components (only annotated)
  const groups = {};
  for (const a of annotations || []) {
    if (!groups[a.typeId]) groups[a.typeId] = [];
    groups[a.typeId].push(a);
  }
  const annotatedTypes = Object.keys(groups);
  if (annotatedTypes.length > 0) {
    lines.push(`## Detected Components (${annotatedTypes.length} annotated)`);
    lines.push(``);
    for (const tid of annotatedTypes) {
      const items = groups[tid];
      lines.push(`### ${tid.charAt(0).toUpperCase() + tid.slice(1)} (${items.length})`);
      items.forEach((a, i) => {
        if (a.aiCSS) {
          const slots = { ...a.aiCSS };
          delete slots.elementType; delete slots.innerElements;
          if (slots.css) { Object.assign(slots, slots.css); delete slots.css; }
          const variant = slots.variant || `#${i + 1}`;
          delete slots.variant;
          const props = Object.entries(slots).map(([k, v]) => `${k}=${v}`).join(' ');
          lines.push(`- **${variant}:** ${props}`);
        } else if (a.visual) {
          lines.push(`- **#${i + 1}:** bg=${a.visual.bgColor} fg=${a.visual.fgColor} radius=~${a.visual.estimatedRadius}px size=${a.visual.inferredSize}`);
        }
      });
      lines.push(``);
    }
  }

  // References footer
  lines.push(`## References`);
  lines.push(``);
  if (L === 'zh') {
    lines.push(`- \`references/tokens.md\` — 完整 token 表格（含 semantic tokens）`);
    lines.push(`- \`references/tokens.css\` — 可直接複製的 CSS custom properties`);
    lines.push(`- \`references/components.md\` — 完整 25 元件規格`);
    if (fw === 'tailwind') lines.push(`- \`assets/tailwind.config.js\` — Tailwind 設定`);
    lines.push(`- \`assets/font-import.html\` — Google Fonts 載入`);
  } else if (L === 'ja') {
    lines.push(`- \`references/tokens.md\` — 完全なトークンテーブル`);
    lines.push(`- \`references/tokens.css\` — コピー可能な CSS custom properties`);
    lines.push(`- \`references/components.md\` — 全25コンポーネント仕様`);
    if (fw === 'tailwind') lines.push(`- \`assets/tailwind.config.js\` — Tailwind設定`);
    lines.push(`- \`assets/font-import.html\` — Google Fontsインポート`);
  } else {
    lines.push(`- \`references/tokens.md\` — Full token tables with semantic tokens`);
    lines.push(`- \`references/tokens.css\` — Copy-paste CSS custom properties`);
    lines.push(`- \`references/components.md\` — Full 25 component specifications`);
    if (fw === 'tailwind') lines.push(`- \`assets/tailwind.config.js\` — Tailwind config extension`);
    lines.push(`- \`assets/font-import.html\` — Google Fonts import`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(`*Generated by img2ui · v0.2 · ${new Date().toISOString().slice(0, 10)}*`);

  return lines.join('\n');
}

/**
 * Download design system as SKILL.md (single file, concise version)
 */
export function downloadSKILL(DS, annotations, lang, COMP_META, extractedColors, cssFramework, holisticResult) {
  if (!DS?.colors) { alert('Complete pipeline first'); return; }
  const fw = cssFramework || 'tailwind';
  const md = buildMainSKILL(DS, null, annotations, lang, COMP_META, holisticResult, fw);
  dl(md, 'SKILL.md', 'text/markdown');
}

/**
 * Build DESIGN.md in Google Stitch's semantic format.
 * Translates img2ui's precise tokens into natural-language design descriptions.
 * Output is always English (Stitch AI expects English natural language).
 * @param {Object} DS - Design system object
 * @param {Object|null} holisticResult - Holistic AI analysis
 * @param {string} [lang] - Language (reserved for future use; output remains English for Stitch compatibility)
 * @returns {string} DESIGN.md content
 */
function buildDesignMD(DS, holisticResult, lang) {
  const { colors, isDark, typo, spacing, radius, shadows, fonts } = DS;
  const holistic = holisticResult || null;
  const name = DS.name || 'Design System';
  const headingFont = fonts?.heading || 'Inter';
  const bodyFont = fonts?.body || 'Inter';
  const lines = [];

  // Project header
  lines.push(`# ${name}`);
  lines.push(``);
  lines.push(`> Generated by img2ui — all values extracted from reference image analysis.`);
  lines.push(`> Use this file as design context when generating UI screens in Google Stitch.`);
  lines.push(``);
  lines.push(`- **Mode:** ${isDark ? 'Dark' : 'Light'}`);
  lines.push(`- **Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(``);

  // 1. Visual Theme & Atmosphere
  lines.push(`## Visual Theme & Atmosphere`);
  lines.push(``);
  if (holistic?.styleProfile) {
    const sp = holistic.styleProfile;
    const gh = holistic.globalHints || {};
    const moodMap = { corporate: 'professional and corporate', playful: 'playful and approachable', minimal: 'clean and minimal', bold: 'bold and impactful', elegant: 'refined and elegant' };
    const mood = moodMap[sp.mood] || sp.mood || 'modern';
    const shape = sp.borderStyle === 'rounded' ? 'softly rounded shapes' : 'sharp, geometric shapes';
    const depth = sp.elevation === 'flat' ? 'Flat surfaces with no shadows' : sp.elevation === 'heavy-shadow' ? 'Pronounced shadows creating strong depth' : 'Whisper-soft diffused shadows for subtle layering';
    const density = sp.density === 'compact' ? 'Dense, information-rich layouts with tight spacing' : sp.density === 'spacious' ? 'Generous whitespace creating a gallery-like openness' : 'Balanced density with comfortable breathing room';
    lines.push(`The overall aesthetic is ${mood}, with ${shape}. ${isDark ? 'A dark, immersive atmosphere anchors the experience.' : 'A light, open atmosphere creates a welcoming feel.'} ${depth}. ${density}.${gh.layoutStyle ? ` Layout follows a ${gh.layoutStyle} approach.` : ''}`);
  } else {
    lines.push(`${isDark ? 'A dark, immersive interface with high-contrast accents against deep backgrounds.' : 'A light, clean interface with a welcoming and open feel.'} The design balances clarity with visual interest.`);
  }
  lines.push(``);

  // 2. Color Palette & Roles
  lines.push(`## Color Palette & Roles`);
  lines.push(``);
  const colorRoles = {
    primary: 'primary actions, buttons, links, and key interactive elements',
    secondary: 'secondary actions and supporting UI elements',
    accent: 'highlights, decorative elements, and visual interest',
    surface: 'page and card backgrounds',
    text: 'primary body text and headings',
    border: 'borders, dividers, and subtle separators',
    success: 'success states, confirmations, and positive indicators',
    warning: 'warning states and cautionary indicators',
    danger: 'error states, destructive actions, and critical alerts',
    info: 'informational elements and neutral status indicators',
  };
  for (const [slot, role] of Object.entries(colorRoles)) {
    if (colors[slot]) {
      lines.push(`- **${describeColor(colors[slot])}** (${colors[slot]}) — ${role}`);
    }
  }
  lines.push(``);

  // 3. Typography Rules
  lines.push(`## Typography Rules`);
  lines.push(``);
  const sameFont = headingFont === bodyFont;
  if (sameFont) {
    lines.push(`Use **${headingFont}** throughout for both headings and body text, creating a unified typographic voice.`);
  } else {
    lines.push(`Use **${headingFont}** for headings and display text, paired with **${bodyFont}** for body copy and UI labels.`);
  }
  lines.push(``);
  if (typo?.length) {
    const weightName = (w) => {
      if (w >= 800) return 'extra-bold';
      if (w >= 700) return 'bold';
      if (w >= 600) return 'semi-bold';
      if (w >= 500) return 'medium';
      return 'regular';
    };
    lines.push(`Type scale hierarchy:`);
    for (const t of typo) {
      lines.push(`- **${t.name}**: ${t.size} at ${weightName(t.weight)} (${t.weight}) with ${t.lh} line-height`);
    }
  }
  lines.push(``);

  // 4. Component Stylings
  lines.push(`## Component Stylings`);
  lines.push(``);
  const rMd = radius.md != null ? parseInt(radius.md) : 8;
  const cornerDesc = rMd >= 16 ? `generously rounded corners (${radius.md})` : rMd >= 8 ? `subtly rounded corners (${radius.md})` : rMd >= 4 ? `slightly rounded corners (${radius.md})` : `sharp, near-square corners (${radius.md})`;
  const shadowDesc = holistic?.styleProfile?.elevation === 'flat' ? 'Flat — no shadows' : `Whisper-soft diffused shadows for subtle depth`;
  lines.push(`- **Buttons:** ${cornerDesc}, generous padding. Primary buttons use the primary color for background with contrasting text. Secondary buttons use subtle borders or muted backgrounds.`);
  lines.push(`- **Cards/Containers:** ${cornerDesc} with ${isDark ? 'slightly elevated surface backgrounds' : 'clean white or surface-toned backgrounds'}. ${shadowDesc}.`);
  lines.push(`- **Inputs/Forms:** ${rMd >= 8 ? 'Rounded' : 'Subtly rounded'} fields with ${isDark ? 'lighter border on dark surface' : 'light gray border'}. Focus state uses primary color accent.`);
  lines.push(``);

  // 5. Layout Principles
  lines.push(`## Layout Principles`);
  lines.push(``);
  if (spacing?.length >= 4) {
    const small = spacing[1] || 4;
    const medium = spacing[3] || 16;
    const large = spacing[spacing.length - 2] || 32;
    lines.push(`Spacing follows a progressive scale: tight gaps (${small}px) for related elements, comfortable padding (${medium}px) within components, and generous margins (${large}px) between sections.`);
  }
  const densityDesc = holistic?.styleProfile?.density === 'compact' ? 'The layout favors density — pack information tightly with minimal whitespace between elements.' : holistic?.styleProfile?.density === 'spacious' ? 'The layout favors breathing room — use generous whitespace to create a gallery-like, uncluttered feel.' : 'The layout balances content density with comfortable whitespace.';
  lines.push(densityDesc);
  lines.push(``);

  // Footer
  lines.push(`---`);
  lines.push(`*Generated by img2ui · v0.2 · ${new Date().toISOString().slice(0, 10)} · Use with Google Stitch for best results.*`);

  return lines.join('\n');
}

/**
 * Download design system as DESIGN.md (Google Stitch format)
 */
export function downloadDesignMD(DS, holisticResult, lang) {
  if (!DS?.colors) { alert('Complete pipeline first'); return; }
  const md = buildDesignMD(DS, holisticResult, lang);
  dl(md, 'DESIGN.md', 'text/markdown');
}

/**
 * Download UI Kit as HTML preview
 * @param {Object} DS - Design system object
 * @param {string} uiKitHtml - Rendered UI kit HTML
 * @returns {void}
 */
export function downloadHTML(DS, uiKitHtml) {
  if (!uiKitHtml) {
    alert('Generate UI Kit first');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UI Kit Preview — img2ui</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #f5f5f5; padding: 24px; }
  .kit-section { border-radius: 16px; padding: 24px; margin-bottom: 16px; }
  .kit-section-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: 16px; opacity: .4; }
  .ratio-bar { height: 28px; border-radius: 6px; display: flex; overflow: hidden; border: 1px solid rgba(0,0,0,.1); }
  .ratio-seg { display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; min-width: 20px; }
  input, select { font-family: inherit; }
</style>
</head>
<body>
<div style="max-width: 960px; margin: 0 auto;">
  <div style="text-align:center;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#999;margin-bottom:4px;">GENERATED BY img2ui</div>
    <h1 style="font-size:22px;font-weight:800;color:#222;">UI Kit Preview</h1>
  </div>
  ${uiKitHtml}
</div>
</body>
</html>`;

  dl(html, 'ui-kit-preview.html', 'text/html');
}

/**
 * Fetch Figma clipboard data via Worker proxy → code.to.design API.
 * Must be called BEFORE the user triggers copy (async fetch, then sync copy).
 * @param {string} uiKitHtml - Rendered UI Kit HTML
 * @returns {Promise<string>} Figma-compatible clipboard HTML
 */
export async function fetchFigmaClipboard(uiKitHtml) {
  if (!uiKitHtml) throw new Error('No UI Kit HTML');

  const fullHtml = `<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; }
.kit-section { border-radius: 16px; padding: 24px; margin-bottom: 16px; }
.kit-section-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: 16px; }
input, select { font-family: inherit; }
</style>
<div style="max-width:960px;">
  ${uiKitHtml}
</div>`;

  const apiBase = import.meta.env.VITE_API_BASE || '';
  const devKey = import.meta.env.VITE_DEV_BYPASS_KEY || '';

  const resp = await fetch(`${apiBase}/api/figma-clipboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dev-key': devKey,
    },
    body: JSON.stringify({ html: fullHtml }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Figma clipboard API error ${resp.status}: ${text}`);
  }

  return resp.text();
}

/**
 * Write pre-fetched Figma clipboard data to system clipboard.
 * MUST be called synchronously inside a user click handler (within ~5s).
 * @param {string} clipboardData - HTML string from fetchFigmaClipboard()
 */
export function writeFigmaClipboard(clipboardData) {
  const handler = (e) => {
    e.clipboardData.setData('text/html', clipboardData);
    e.preventDefault();
    document.removeEventListener('copy', handler);
  };
  document.addEventListener('copy', handler);
  document.execCommand('copy');
}
