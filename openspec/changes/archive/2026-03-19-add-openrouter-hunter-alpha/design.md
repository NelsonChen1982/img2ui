## Context

The Worker currently supports 3 provider types: `anthropic`, `openai`, `gemini`. Each has a dedicated `call*` function. OpenRouter uses an OpenAI-compatible API format, so we can reuse most of the OpenAI calling logic with different endpoint and auth headers.

Hunter Alpha is free ($0 input/$0 output) and supports Vision (image input → text output), making it a zero-cost option for UI component recognition.

## Goals / Non-Goals

**Goals:**
- Add OpenRouter as a reusable provider type (not just Hunter Alpha — future OpenRouter models should be easy to add)
- Add Hunter Alpha to the frontend provider selector
- Support both Worker-proxied calls and local dev direct API calls

**Non-Goals:**
- Replacing existing providers — Hunter Alpha is an additional option
- OpenRouter OAuth / user-provided keys — we use a single server-side key
- Streaming responses

## Decisions

### 1. Reuse OpenAI-compatible format for OpenRouter

OpenRouter's API is OpenAI-compatible (`/api/v1/chat/completions`), same request/response shape. We add a new provider `type: 'openrouter'` with a dedicated `callOpenRouter` function that mirrors `callOpenAI` but uses:
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Auth: `Authorization: Bearer ${env.OPENROUTER_API_KEY}`
- Extra header: `HTTP-Referer` (required by OpenRouter TOS)

**Why not just reuse `callOpenAI` directly?** Different API key secret name (`OPENROUTER_API_KEY` vs `OPENAI_API_KEY`) and the required `HTTP-Referer` header. Keeping it separate is cleaner.

### 2. Provider config entry in Worker

```js
'hunter-alpha': {
  api: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'openrouter/hunter-alpha',
  type: 'openrouter',
}
```

### 3. Frontend provider entry

Add to `PROVIDERS` in `constants.js` and to the devSettings OpenRouter key field in `settings.js`.

### 4. `resolveProvider` fallback — no change

Hunter Alpha is opt-in only (user selects it). It should NOT be in the auto-resolve fallback chain since it's experimental and logs all prompts/completions.

### 5. Direct API calls in dev mode

`aiService.js` `directAPICall` needs an OpenRouter branch. Check for `dev.openrouter` key, call OpenRouter endpoint directly from browser. Same OpenAI-compatible format.

## Risks / Trade-offs

- **Privacy**: OpenRouter logs all prompts and completions for Hunter Alpha. Users' UI screenshots will be logged. → Mitigation: This is opt-in only (user must explicitly select Hunter Alpha). Add a note in the provider label.
- **Model quality unknown**: Hunter Alpha is new and unverified for UI recognition tasks. → Mitigation: Fallback to local heuristic still works if AI returns bad JSON.
- **Free tier may change**: $0 pricing could change. → Mitigation: No impact — we just treat it like any other provider with per-token cost.
