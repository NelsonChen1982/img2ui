## ADDED Requirements

### Requirement: Worker supports OpenRouter provider type
The Worker SHALL support `openrouter` as a provider type in the `PROVIDERS` config and route API calls through a dedicated `callOpenRouter` function that uses the OpenAI-compatible chat completions format with OpenRouter-specific auth headers.

#### Scenario: Worker calls Hunter Alpha via OpenRouter
- **WHEN** a request arrives at `/api/analyze-component` with `provider: "hunter-alpha"`
- **THEN** the Worker SHALL send a POST to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <OPENROUTER_API_KEY>`, `HTTP-Referer` header, model `openrouter/hunter-alpha`, and the image as a `data:` URL in the OpenAI vision format

#### Scenario: Worker returns parsed result from OpenRouter
- **WHEN** OpenRouter returns a successful response
- **THEN** the Worker SHALL parse the response using the same OpenAI format (`choices[0].message.content`) and return `{ result, parsed, usage, provider }` matching the existing provider response shape

#### Scenario: Missing OpenRouter API key
- **WHEN** a request specifies an OpenRouter model but `OPENROUTER_API_KEY` is not set
- **THEN** the Worker SHALL return a 502 error with message indicating the API key is not configured

### Requirement: Hunter Alpha is not in auto-resolve fallback
The `resolveProvider` function SHALL NOT include Hunter Alpha or any OpenRouter model in the automatic fallback chain. OpenRouter models MUST only be used when explicitly selected by the user.

#### Scenario: Auto-resolve with OpenRouter key present
- **WHEN** `resolveProvider` is called with `requested: "auto"` and `OPENROUTER_API_KEY` is set
- **THEN** the function SHALL NOT select an OpenRouter model; it SHALL follow the existing fallback order (Gemini → OpenAI → Anthropic)

### Requirement: Frontend provider selector includes Hunter Alpha
The frontend `PROVIDERS` constant SHALL include a `hunter-alpha` entry with a label indicating it is free and experimental.

#### Scenario: User sees Hunter Alpha in provider dropdown
- **WHEN** user opens the provider selection dropdown
- **THEN** Hunter Alpha SHALL appear as an option with a label like "Hunter Alpha (Free)" and an icon

### Requirement: Dev mode supports OpenRouter direct API calls
The `directAPICall` function in `aiService.js` SHALL support OpenRouter calls when `devSettings.openrouter` key is provided, using the same OpenAI-compatible format.

#### Scenario: Local dev calls OpenRouter directly
- **WHEN** dev mode is active and `devSettings.openrouter` contains an API key and user selects Hunter Alpha
- **THEN** `directAPICall` SHALL call `https://openrouter.ai/api/v1/chat/completions` directly from the browser with the dev key

### Requirement: Settings store includes OpenRouter key field
The `devSettings` in `settings.js` SHALL include an `openrouter` field for storing the OpenRouter API key in dev mode, persisted to localStorage.

#### Scenario: User enters OpenRouter key in dev settings
- **WHEN** user provides an OpenRouter API key in dev settings
- **THEN** the key SHALL be stored in `devSettings.openrouter` and persisted to localStorage with the `pic2ui_dev` prefix
