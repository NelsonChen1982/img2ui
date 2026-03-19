<div align="center">
  <img src="src/assets/logo.jpg" alt="img2ui" width="120" style="border-radius: 16px;" />

  # img2ui <sup>v0.1-beta</sup>

  **Turn any image into a complete Design System**

  Upload a screenshot, mockup, photo, or illustration — get colors, typography, spacing tokens, and 25 rendered UI components.

  [Live Demo](https://img2ui.com) &nbsp;|&nbsp; [繁體中文](README.zh-TW.md) &nbsp;|&nbsp; [日本語](README.ja.md)
</div>

---

## What it does

img2ui is a browser-based tool that reverse-engineers any image into a usable Design System:

1. **Upload** any image (PNG / JPG / WebP)
2. **Extract** a color palette via K-means quantization
3. **Map** colors to semantic slots (primary, secondary, accent, success, warning, danger...)
4. **Derive** typography scale, spacing, border radius, and shadow tokens
5. **Annotate** (optional) — draw regions on the image and label component types
6. **Analyze** annotations with multi-provider Vision LLMs (Claude, GPT-4o, Gemini)
7. **Render** a full UI Kit with 25 component types
8. **Export** as JSON, SKILL.md (for coding agents), or standalone HTML

### 25 Component Types

| Category | Components |
|----------|-----------|
| **Layout** | Navbar, Hero/Banner, Section, Sidebar, Footer |
| **Navigation** | Tab Bar, Breadcrumb, Pagination, Stepper |
| **Content** | Card, List/Item, Table, Image/Media, Rich Text |
| **Forms** | Button, Text Input, Checkbox/Radio, Select/Dropdown, Search Bar, Toggle/Switch |
| **Feedback** | Alert/Banner, Toast, Modal/Dialog, Tooltip, Badge/Tag, Avatar |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### AI Features (Optional)

To enable LLM-powered component analysis, you can configure API keys in the app's settings panel (dev mode). Supported providers:

- **Anthropic** — Claude Haiku / Sonnet
- **OpenAI** — GPT-4o / GPT-4o-mini / GPT-5 series / o4-mini
- **Google** — Gemini Flash
- **OpenRouter** — Hunter Alpha (free), Grok 4.1 Fast, Qwen 3.5 (35B / 9B / Flash)

> Images are processed locally in your browser. Only annotated regions are sent to the AI provider you select.

## Architecture

```
Image Upload
  → K-means color extraction (160×160 downsampled)
  → Semantic slot assignment (HSL heuristic scoring)
  → Design System derivation (typography, spacing, radius, shadows)
  → [Optional] Canvas annotation + LLM Vision analysis
  → UI Kit rendering (25 component types)
  → Export (JSON / SKILL.md / HTML)
```

**Tech stack:** Vue 3 (Composition API) · Pinia · Vite · Vanilla CSS

**Key design decisions:**
- **No server required** — everything runs in the browser (AI calls are direct browser-to-API)
- **3-tier AI fallback** — grouped analysis → individual analysis → pixel-based local heuristic
- **Design system is computed**, not configured — derived entirely from the input image
- **Multi-provider AI** — supports 4 providers via direct API and OpenRouter, with dev-only model comparison tooling
- **IR-first approach** — the intermediate representation is the core asset, enabling design ↔ code bidirectionality

## Dependencies & Alternatives

| Dependency | Current | Swappable? | Notes |
|-----------|---------|:----------:|-------|
| **Icons** | Font Awesome Pro (Duotone) | Yes | Replace with emoji or any icon set |
| **AI Providers** | Anthropic / OpenAI / Google / OpenRouter | Yes | Pick any, or skip AI entirely — local heuristic still works |
| **Worker** | Cloudflare Worker + KV + D1 + R2 | Yes | Only needed for rate limiting & image storage; self-host with any backend |
| **Hosting** | Cloudflare Pages | Yes | Static SPA — deploy anywhere |

> The core app (color extraction → design system → UI kit) runs fully client-side with zero external dependencies.

## Export Formats

| Format | Description |
|--------|------------|
| **JSON** | Full design system + component definitions as structured IR |
| **SKILL.md** | Markdown spec for coding agents (Claude Code, Cursor, etc.) |
| **SKILL ZIP** | Bundled archive with dual-theme tokens, analysis log, and modular skill files |
| **HTML** | Standalone preview page with all components rendered |

## Project Structure

```
src/
├── components/
│   ├── steps/     # 6-step wizard (Upload → Scan → Colors → Annotate → Processing → Result)
│   └── ui/        # Shared UI (WizardBar, DropdownMenu, ActionFooter)
├── services/      # Business logic (AI, color extraction, DS builder, renderer, export)
├── stores/        # Pinia stores (pipeline, settings, rateLimit)
└── data/          # Component types, metadata, skeletons, i18n, constants
worker/            # Cloudflare Worker (rate limiting, R2 image storage, D1 usage log)
docs/              # Design documents
```

## Changelog

| Version | Milestone |
|---------|-----------|
| **v0.1-beta** | Code structure refactoring, dual theme (light/dark) palette generation |
| **v0.0.4** | OpenRouter integration — Hunter Alpha, Grok 4.1 Fast, Qwen 3.5 series |
| **v0.0.3** | Cloudflare Worker integration — rate limiting, R2 image storage, session tokens, Turnstile verification |
| **v0.0.2** | Model selection, dev bypass, debug logging, responsive UI enhancements |
| **v0.0.1** | Initial release — 6-step wizard pipeline, K-means color extraction, 25 component types, multi-provider LLM analysis, JSON / SKILL.md / HTML export |

## Roadmap

- [ ] **Community Gallery** — Browse and explore design systems created by other users
- [ ] **Smart Image Classification** — Auto-detect whether the upload is a UI screenshot or a photo, and conditionally offer the annotation workflow
- [ ] **Stitch SDK Integration** — Evaluate [google/stitch-sdk](https://github.com/google/stitch-sdk) for design-to-code generation and assess fit with the existing IR pipeline
- [ ] **npm / npx Installable Package** — Package as an installable CLI skill so users can run `npx img2ui` to generate design systems directly from the terminal

## License

MIT
