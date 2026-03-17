/**
 * Pic to UI — Cloudflare Worker
 * Claude API Proxy + Multi-Provider Support + Dual Rate Limiting (IP + Email, 5 req/day)
 *
 * Storage:
 *   KV  (RATE_LIMIT)  — Daily rate limit counters with TTL auto-expiry
 *   D1  (DB)          — Email records, design tokens, usage audit log
 *   R2  (IMAGES)      — Uploaded images (max 5 MB)
 *
 * Endpoints:
 *   POST /api/analyze          — Full image → Design System extraction
 *   POST /api/analyze-component — Cropped annotation → CSS properties extraction
 *   POST /api/upload-image     — Upload image to R2 (returns image key)
 *   POST /api/save-result      — Save design tokens + annotations to D1
 *   GET  /api/history          — Get user's saved design systems
 *   GET  /api/rate-status      — Check remaining daily uses
 *   GET  /health               — Health check
 */

const DAILY_LIMIT = 5;
const RATE_WINDOW = 86400;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Provider Configs ───
const PROVIDERS = {
  'claude-haiku': {
    api: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
    type: 'anthropic',
  },
  'claude-sonnet': {
    api: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    type: 'anthropic',
  },
  'gpt4o-mini': {
    api: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    type: 'openai',
  },
  'gpt4o': {
    api: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    type: 'openai',
  },
  'gemini-flash': {
    api: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    type: 'gemini',
  },
};

// Auto provider = cheapest available
function resolveProvider(requested, env) {
  if (requested && requested !== 'auto' && PROVIDERS[requested]) {
    return requested;
  }
  if (env.GEMINI_API_KEY) return 'gemini-flash';
  if (env.OPENAI_API_KEY) return 'gpt4o-mini';
  return 'claude-haiku';
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((str || '').trim());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function detectMediaType(base64) {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

// ─── Turnstile Verification ───

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn('[worker] TURNSTILE_SECRET_KEY not set — skipping verification');
    return true;
  }
  if (!token) return false;

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });
  const data = await resp.json();
  console.log(`[worker] Turnstile verify: success=${data.success}`);
  return data.success === true;
}

// ─── Multi-Provider API Calls ───

async function callAnthropic(env, providerKey, imageBase64, prompt, maxTokens) {
  const p = PROVIDERS[providerKey];
  const mediaType = detectMediaType(imageBase64);
  const resp = await fetch(p.api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'Anthropic API error');
  return {
    result: data,
    parsed: tryParseJSON(data.content?.[0]?.text),
    usage: { inputTokens: data.usage?.input_tokens || 0, outputTokens: data.usage?.output_tokens || 0 },
  };
}

async function callOpenAI(env, providerKey, imageBase64, prompt, maxTokens) {
  const p = PROVIDERS[providerKey];
  const mediaType = detectMediaType(imageBase64);
  const resp = await fetch(p.api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'OpenAI API error');
  const text = data.choices?.[0]?.message?.content || '';
  return {
    result: data,
    parsed: tryParseJSON(text),
    usage: { inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 },
  };
}

async function callGemini(env, providerKey, imageBase64, prompt, maxTokens) {
  const p = PROVIDERS[providerKey];
  const mediaType = detectMediaType(imageBase64);
  const apiUrl = `${p.api}?key=${env.GEMINI_API_KEY}`;
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mediaType, data: imageBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(data.error?.message || 'Gemini API error');
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    result: data,
    parsed: tryParseJSON(text),
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

function tryParseJSON(text) {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callProvider(env, providerKey, imageBase64, prompt, maxTokens = 4096) {
  const p = PROVIDERS[providerKey];
  if (!p) throw new Error(`Unknown provider: ${providerKey}`);
  switch (p.type) {
    case 'anthropic': return callAnthropic(env, providerKey, imageBase64, prompt, maxTokens);
    case 'openai': return callOpenAI(env, providerKey, imageBase64, prompt, maxTokens);
    case 'gemini': return callGemini(env, providerKey, imageBase64, prompt, maxTokens);
    default: throw new Error(`Unsupported provider type: ${p.type}`);
  }
}

// ─── Rate Limiting (KV) ───

async function checkAndIncrementRate(env, ip, email, corsHeaders) {
  const today = todayKey();
  const ipKey = `daily:ip:${ip}:${today}`;
  const emailKey = `daily:email:${email.toLowerCase().trim()}:${today}`;

  const [ipData, emailData] = await Promise.all([
    env.RATE_LIMIT.get(ipKey, 'json'),
    env.RATE_LIMIT.get(emailKey, 'json'),
  ]);

  const ipCount = ipData?.count || 0;
  const emailCount = emailData?.count || 0;

  if (ipCount >= DAILY_LIMIT) {
    return { error: true, response: new Response(
      JSON.stringify({ error: 'rate_limited', message: `IP daily limit (${DAILY_LIMIT}) reached.`, remaining: 0, limitType: 'ip' }),
      { status: 429, headers: corsHeaders }
    )};
  }
  if (emailCount >= DAILY_LIMIT) {
    return { error: true, response: new Response(
      JSON.stringify({ error: 'rate_limited', message: `Email daily limit (${DAILY_LIMIT}) reached.`, remaining: 0, limitType: 'email' }),
      { status: 429, headers: corsHeaders }
    )};
  }

  const ttl = RATE_WINDOW + 3600;
  await Promise.all([
    env.RATE_LIMIT.put(ipKey, JSON.stringify({ count: ipCount + 1 }), { expirationTtl: ttl }),
    env.RATE_LIMIT.put(emailKey, JSON.stringify({ count: emailCount + 1 }), { expirationTtl: ttl }),
  ]);

  return { error: false, remaining: DAILY_LIMIT - (ipCount + 1) };
}

// ─── D1 Helpers ───

async function upsertEmail(db, email, ip) {
  const emailNorm = email.toLowerCase().trim();
  const existing = await db.prepare('SELECT id FROM emails WHERE email = ?').bind(emailNorm).first();
  if (existing) {
    await db.prepare('UPDATE emails SET last_used = datetime(\'now\'), total_uses = total_uses + 1, last_ip = ? WHERE email = ?')
      .bind(ip, emailNorm).run();
  } else {
    await db.prepare('INSERT INTO emails (email, last_ip) VALUES (?, ?)')
      .bind(emailNorm, ip).run();
  }
  console.log(`[worker] D1 email upsert: ${emailNorm}`);
}

async function logUsage(db, email, endpoint, provider, ip, imageKey, usage) {
  await db.prepare(
    'INSERT INTO usage_log (email, endpoint, provider, ip, image_key, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    email.toLowerCase().trim(),
    endpoint,
    provider || '',
    ip,
    imageKey || '',
    usage?.inputTokens || 0,
    usage?.outputTokens || 0,
  ).run();
}

async function saveDesignTokens(db, email, imageKey, tokensJson, annotationsJson, holisticJson, provider) {
  const result = await db.prepare(
    'INSERT INTO design_tokens (email, image_key, tokens_json, annotations_json, holistic_json, provider) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    email.toLowerCase().trim(),
    imageKey || '',
    typeof tokensJson === 'string' ? tokensJson : JSON.stringify(tokensJson),
    typeof annotationsJson === 'string' ? annotationsJson : JSON.stringify(annotationsJson),
    typeof holisticJson === 'string' ? holisticJson : JSON.stringify(holisticJson),
    provider || '',
  ).run();
  return result;
}

// ─── Worker Entry ───

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    // Health check
    if (url.pathname === '/health') {
      const providers = [];
      if (env.ANTHROPIC_API_KEY) providers.push('claude-haiku', 'claude-sonnet');
      if (env.OPENAI_API_KEY) providers.push('gpt4o-mini', 'gpt4o');
      if (env.GEMINI_API_KEY) providers.push('gemini-flash');
      return new Response(JSON.stringify({
        status: 'ok',
        dailyLimit: DAILY_LIMIT,
        providers,
        storage: {
          d1: !!env.DB,
          r2: !!env.IMAGES,
          kv: !!env.RATE_LIMIT,
        },
      }), { headers: corsHeaders });
    }

    // Rate limit status
    if (url.pathname === '/api/rate-status') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const today = todayKey();
      const data = await env.RATE_LIMIT.get(`daily:ip:${ip}:${today}`, 'json');
      const used = data?.count || 0;
      return new Response(JSON.stringify({ remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT, used }), { headers: corsHeaders });
    }

    // ─── Upload Image to R2 ───
    if (url.pathname === '/api/upload-image' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders });
      }

      const { image_base64: imageBase64, email, turnstile_token: turnstileToken } = body;
      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers: corsHeaders });
      }

      // Turnstile bot verification
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const turnstileOk = await verifyTurnstile(env, turnstileToken, ip);
      if (!turnstileOk) {
        return new Response(JSON.stringify({ error: 'turnstile_failed', message: 'Human verification failed' }), { status: 403, headers: corsHeaders });
      }

      // Check size (base64 is ~4/3 of original)
      const estimatedBytes = Math.ceil(imageBase64.length * 3 / 4);
      if (estimatedBytes > MAX_IMAGE_SIZE) {
        return new Response(JSON.stringify({
          error: 'image_too_large',
          message: `Image exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit (got ${(estimatedBytes / 1024 / 1024).toFixed(1)}MB)`,
          maxSize: MAX_IMAGE_SIZE,
        }), { status: 413, headers: corsHeaders });
      }

      // Rate limit check — each upload = 1 daily use
      const rateResult = await checkAndIncrementRate(env, ip, email, corsHeaders);
      if (rateResult.error) return rateResult.response;

      const mediaType = detectMediaType(imageBase64);
      const ext = mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png';
      const imageKey = `${email.toLowerCase().trim()}/${Date.now()}.${ext}`;

      try {
        // Decode base64 and upload to R2
        const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        await env.IMAGES.put(imageKey, binaryData, {
          httpMetadata: { contentType: mediaType },
          customMetadata: { email: email.toLowerCase().trim(), uploadedAt: new Date().toISOString(), ip },
        });

        // Log to D1
        if (env.DB) {
          await upsertEmail(env.DB, email, ip);
          await logUsage(env.DB, email, 'upload-image', '', ip, imageKey, {});
        }

        console.log(`[worker] R2 upload: ${imageKey} (${(estimatedBytes / 1024).toFixed(0)} KB)`);
        return new Response(JSON.stringify({
          imageKey,
          size: estimatedBytes,
          mediaType,
          rateLimit: { remaining: rateResult.remaining, limit: DAILY_LIMIT },
        }), { headers: corsHeaders });
      } catch (err) {
        console.error(`[worker] R2 upload error:`, err.message);
        return new Response(JSON.stringify({ error: 'upload_failed', message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ─── Save Design Result to D1 ───
    if (url.pathname === '/api/save-result' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders });
      }

      const { email, image_key: imageKey, tokens, annotations, holistic, provider } = body;
      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }
      if (!tokens) {
        return new Response(JSON.stringify({ error: 'missing_tokens' }), { status: 400, headers: corsHeaders });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers: corsHeaders });
      }

      try {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        await upsertEmail(env.DB, email, ip);
        await saveDesignTokens(env.DB, email, imageKey, tokens, annotations || [], holistic || {}, provider);
        await logUsage(env.DB, email, 'save-result', provider || '', ip, imageKey || '', {});

        console.log(`[worker] D1 saved design tokens for ${email}`);
        return new Response(JSON.stringify({ saved: true }), { headers: corsHeaders });
      } catch (err) {
        console.error(`[worker] D1 save error:`, err.message);
        return new Response(JSON.stringify({ error: 'save_failed', message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ─── Get User History from D1 ───
    if (url.pathname === '/api/history' && request.method === 'GET') {
      const email = url.searchParams.get('email');
      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers: corsHeaders });
      }

      try {
        const rows = await env.DB.prepare(
          'SELECT id, image_key, tokens_json, annotations_json, holistic_json, provider, created_at FROM design_tokens WHERE email = ? ORDER BY created_at DESC LIMIT 20'
        ).bind(email.toLowerCase().trim()).all();

        return new Response(JSON.stringify({ results: rows.results || [] }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'query_failed', message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ─── Main Design System Analysis ───
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders });
      }

      const { image_base64: imageBase64, email, provider: reqProvider } = body;
      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers: corsHeaders });
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateResult = await checkAndIncrementRate(env, ip, email, corsHeaders);
      if (rateResult.error) return rateResult.response;

      // Log to D1
      if (env.DB) {
        await upsertEmail(env.DB, email, ip);
      }

      const providerKey = resolveProvider(reqProvider, env);
      const prompt = `Analyze this UI image and extract a Design System. Return JSON with:
{
  "colors": [{ "hex": "#xxx", "role": "primary|secondary|accent|surface|text", "ratio": 0.3 }],
  "isDark": true/false,
  "typography": [{ "level": "h1|h2|body|small", "estimatedSize": "28px", "weight": "700" }],
  "components": ["navbar", "hero", "card", "button", ...],
  "layout": { "type": "grid|flex|stack", "columns": 2, "gap": "16px" },
  "mood": "dark and professional | light and playful | ..."
}
Only return valid JSON, no markdown.`;

      try {
        const aiResult = await callProvider(env, providerKey, imageBase64, prompt, 4096);

        // Log usage to D1
        if (env.DB) {
          await logUsage(env.DB, email, 'analyze', providerKey, ip, '', aiResult.usage);
        }

        return new Response(JSON.stringify({
          result: aiResult.result,
          parsed: aiResult.parsed,
          usage: aiResult.usage,
          provider: providerKey,
          rateLimit: { remaining: rateResult.remaining, limit: DAILY_LIMIT },
        }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'api_error', message: err.message, provider: providerKey }), { status: 502, headers: corsHeaders });
      }
    }

    // ─── Annotation Component Analysis ───
    if (url.pathname === '/api/analyze-component' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders });
      }

      const { image_base64: imageBase64, email, prompt: customPrompt, componentType, provider: reqProvider } = body;
      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers: corsHeaders });
      }

      // Annotation analysis does NOT count against the main daily limit
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Log to D1
      if (env.DB) {
        await upsertEmail(env.DB, email, ip);
      }

      const providerKey = resolveProvider(reqProvider, env);

      const prompt = customPrompt || `Analyze this cropped UI element (type: ${componentType || 'unknown'}). Return ONLY valid JSON:
{
  "elementType": "${componentType || 'unknown'}",
  "css": {
    "backgroundColor": "#hex or transparent",
    "color": "#hex",
    "borderRadius": "Npx",
    "border": "none or Npx solid #hex",
    "padding": "Npx Npx",
    "fontSize": "Npx",
    "fontWeight": "400|500|600|700",
    "boxShadow": "none or shadow value"
  },
  "variant": "primary|secondary|outline|ghost|soft|filled",
  "label": "visible text or empty",
  "description": "brief description"
}`;

      try {
        const aiResult = await callProvider(env, providerKey, imageBase64, prompt, 1024);

        // Log usage to D1
        if (env.DB) {
          await logUsage(env.DB, email, 'analyze-component', providerKey, ip, '', aiResult.usage);
        }

        return new Response(JSON.stringify({
          result: aiResult.result,
          parsed: aiResult.parsed,
          usage: aiResult.usage,
          provider: providerKey,
        }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'api_error', message: err.message, provider: providerKey }), { status: 502, headers: corsHeaders });
      }
    }

    return new Response(
      JSON.stringify({
        error: 'not_found',
        endpoints: [
          '/api/analyze',
          '/api/analyze-component',
          '/api/upload-image',
          '/api/save-result',
          '/api/history',
          '/api/rate-status',
          '/health',
        ],
      }),
      { status: 404, headers: corsHeaders }
    );
  },
};
