## 1. Worker — OpenRouter Provider

- [x] 1.1 Add `hunter-alpha` entry to `PROVIDERS` config in `worker-rate-limit.js` with `type: 'openrouter'`, model `openrouter/hunter-alpha`, endpoint `https://openrouter.ai/api/v1/chat/completions`
- [x] 1.2 Add `callOpenRouter` function — mirrors `callOpenAI` but uses `OPENROUTER_API_KEY` and adds `HTTP-Referer` header
- [x] 1.3 Add `'openrouter'` case to `callProvider` switch statement
- [x] 1.4 Verify `resolveProvider` does NOT include OpenRouter in the auto fallback chain

## 2. Frontend — Provider Selector

- [x] 2.1 Add `hunter-alpha` entry to `PROVIDERS` in `src/data/constants.js` with label "Hunter Alpha (Free)" and icon
- [x] 2.2 Add `openrouter` field to `devSettings` in `src/stores/settings.js`

## 3. Frontend — Direct API Calls (Dev Mode)

- [x] 3.1 Add OpenRouter branch in `directAPICall` in `src/services/aiService.js` — check `dev.openrouter` key, call OpenRouter endpoint with OpenAI-compatible format
- [x] 3.2 Add `hasDirectKey` check to include `dev.openrouter` alongside existing `dev.anthropic || dev.openai || dev.gemini`

## 4. Verification

- [ ] 4.1 Test locally: select Hunter Alpha in provider dropdown, upload image, verify analyze-component calls OpenRouter and returns parsed CSS JSON
- [ ] 4.2 Verify fallback to local heuristic works if Hunter Alpha returns invalid response
