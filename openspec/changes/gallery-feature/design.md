## Context

img2ui is a single-page Vue 3 wizard app (no router). Design tokens are already saved to D1 via `POST /api/save-result` with `tokens_json`, `annotations_json`, `image_key`, and `user_id`. The UI Kit is rendered client-side by `buildUIKitHTML(DS)` which produces a standalone HTML string. There is no way to browse saved designs.

Current navigation uses `pipelineStore.step` with `v-if` in `App.vue` to switch between 6 wizard steps.

## Goals / Non-Goals

**Goals:**
- Public gallery browsable by anyone, filterable by color family / theme / sort order
- Detail page that re-renders the full UI Kit from stored `tokens_json`
- Personal "My Designs" view for logged-in users with visibility management
- Visibility toggle (public/private) on StepResult and in Gallery
- Landing page marquee showcasing recent community designs
- vue-router for clean URL structure (`/`, `/gallery`, `/gallery/:id`)

**Non-Goals:**
- Full-text search of design tokens
- Social features (likes, comments, sharing)
- Server-side rendering / pre-rendering of UI Kit thumbnails (v1 uses color swatches)
- iframe-based mini previews on gallery cards (future enhancement)
- Landing page redesign (separate future change)

## Decisions

### 1. vue-router integration strategy

**Decision:** Add `vue-router@4` with history mode. Three routes: `/` (wizard), `/gallery` (list), `/gallery/:id` (detail).

**Alternatives considered:**
- Hash-based routing without vue-router — simpler but bad for SEO on public gallery, not shareable
- Keep wizard as-is and only add router for gallery — creates two navigation systems

**Approach:**
- Create `src/router.js` with route definitions
- `App.vue` replaces step-based `v-if` with `<router-view>`
- Extract current wizard flow into `src/views/WizardView.vue` (keeps `pipelineStore.step` logic internally)
- Gallery pages as `src/views/GalleryList.vue` and `src/views/GalleryDetail.vue`
- Shared layout (header/nav) stays in `App.vue`

### 2. Gallery card thumbnail — color swatches (v1)

**Decision:** Gallery cards show a structured color swatch grid from `tokens_json.colors`, not an iframe or screenshot.

```
┌────────────────────────────┐
│ primary    │  secondary    │   ← large blocks
│            │               │
├──────┬─────┬──────┬────────┤
│accent│ suc │ warn │ danger │   ← small blocks
└──────┴─────┴──────┴────────┘
│   surface   │    text      │   ← bottom strip
└─────────────┴──────────────┘
```

**Rationale:** Zero extra infrastructure, fast to render, visually distinctive. Can upgrade to iframe mini-preview later.

### 3. Color family classification

**Decision:** Compute `color_family` from primary color's HSL hue at save time, store as denormalized column.

| Hue range | Family |
|-----------|--------|
| 0-30, 330-360 | red |
| 30-60 | orange |
| 60-90 | yellow |
| 90-150 | green |
| 150-210 | cyan |
| 210-270 | blue |
| 270-330 | purple |
| sat < 10% | neutral |

**Stored in:** `design_tokens.color_family TEXT` — indexed for WHERE clause filtering.

### 4. Gallery API design

**Decision:** All gallery endpoints live in the existing Worker (`worker-rate-limit.js`), no new Worker.

```
GET  /api/gallery?page=1&limit=20&sort=latest|downloads&hue=red&theme=light|dark|all&mine=1
GET  /api/gallery/:id
POST /api/gallery/:id/download
PATCH /api/gallery/:id   { visibility, title }
```

- `GET /api/gallery` returns lightweight payloads: `id`, `title`, `user_name`, `user_avatar`, `primary_color`, `color_family`, `is_dark`, `colors_json` (just the colors object, not full tokens), `download_count`, `created_at`.
- `GET /api/gallery/:id` returns full `tokens_json`, `annotations_json`, `holistic_json` for complete re-render.
- `PATCH` requires session token auth + ownership check.
- Pagination via `page` + `limit` with total count for "Load More".

### 5. DB schema changes

```sql
ALTER TABLE design_tokens ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE design_tokens ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN primary_color TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN color_family TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN is_dark INTEGER DEFAULT 0;
ALTER TABLE design_tokens ADD COLUMN download_count INTEGER DEFAULT 0;

CREATE INDEX idx_tokens_gallery ON design_tokens(visibility, created_at DESC);
CREATE INDEX idx_tokens_color_family ON design_tokens(color_family);
CREATE INDEX idx_tokens_downloads ON design_tokens(visibility, download_count DESC);
```

Existing rows get defaults — Gallery queries use `WHERE visibility = 'public'` which gracefully includes old rows (defaulting to public).

### 6. `save-result` modifications

**Decision:** Modify the existing `POST /api/save-result` to accept and compute new fields.

- Accept `title` and `visibility` in request body
- Compute `primary_color` from `tokens.colors.primary`
- Compute `is_dark` from `tokens.isDark`
- Compute `color_family` from primary color HSL hue (server-side, using same hex→HSL logic)
- Store all in `design_tokens` row

### 7. Marquee data source

**Decision:** Marquee on StepUpload calls `GET /api/gallery?limit=12&sort=latest` — same endpoint, no separate API. Renders compact color-swatch cards with CSS `@keyframes` horizontal scroll animation.

### 8. Gallery Detail re-rendering

**Decision:** Detail page calls `buildUIKitHTML()` client-side from stored `tokens_json`. The same renderer used in StepResult.

- Top section: author info, meta, download buttons
- UI Kit preview in sandboxed iframe (`srcdoc`, `sandbox="allow-same-origin"`)
- Collapsible JSON panel (reuse syntax highlighting from StepResult)
- Full UI Kit render below

## Risks / Trade-offs

- **[Large tokens_json in D1]** Each row ~50-100KB. Gallery list queries return only `colors` subset to keep payloads small. → Mitigation: `colors_json` computed column or extract at query time via `json_extract`.
- **[iframe performance on detail page]** Full UI Kit in iframe is heavy. → Mitigation: single page, lazy load, acceptable for detail view.
- **[Migration on existing data]** Old rows lack `color_family`, `is_dark`, `title`. → Mitigation: defaults are safe; can run backfill migration script. Gallery treats empty `color_family` as "neutral" or excludes from hue filter.
- **[No router SSR]** Gallery pages won't be server-rendered for SEO. → Mitigation: acceptable for v1; can add prerendering later.
- **[Download count gaming]** No auth required for download increment. → Mitigation: rate-limit by IP in future if needed; v1 accepts this.
