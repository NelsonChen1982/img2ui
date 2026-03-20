## Why

The app saves design tokens to D1 on every generation but provides no way to browse, discover, or revisit them. Adding a public Gallery unlocks community showcase (SEO, social proof, inspiration) and personal history (re-download, manage visibility). A landing-page marquee of recent designs also drives engagement from the upload page.

## What Changes

- **Public Gallery page** (`/gallery`) — paginated grid of design cards with color-swatch thumbnails, filterable by color family, light/dark theme, and sortable by latest or download count. Logged-in users can toggle "My Designs" filter.
- **Gallery Detail page** (`/gallery/:id`) — single-column view: author info + meta, UI Kit HTML preview (iframe), collapsible Design Tokens JSON with copy, and full 25-component UI Kit render.
- **vue-router integration** — add `vue-router` to replace the current `v-if step` navigation. Wizard flow moves under `/`, Gallery under `/gallery` and `/gallery/:id`.
- **Visibility control** — each design defaults to `public`. Users can toggle to `private` on the StepResult page after generation, or from their own designs in Gallery.
- **Download tracking** — `download_count` column on `design_tokens`; incremented via `POST /api/gallery/:id/download`.
- **Landing page marquee** — bottom of StepUpload shows a CSS-animated horizontal scroll of recent public designs (color-swatch cards), linking to Gallery.
- **DB schema expansion** — new columns on `design_tokens`: `visibility`, `title`, `primary_color`, `color_family`, `is_dark`, `download_count`. New indexes for Gallery queries.
- **Gallery API endpoints** — `GET /api/gallery` (public list + filters), `GET /api/gallery/:id` (detail), `POST /api/gallery/:id/download` (increment), `PATCH /api/gallery/:id` (owner update visibility/title).

## Capabilities

### New Capabilities
- `gallery-list`: Public gallery page with paginated grid, color-swatch cards, color-family/theme/sort filters, and "My Designs" toggle
- `gallery-detail`: Single design detail page with UI Kit preview, collapsible JSON panel, full component render, and download actions
- `gallery-api`: Worker API endpoints for listing, detail, download tracking, and owner updates
- `gallery-marquee`: Landing page marquee component showing recent public designs with auto-scroll
- `design-visibility`: Public/private visibility toggle on StepResult and Gallery, with DB schema support

### Modified Capabilities
<!-- No existing specs are being modified at the requirement level -->

## Impact

- **Frontend**: Add `vue-router` dependency. Restructure `App.vue` to use `<router-view>`. Extract wizard flow into `WizardView.vue`. New pages: `GalleryList.vue`, `GalleryDetail.vue`. New component: `GalleryCard.vue`. Modify `StepUpload.vue` (marquee) and `StepResult.vue` (visibility toggle + send title on save).
- **Worker**: 4 new API routes in `worker-rate-limit.js`. Modify `saveDesignTokens()` to compute and store `color_family`, `is_dark`, `title`, `visibility`. DB migration for new columns + indexes.
- **Dependencies**: `vue-router@4` (new).
- **Data**: Existing `design_tokens` rows will have NULL/default for new columns — Gallery queries should handle gracefully.
