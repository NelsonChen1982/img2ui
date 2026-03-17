# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

img2ui converts screenshots/images into design systems with 25 rendered UI component types. It extracts colors via K-means quantization, derives typography/spacing/radius tokens, and optionally uses multi-provider Vision LLMs (Claude, GPT-4o, Gemini) to analyze annotated component regions.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
```

No test runner or linter is configured.

## Architecture

**Stack:** Vue 3 (Composition API) + Pinia + Vite 8. Vanilla CSS. No router — single-page wizard flow.

### Pipeline (6-step wizard)

```
Upload → Scan/AI → Colors → Annotate → Processing → Result
(steps: 1, 2, 3, 5, 6, 7 — step 4 was removed, IDs kept for compat)
```

### State Management (3 Pinia stores)

- **pipeline** (`src/stores/pipeline.js`) — Wizard navigation, image data, extracted colors, color slots, annotations, design system object. Central orchestrator.
- **settings** (`src/stores/settings.js`) — Persists to localStorage/cookies with `pic2ui_*` prefix. Language (zh/en/ja), CSS framework choice, LLM provider, email, dev-mode API keys.
- **rateLimit** (`src/stores/rateLimit.js`) — Daily usage tracking (5/day limit), syncs with optional Cloudflare Worker.

No prop drilling — all components access stores directly.

### Services (`src/services/`)

- **aiService.js** (1228 lines) — Core LLM orchestration. Direct browser-to-API calls. 3-tier fallback: grouped analysis → individual analysis → pixel-based local heuristic. Builds prompts with component metadata hints and variation axis context.
- **colorExtraction.js** — K-means quantization on 160×160 downsampled canvas → 7 dominant colors.
- **autoAssignSlots.js** — Heuristic HSL scoring to map extracted colors to semantic slots (primary, secondary, accent, success, warning, danger, info, surface, text, border).
- **dsBuilder.js** — Derives full design system from color slots + image dimensions: typography scale (6 levels), spacing (8 values), radius tokens, shadows. Scale factor computed from aspect ratio.
- **uiKitRenderer.js** — Renders 25 component types as HTML using design tokens.
- **downloadService.js** — Exports to JSON IR, SKILL.md (agent-friendly), and standalone HTML preview.
- **colorUtils.js** — Hex/RGB/luminance conversion utilities.

### Data (`src/data/`)

- **compTypes.js** — 25 component type definitions with IDs and labels.
- **compMeta.js** — Per-component metadata: variant lists, slot configs, size options.
- **compSkeleton.js** — Structural templates for each component type.
- **constants.js** — Variation axis hints per component (variant vs state vs semantic), used to guide AI analysis.
- **i18n.js** — Translations (zh/en/ja) with `t(obj, lang)` helper.

### Components

- **Step components** (`src/components/steps/Step*.vue`) — One per wizard step. Canvas-based annotation in StepAnnotate.
- **UI components** (`src/components/ui/`) — WizardBar, DropdownMenu, ActionFooter.

### Worker (`worker/`)

Optional Cloudflare Worker for server-side rate limiting. Requires KV namespaces (RATE_LIMIT, EMAIL_LOG) and secrets (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY).

## Key Design Decisions

**AI fallback cascade:** Grouped comparison (batch same-type annotations) → individual analysis → enhanced pixel heuristic. Enables graceful degradation without vendor lock-in.

**Design system is computed, not configured:** Colors extracted from image pixels, typography/spacing/shadows derived from image dimensions and luminance. The DS is a function of the input image.

**Variation axis hints** in `constants.js` tell the AI how to distinguish component variations (e.g., buttons vary by variant/state, alerts vary by semantic meaning). Each type has `axis`, `weight`, `fallback`, and `hint` fields.

**Canvas annotation system:** Annotations store coordinates, visual analysis (dominant colors, estimated radius, thumbnail), AI-generated CSS, and group relationship metadata from comparative analysis.

**Path alias:** `@` → `./src` (configured in vite.config.js).

## Conventions

- Components: PascalCase (`StepUpload`, `WizardBar`)
- Stores: camelCase (`pipeline`, `settings`)
- Services: camelCase domain prefix (`aiService`, `colorExtraction`)
- Constants: UPPER_SNAKE_CASE (`SLOT_IDS`, `DAILY_LIMIT`)
- All source is ES modules (package.json `"type": "module"`)
- Styling: vanilla CSS in `src/assets/main.css` + inline styles for dynamic values
