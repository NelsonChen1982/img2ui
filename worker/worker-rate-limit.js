/**
 * Pic to UI — Cloudflare Worker
 * Claude API Proxy + Multi-Provider Support + Rate Limiting + Session Auth
 *
 * Storage:
 *   KV  (RATE_LIMIT)  — Daily rate limit counters with TTL auto-expiry
 *   D1  (DB)          — Email records, design tokens, usage audit log
 *   R2  (IMAGES)      — Uploaded images (max 5 MB)
 *
 * Security:
 *   - Turnstile bot verification on upload
 *   - HMAC session tokens issued on upload, required for all subsequent calls
 *   - Per-IP rate limits on upload (5/day) and component analysis (10/day)
 *   - CORS restricted to allowed origins
 *   - Request body size limits
 *
 * Endpoints:
 *   POST /api/upload-image      — Upload image to R2 (Turnstile + rate limit, issues session token)
 *   POST /api/analyze           — Full image → Design System extraction (session token required)
 *   POST /api/analyze-component — Cropped annotation → CSS extraction (session token + rate limit)
 *   POST /api/save-result       — Save design tokens to D1 (session token required)
 *   GET  /api/history           — Get user's saved design systems (session token required)
 *   GET  /api/rate-status       — Check remaining daily uses
 *   GET  /health                — Health check
 */

const DAILY_LIMIT = 30; // legacy, kept for existing rate limit logic during migration
const RATE_WINDOW = 86400;
const CREDITS_CAP = 50;
const WELCOME_BONUS = 10;
const DAILY_REFILL = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_BODY_SIZE = 7 * 1024 * 1024;  // 7 MB (base64 overhead)
const ALLOWED_ORIGINS = [
  'https://img2ui.com',
  'https://www.img2ui.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

// ─── Dev Bypass ───
// Set DEV_BYPASS_KEY secret in worker + VITE_DEV_BYPASS_KEY in .env
// Requests with matching x-dev-key header skip Turnstile, rate limit, and session checks
function isDevBypass(request, env) {
  if (!env.DEV_BYPASS_KEY) return false;
  return request.headers.get('x-dev-key') === env.DEV_BYPASS_KEY;
}

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
  'gpt-5.4': {
    api: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5.4',
    type: 'openai',
  },
  'gpt5-nano': {
    api: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5-nano',
    type: 'openai',
  },
  'gemini-flash': {
    api: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    type: 'gemini',
  },
  'hunter-alpha': {
    api: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/hunter-alpha',
    type: 'openrouter',
  },
  'grok-4.1-fast': {
    api: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'x-ai/grok-4.1-fast',
    type: 'openrouter',
  },
  'qwen3.5-35b': {
    api: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3.5-35b-a3b',
    type: 'openrouter',
  },
  'qwen3.5-9b': {
    api: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3.5-9b',
    type: 'openrouter',
  },
  'qwen3.5-flash': {
    api: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3.5-flash-02-23',
    type: 'openrouter',
  },
};

function resolveProvider(requested, env) {
  if (requested && requested !== 'auto' && PROVIDERS[requested]) {
    return requested;
  }
  if (env.OPENAI_API_KEY) return 'gpt4o';
  if (env.GEMINI_API_KEY) return 'gemini-flash';
  return 'claude-haiku';
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((str || '').trim());
}

// Normalize email: lowercase, trim, strip plus-addressing
function normalizeEmail(str) {
  const email = (str || '').toLowerCase().trim();
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const stripped = local.split('+')[0];
  return `${stripped}@${domain}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function detectMediaType(base64) {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

// ─── Google ID Token Verification ───

let _googleCertsCache = null;
let _googleCertsExpiry = 0;

async function getGoogleCerts() {
  if (_googleCertsCache && Date.now() < _googleCertsExpiry) return _googleCertsCache;
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const data = await resp.json();
  _googleCertsCache = data.keys;
  _googleCertsExpiry = Date.now() + 3600_000; // cache 1h
  return _googleCertsCache;
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

async function verifyGoogleIdToken(idToken, clientId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

  // Check expiry and audience
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');
  if (payload.aud !== clientId) throw new Error('Invalid audience');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
    throw new Error('Invalid issuer');
  }

  // Verify signature with Google's public keys
  const certs = await getGoogleCerts();
  const cert = certs.find(k => k.kid === header.kid);
  if (!cert) throw new Error('Unknown signing key');

  const key = await crypto.subtle.importKey(
    'jwk', cert, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed);
  if (!valid) throw new Error('Invalid signature');

  return payload; // { sub, email, name, picture, ... }
}

// ─── Auth Helpers ───

async function upsertUser(db, email, name, avatarUrl) {
  const emailNorm = normalizeEmail(email);
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(emailNorm).first();
  if (existing) {
    await db.prepare('UPDATE users SET last_login_at = datetime(\'now\'), name = ?, avatar_url = ? WHERE id = ?')
      .bind(name || '', avatarUrl || '', existing.id).run();
    return { id: existing.id, isNew: false };
  }
  const id = generateId();
  await db.prepare('INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)')
    .bind(id, emailNorm, name || '', avatarUrl || '').run();
  return { id, isNew: true };
}

async function linkProvider(db, userId, provider, providerSub, rawJson) {
  const existing = await db.prepare('SELECT id FROM auth_providers WHERE provider = ? AND provider_sub = ?')
    .bind(provider, providerSub).first();
  if (existing) return;
  await db.prepare('INSERT INTO auth_providers (user_id, provider, provider_sub, raw_json) VALUES (?, ?, ?, ?)')
    .bind(userId, provider, providerSub, JSON.stringify(rawJson || {})).run();
}

async function getCreditsBalance(db, userId) {
  const row = await db.prepare('SELECT COALESCE(SUM(amount), 0) as balance FROM credits_ledger WHERE user_id = ?')
    .bind(userId).first();
  return row?.balance || 0;
}

async function getGenerationCount(db, userId) {
  const row = await db.prepare('SELECT COUNT(*) as cnt FROM credits_ledger WHERE user_id = ? AND type = \'generation\'')
    .bind(userId).first();
  return row?.cnt || 0;
}

async function handleLoginCredits(db, userId, isNewUser) {
  // Welcome bonus for new users
  if (isNewUser) {
    await db.prepare('INSERT INTO credits_ledger (user_id, amount, type, memo) VALUES (?, ?, ?, ?)')
      .bind(userId, WELCOME_BONUS, 'welcome', 'Welcome bonus').run();
  }

  // Daily refill: check if already refilled today
  const todayRefill = await db.prepare(
    'SELECT COUNT(*) as cnt FROM credits_ledger WHERE user_id = ? AND type = \'daily_refill\' AND created_at >= date(\'now\')'
  ).bind(userId).first();

  if ((todayRefill?.cnt || 0) === 0) {
    const balance = await getCreditsBalance(db, userId);
    if (balance < CREDITS_CAP) {
      const refillAmount = Math.min(DAILY_REFILL, CREDITS_CAP - balance);
      await db.prepare('INSERT INTO credits_ledger (user_id, amount, type, memo) VALUES (?, ?, ?, ?)')
        .bind(userId, refillAmount, 'daily_refill', 'Daily login refill').run();
    }
  }
}

// ─── CORS ───

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0]; // default to production
}

// Derive frontend origin from worker URL (for GitHub callback redirect)
function getAppOrigin(url) {
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return 'http://localhost:5173';
  }
  return ALLOWED_ORIGINS[0]; // production
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Content-Type': 'application/json',
  };
}

// ─── Session Token (HMAC-SHA256) ───

async function signSession(env, identity, ip) {
  // identity: email (legacy), user_id (logged in), or "anon" (anonymous)
  const secret = env.TURNSTILE_SECRET_KEY || 'dev-fallback-key';
  const payload = `${identity}:${ip}:${todayKey()}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const token = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return token;
}

async function verifySession(env, token, identity, ip) {
  if (!token) return false;
  const expected = await signSession(env, identity, ip);
  return token === expected;
}

// Try verifying session against multiple identities (user_id, email, anon)
async function verifySessionFlex(env, token, ip, { userId, email } = {}) {
  if (!token) return false;
  if (userId && await verifySession(env, token, userId, ip)) return true;
  if (email && await verifySession(env, token, normalizeEmail(email), ip)) return true;
  if (await verifySession(env, token, 'anon', ip)) return true;
  return false;
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

// Qwen 3.5 models default to hybrid thinking mode — disable to avoid <think> blocks in output
const QWEN_THINKING_MODELS = ['qwen3.5-35b', 'qwen3.5-9b', 'qwen3.5-flash'];

async function callOpenRouter(env, providerKey, imageBase64, prompt, maxTokens) {
  const p = PROVIDERS[providerKey];
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const mediaType = detectMediaType(imageBase64);
  const body = {
    model: p.model,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
        { type: 'text', text: prompt },
      ],
    }],
  };
  // Disable thinking/reasoning for Qwen models to get clean JSON output
  if (QWEN_THINKING_MODELS.includes(providerKey)) {
    body.chat_template_kwargs = { enable_thinking: false };
  }
  const resp = await fetch(p.api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://img2ui.com',
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || 'OpenRouter API error');
  const text = data.choices?.[0]?.message?.content || '';
  return {
    result: data,
    parsed: tryParseJSON(text),
    usage: { inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 },
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
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
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
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2, responseMimeType: 'application/json' },
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
  // 1. Strip <think>...</think> reasoning blocks (Qwen, DeepSeek, etc.)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  // 2. Strip markdown code fences
  cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  // 3. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* fall through */ }
  // 4. Extract first JSON object (non-greedy for shallow objects)
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

// Reasoning models (o-series, gpt-5-nano) need extra tokens for chain-of-thought
const REASONING_MODELS = ['o4-mini', 'gpt5-nano'];

async function callProvider(env, providerKey, imageBase64, prompt, maxTokens = 4096) {
  const p = PROVIDERS[providerKey];
  if (!p) throw new Error(`Unknown provider: ${providerKey}`);
  if (REASONING_MODELS.includes(providerKey)) {
    maxTokens = Math.max(maxTokens, 4096);
  }
  switch (p.type) {
    case 'anthropic': return callAnthropic(env, providerKey, imageBase64, prompt, maxTokens);
    case 'openai': return callOpenAI(env, providerKey, imageBase64, prompt, maxTokens);
    case 'gemini': return callGemini(env, providerKey, imageBase64, prompt, maxTokens);
    case 'openrouter': return callOpenRouter(env, providerKey, imageBase64, prompt, maxTokens);
    default: throw new Error(`Unsupported provider type: ${p.type}`);
  }
}

// ─── Rate Limiting (KV) ───

async function checkAndIncrementRate(env, ip, email, headers, limit = DAILY_LIMIT, prefix = 'daily') {
  const today = todayKey();
  const emailNorm = normalizeEmail(email);
  const ipKey = `${prefix}:ip:${ip}:${today}`;
  const emailKey = `${prefix}:email:${emailNorm}:${today}`;

  const [ipData, emailData] = await Promise.all([
    env.RATE_LIMIT.get(ipKey, 'json'),
    env.RATE_LIMIT.get(emailKey, 'json'),
  ]);

  const ipCount = ipData?.count || 0;
  const emailCount = emailData?.count || 0;

  if (ipCount >= limit) {
    return { error: true, response: new Response(
      JSON.stringify({ error: 'rate_limited', message: `IP daily limit (${limit}) reached.`, remaining: 0, limitType: 'ip' }),
      { status: 429, headers }
    )};
  }
  if (emailCount >= limit) {
    return { error: true, response: new Response(
      JSON.stringify({ error: 'rate_limited', message: `Email daily limit (${limit}) reached.`, remaining: 0, limitType: 'email' }),
      { status: 429, headers }
    )};
  }

  const ttl = RATE_WINDOW + 3600;
  await Promise.all([
    env.RATE_LIMIT.put(ipKey, JSON.stringify({ count: ipCount + 1 }), { expirationTtl: ttl }),
    env.RATE_LIMIT.put(emailKey, JSON.stringify({ count: emailCount + 1 }), { expirationTtl: ttl }),
  ]);

  return { error: false, remaining: limit - (ipCount + 1) };
}

// ─── D1 Helpers ───

async function upsertEmail(db, email, ip) {
  if (!email) return; // skip for anonymous users
  const emailNorm = normalizeEmail(email);
  const existing = await db.prepare('SELECT id FROM emails WHERE email = ?').bind(emailNorm).first();
  if (existing) {
    await db.prepare('UPDATE emails SET last_used = datetime(\'now\'), total_uses = total_uses + 1, last_ip = ? WHERE email = ?')
      .bind(ip, emailNorm).run();
  } else {
    await db.prepare('INSERT INTO emails (email, last_ip) VALUES (?, ?)')
      .bind(emailNorm, ip).run();
  }
}

async function logUsage(db, email, endpoint, provider, ip, imageKey, usage) {
  await db.prepare(
    'INSERT INTO usage_log (email, endpoint, provider, ip, image_key, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    normalizeEmail(email), endpoint, provider || '', ip, imageKey || '',
    usage?.inputTokens || 0, usage?.outputTokens || 0,
  ).run();
}

async function saveDesignTokens(db, email, imageKey, tokensJson, annotationsJson, holisticJson, provider, userId) {
  const id = generateId();
  await db.prepare(
    'INSERT INTO design_tokens (id, user_id, email, image_key, tokens_json, annotations_json, holistic_json, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    userId || null,
    normalizeEmail(email || ''), imageKey || '',
    typeof tokensJson === 'string' ? tokensJson : JSON.stringify(tokensJson),
    typeof annotationsJson === 'string' ? annotationsJson : JSON.stringify(annotationsJson),
    typeof holisticJson === 'string' ? holisticJson : JSON.stringify(holisticJson),
    provider || '',
  ).run();
  return id;
}

// ─── Body Size Check ───

function checkBodySize(request, headers) {
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: 'payload_too_large', message: `Body exceeds ${MAX_BODY_SIZE / 1024 / 1024}MB limit` }),
      { status: 413, headers }
    );
  }
  return null;
}

// ─── Worker Entry ───

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': getCorsOrigin(request),
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, x-dev-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    // Health check (minimal info in production)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), { headers });
    }

    // ─── Google OAuth ───
    if (url.pathname === '/api/auth/google' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { id_token: idToken } = body;
      if (!idToken) {
        return new Response(JSON.stringify({ error: 'missing_id_token' }), { status: 400, headers });
      }
      if (!env.GOOGLE_CLIENT_ID) {
        return new Response(JSON.stringify({ error: 'google_not_configured' }), { status: 503, headers });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }

      try {
        const payload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
        const email = payload.email;
        if (!email) throw new Error('No email in token');

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { id: userId, isNew } = await upsertUser(env.DB, email, payload.name, payload.picture);
        await linkProvider(env.DB, userId, 'google', payload.sub, payload);
        await handleLoginCredits(env.DB, userId, isNew);

        const balance = await getCreditsBalance(env.DB, userId);
        const genCount = await getGenerationCount(env.DB, userId);
        const sessionToken = await signSession(env, userId, ip);

        console.log(`[worker] Google auth: ${email} (${isNew ? 'new' : 'returning'}, balance=${balance})`);
        return new Response(JSON.stringify({
          sessionToken,
          user: { id: userId, email: normalizeEmail(email), name: payload.name || '', avatarUrl: payload.picture || '' },
          credits: { balance, canGenerate: genCount === 0 || balance > 0 },
        }), { headers });
      } catch (err) {
        console.error('[worker] Google auth error:', err.message);
        return new Response(JSON.stringify({ error: 'auth_failed', message: err.message }), { status: 401, headers });
      }
    }

    // ─── GitHub OAuth: Redirect to GitHub ───
    if (url.pathname === '/api/auth/github' && request.method === 'GET') {
      if (!env.GITHUB_CLIENT_ID) {
        return new Response(JSON.stringify({ error: 'github_not_configured' }), { status: 503, headers });
      }
      const redirectUri = `${url.origin}/api/auth/github/callback`;
      const state = crypto.randomUUID();
      // Store state in KV for CSRF verification (5 min TTL)
      await env.RATE_LIMIT.put(`github_state:${state}`, '1', { expirationTtl: 300 });
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
      return Response.redirect(githubUrl, 302);
    }

    // ─── GitHub OAuth: Callback ───
    if (url.pathname === '/api/auth/github/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers });
      }
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: 'github_not_configured' }), { status: 503, headers });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }

      // Verify CSRF state
      const stateValid = await env.RATE_LIMIT.get(`github_state:${state}`);
      if (!stateValid) {
        return new Response(JSON.stringify({ error: 'invalid_state' }), { status: 403, headers });
      }
      await env.RATE_LIMIT.delete(`github_state:${state}`);

      try {
        // Exchange code for access token
        const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        const tokenData = await tokenResp.json();
        if (!tokenData.access_token) throw new Error('Failed to get access token');

        // Get user info
        const userResp = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'img2ui' },
        });
        const userData = await userResp.json();

        // Get email (may be private)
        let email = userData.email;
        if (!email) {
          const emailResp = await fetch('https://api.github.com/user/emails', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'img2ui' },
          });
          const emails = await emailResp.json();
          const primary = emails.find(e => e.primary && e.verified);
          email = primary?.email || emails.find(e => e.verified)?.email;
        }
        if (!email) throw new Error('No verified email from GitHub');

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { id: userId, isNew } = await upsertUser(env.DB, email, userData.name || userData.login, userData.avatar_url);
        await linkProvider(env.DB, userId, 'github', String(userData.id), userData);
        await handleLoginCredits(env.DB, userId, isNew);

        const balance = await getCreditsBalance(env.DB, userId);
        const genCount = await getGenerationCount(env.DB, userId);
        const sessionToken = await signSession(env, userId, ip);

        console.log(`[worker] GitHub auth: ${email} (${isNew ? 'new' : 'returning'}, balance=${balance})`);

        // Redirect back to app — derive frontend origin from worker origin
        const appOrigin = getAppOrigin(url);
        const authData = encodeURIComponent(JSON.stringify({
          sessionToken,
          user: { id: userId, email: normalizeEmail(email), name: userData.name || userData.login || '', avatarUrl: userData.avatar_url || '' },
          credits: { balance, canGenerate: genCount === 0 || balance > 0 },
        }));
        return Response.redirect(`${appOrigin}#auth=${authData}`, 302);
      } catch (err) {
        console.error('[worker] GitHub auth error:', err.message);
        const appOrigin = getAppOrigin(url);
        return Response.redirect(`${appOrigin}#auth_error=${encodeURIComponent(err.message)}`, 302);
      }
    }

    // ─── Credits Balance ───
    if (url.pathname === '/api/credits' && request.method === 'GET') {
      const userId = url.searchParams.get('user_id');
      const sessionToken = url.searchParams.get('session_token');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'missing_user_id' }), { status: 400, headers });
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!isDevBypass(request, env)) {
        const valid = await verifySession(env, sessionToken, userId, ip);
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers });
        }
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }
      const balance = await getCreditsBalance(env.DB, userId);
      const genCount = await getGenerationCount(env.DB, userId);
      return new Response(JSON.stringify({ balance, canGenerate: genCount === 0 || balance > 0 }), { headers });
    }

    // ─── Credits History ───
    if (url.pathname === '/api/credits-history' && request.method === 'GET') {
      const userId = url.searchParams.get('user_id');
      const sessionToken = url.searchParams.get('session_token');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'missing_user_id' }), { status: 400, headers });
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!isDevBypass(request, env)) {
        const valid = await verifySession(env, sessionToken, userId, ip);
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers });
        }
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }
      try {
        const rows = await env.DB.prepare(
          'SELECT id, amount, type, memo, created_at FROM credits_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
        ).bind(userId).all();
        return new Response(JSON.stringify({ items: rows.results || [] }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'query_failed' }), { status: 500, headers });
      }
    }

    // ─── Claim Anonymous Designs ───
    if (url.pathname === '/api/claim-designs' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }
      const { user_id: userId, session_token: sessionToken, design_ids: designIds } = body;
      if (!userId || !designIds || !Array.isArray(designIds) || designIds.length === 0) {
        return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers });
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!isDevBypass(request, env)) {
        const valid = await verifySession(env, sessionToken, userId, ip);
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers });
        }
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }
      try {
        let claimed = 0;
        for (const designId of designIds.slice(0, 20)) { // max 20 at once
          const result = await env.DB.prepare('UPDATE design_tokens SET user_id = ? WHERE id = ? AND user_id IS NULL')
            .bind(userId, designId).run();
          if (result.meta?.changes > 0) claimed++;
        }
        // Also update anon_usage records
        await env.DB.prepare('UPDATE anon_usage SET claimed_by = ? WHERE design_id IN (SELECT id FROM design_tokens WHERE user_id = ?)')
          .bind(userId, userId).run();
        return new Response(JSON.stringify({ claimed }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'claim_failed', message: err.message }), { status: 500, headers });
      }
    }

    // ─── Anonymous Free Pass Check ───
    if (url.pathname === '/api/anon-check' && request.method === 'GET') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const used = await env.RATE_LIMIT.get(`anon:ip:${ip}`);
      return new Response(JSON.stringify({ used: !!used }), { headers });
    }

    // ─── Mark Anonymous Free Pass Used ───
    if (url.pathname === '/api/anon-check' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      await env.RATE_LIMIT.put(`anon:ip:${ip}`, todayKey()); // no TTL = permanent
      return new Response(JSON.stringify({ marked: true }), { headers });
    }

    // Rate limit status (legacy)
    if (url.pathname === '/api/rate-status') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const today = todayKey();
      const data = await env.RATE_LIMIT.get(`daily:ip:${ip}:${today}`, 'json');
      const used = data?.count || 0;
      return new Response(JSON.stringify({ remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT, used }), { headers });
    }

    // ─── Upload Image to R2 (entry point — issues session token) ───
    if (url.pathname === '/api/upload-image' && request.method === 'POST') {
      const sizeErr = checkBodySize(request, headers);
      if (sizeErr) return sizeErr;

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { image_base64: imageBase64, email, turnstile_token: turnstileToken, user_id: userId } = body;
      // Email is now optional (anonymous users won't have one)
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers });
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Turnstile bot verification (skip for dev bypass)
      const devBypass = isDevBypass(request, env);
      if (!devBypass) {
        const turnstileOk = await verifyTurnstile(env, turnstileToken, ip);
        if (!turnstileOk) {
          return new Response(JSON.stringify({ error: 'turnstile_failed', message: 'Human verification failed' }), { status: 403, headers });
        }
      }

      // Check image size
      const estimatedBytes = Math.ceil(imageBase64.length * 3 / 4);
      if (estimatedBytes > MAX_IMAGE_SIZE) {
        return new Response(JSON.stringify({
          error: 'image_too_large',
          message: `Image exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
          maxSize: MAX_IMAGE_SIZE,
        }), { status: 413, headers });
      }

      // Rate limiting: logged-in users use credits (checked client-side), anonymous uses IP check
      if (!devBypass && !userId) {
        // Anonymous: check if free pass already used
        const anonUsed = await env.RATE_LIMIT.get(`anon:ip:${ip}`);
        if (anonUsed) {
          return new Response(JSON.stringify({ error: 'login_required', message: 'Free trial used. Please sign in.' }), { status: 403, headers });
        }
      }

      const mediaType = detectMediaType(imageBase64);
      const ext = mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png';
      const folder = email ? normalizeEmail(email) : `anon/${ip.replace(/[:.]/g, '_')}`;
      const imageKey = `${folder}/${Date.now()}.${ext}`;

      try {
        const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        await env.IMAGES.put(imageKey, binaryData, {
          httpMetadata: { contentType: mediaType },
          customMetadata: { uploadedAt: new Date().toISOString() },
        });

        if (env.DB && email) {
          await upsertEmail(env.DB, email, ip);
          await logUsage(env.DB, email, 'upload-image', '', ip, imageKey, {});
        }

        // Issue session token: user_id for logged-in, "anon" for anonymous
        const sessionIdentity = userId || (email ? normalizeEmail(email) : 'anon');
        const sessionToken = await signSession(env, sessionIdentity, ip);

        console.log(`[worker] R2 upload: ${imageKey} (${(estimatedBytes / 1024).toFixed(0)} KB, ${userId ? 'user' : 'anon'})`);
        return new Response(JSON.stringify({
          imageKey,
          size: estimatedBytes,
          mediaType,
          sessionToken,
        }), { headers });
      } catch (err) {
        console.error(`[worker] R2 upload error:`, err.message);
        return new Response(JSON.stringify({ error: 'upload_failed', message: err.message }), { status: 500, headers });
      }
    }

    // ─── Save Design Result to D1 (supports anonymous + logged-in) ───
    if (url.pathname === '/api/save-result' && request.method === 'POST') {
      const sizeErr = checkBodySize(request, headers);
      if (sizeErr) return sizeErr;

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { user_id: userId, email, image_key: imageKey, tokens, annotations, holistic, provider, session_token: sessionToken } = body;
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Session verification: flexible — accept user_id, email, or anon session
      if (!isDevBypass(request, env)) {
        const valid = await verifySessionFlex(env, sessionToken, ip, { userId, email });
        if (!valid) {
          // For anonymous saves without session, allow if no existing anon usage
          if (!userId && !email) {
            // Anonymous save allowed without session
          } else {
            return new Response(JSON.stringify({ error: 'invalid_session', message: 'Session expired or invalid' }), { status: 401, headers });
          }
        }
      }

      if (!tokens) {
        return new Response(JSON.stringify({ error: 'missing_tokens' }), { status: 400, headers });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }

      const tokensStr = typeof tokens === 'string' ? tokens : JSON.stringify(tokens);
      if (tokensStr.length > 500000) {
        return new Response(JSON.stringify({ error: 'payload_too_large', message: 'Tokens JSON too large' }), { status: 413, headers });
      }

      try {
        // Save design tokens (user_id can be null for anonymous)
        const designId = await saveDesignTokens(env.DB, email || '', imageKey, tokens, annotations || [], holistic || {}, provider, userId);

        // Credit deduction for logged-in users
        if (userId) {
          const genCount = await getGenerationCount(env.DB, userId);
          // First generation is free (amount=0), subsequent cost 1
          const amount = genCount === 0 ? 0 : -1;
          await env.DB.prepare('INSERT INTO credits_ledger (user_id, amount, type, memo) VALUES (?, ?, ?, ?)')
            .bind(userId, amount, 'generation', genCount === 0 ? 'First free generation' : 'UI Kit generation').run();
          await upsertEmail(env.DB, email || '', ip);
        } else {
          // Anonymous: record in anon_usage
          await env.DB.prepare('INSERT INTO anon_usage (ip, design_id) VALUES (?, ?)')
            .bind(ip, designId).run();
        }

        await logUsage(env.DB, email || '', 'save-result', provider || '', ip, imageKey || '', {});
        return new Response(JSON.stringify({ saved: true, design_id: designId }), { headers });
      } catch (err) {
        console.error(`[worker] D1 save error:`, err.message);
        return new Response(JSON.stringify({ error: 'save_failed', message: err.message }), { status: 500, headers });
      }
    }

    // ─── Get User History from D1 (session token required) ───
    if (url.pathname === '/api/history' && request.method === 'GET') {
      const email = url.searchParams.get('email');
      const userId = url.searchParams.get('user_id');
      const sessionToken = url.searchParams.get('session_token');

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!isDevBypass(request, env)) {
        const valid = await verifySessionFlex(env, sessionToken, ip, { userId, email });
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session', message: 'Session expired or invalid' }), { status: 401, headers });
        }
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ error: 'db_not_configured' }), { status: 503, headers });
      }

      try {
        const rows = await env.DB.prepare(
          'SELECT id, image_key, tokens_json, annotations_json, holistic_json, provider, created_at FROM design_tokens WHERE email = ? ORDER BY created_at DESC LIMIT 20'
        ).bind(normalizeEmail(email)).all();
        return new Response(JSON.stringify({ results: rows.results || [] }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'query_failed' }), { status: 500, headers });
      }
    }

    // ─── Main Design System Analysis (session token required) ───
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      const sizeErr = checkBodySize(request, headers);
      if (sizeErr) return sizeErr;

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { image_base64: imageBase64, email, provider: reqProvider, session_token: sessionToken, user_id: userId } = body;

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!isDevBypass(request, env)) {
        const valid = await verifySessionFlex(env, sessionToken, ip, { userId, email });
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers });
        }
      }

      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers });
      }

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
        if (env.DB) {
          await logUsage(env.DB, email, 'analyze', providerKey, ip, '', aiResult.usage);
        }
        return new Response(JSON.stringify({
          result: aiResult.result,
          parsed: aiResult.parsed,
          usage: aiResult.usage,
          provider: providerKey,
        }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'api_error', message: err.message }), { status: 502, headers });
      }
    }

    // ─── Annotation Component Analysis (session token + rate limit) ───
    if (url.pathname === '/api/analyze-component' && request.method === 'POST') {
      const sizeErr = checkBodySize(request, headers);
      if (sizeErr) return sizeErr;

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { image_base64: imageBase64, email, prompt: customPrompt, componentType, provider: reqProvider, session_token: sessionToken, user_id: userId } = body;

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const devBypassAC = isDevBypass(request, env);

      if (!devBypassAC) {
        const valid = await verifySessionFlex(env, sessionToken, ip, { userId, email });
        if (!valid) {
          return new Response(JSON.stringify({ error: 'invalid_session' }), { status: 401, headers });
        }
      }

      if (!imageBase64) {
        return new Response(JSON.stringify({ error: 'missing_image' }), { status: 400, headers });
      }

      // Component analysis shares the upload rate limit — no separate check.
      // The user already consumed a daily use when uploading; subsequent
      // analyse/save calls within the same session should not be blocked.

      if (env.DB) {
        await upsertEmail(env.DB, email, ip);
      }

      const providerKey = resolveProvider(reqProvider, env);

      // Use frontend-generated prompt if provided and reasonable length, otherwise fallback
      const prompt = (customPrompt && customPrompt.length <= 4000)
        ? customPrompt
        : `Analyze this cropped UI element (type: ${componentType || 'unknown'}). Return ONLY valid JSON:
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
        if (env.DB) {
          await logUsage(env.DB, email, 'analyze-component', providerKey, ip, '', aiResult.usage);
        }
        return new Response(JSON.stringify({
          result: aiResult.result,
          parsed: aiResult.parsed,
          usage: aiResult.usage,
          provider: providerKey,
        }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'api_error', message: err.message }), { status: 502, headers });
      }
    }

    // ─── Figma Clipboard Proxy (dev bypass only) ───
    if (url.pathname === '/api/figma-clipboard' && request.method === 'POST') {
      if (!isDevBypass(request, env)) {
        return new Response(JSON.stringify({ error: 'dev_only' }), { status: 403, headers });
      }

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
      }

      const { html: htmlContent } = body;
      if (!htmlContent) {
        return new Response(JSON.stringify({ error: 'missing_html' }), { status: 400, headers });
      }
      if (!env.CODE_TO_DESIGN_KEY) {
        return new Response(JSON.stringify({ error: 'CODE_TO_DESIGN_KEY not configured' }), { status: 503, headers });
      }

      try {
        const apiResp = await fetch('https://api.to.design/html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.CODE_TO_DESIGN_KEY}`,
          },
          body: JSON.stringify({ html: htmlContent, clip: true }),
        });

        if (!apiResp.ok) {
          const errText = await apiResp.text().catch(() => '');
          return new Response(JSON.stringify({ error: 'api_error', status: apiResp.status, message: errText }), { status: 502, headers });
        }

        const clipData = await apiResp.text();
        return new Response(clipData, {
          headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'proxy_error', message: err.message }), { status: 502, headers });
      }
    }

    return new Response(
      JSON.stringify({ error: 'not_found' }),
      { status: 404, headers }
    );
  },
};
