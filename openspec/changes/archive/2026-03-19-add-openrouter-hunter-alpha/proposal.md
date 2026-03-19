## Why

We want to integrate OpenRouter as a new AI provider to access models not available through direct vendor APIs. The immediate use case is Hunter Alpha — a free, 1T-parameter Vision model on OpenRouter that supports image input, making it suitable for our UI component recognition pipeline. This lets us experiment with new models at zero API cost.

## What Changes

- Add `openrouter` as a new provider type in the Worker's multi-provider system
- Add `hunter-alpha` model entry using OpenRouter's OpenAI-compatible API format
- Add Hunter Alpha to the frontend provider dropdown in settings
- Support `OPENROUTER_API_KEY` as a new Worker secret
- Dev mode: support OpenRouter key in devSettings for local/direct API calls

## Capabilities

### New Capabilities
- `openrouter-provider`: OpenRouter API integration as a new provider type in the Worker and frontend, including auth, request format, and response parsing.

### Modified Capabilities
<!-- No existing spec-level requirements are changing. The provider system is being extended, not altered. -->

## Impact

- **Worker** (`worker/worker-rate-limit.js`): New provider config entry, new `callOpenRouter` function (reuses OpenAI-compatible format), updated `resolveProvider` fallback chain, new `OPENROUTER_API_KEY` secret
- **Frontend** (`src/data/constants.js`): New entry in `PROVIDERS` map
- **Frontend** (`src/stores/settings.js`): OpenRouter key field in devSettings
- **Frontend** (`src/services/aiService.js`): OpenRouter support in `directAPICall` for local dev usage
