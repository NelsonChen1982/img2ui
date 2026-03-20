## 1. DB Schema & Migration

- [x] 1.1 Create migration SQL adding `visibility`, `title`, `primary_color`, `color_family`, `is_dark`, `download_count` columns to `design_tokens`
- [x] 1.2 Create indexes: `idx_tokens_gallery(visibility, created_at)`, `idx_tokens_color_family(color_family)`, `idx_tokens_downloads(visibility, download_count)`
- [x] 1.3 Update `schema.sql` with new columns and indexes for fresh installs

## 2. Worker API — save-result Modifications

- [x] 2.1 Add `hexToHsl()` and `computeColorFamily()` helper functions to Worker
- [x] 2.2 Modify `saveDesignTokens()` to accept and store `title`, `visibility`, `primary_color`, `color_family`, `is_dark`
- [x] 2.3 Modify `POST /api/save-result` handler to extract `title`, `visibility` from body and compute denormalized fields from tokens

## 3. Worker API — Gallery Endpoints

- [x] 3.1 Implement `GET /api/gallery` with pagination (`page`, `limit`), sort (`latest`, `downloads`), and filters (`hue`, `theme`, `mine`). Return lightweight items with `colors` subset + `total` count
- [x] 3.2 Implement `GET /api/gallery/:id` returning full design data. Enforce visibility: private designs only returned to owner
- [x] 3.3 Implement `POST /api/gallery/:id/download` incrementing `download_count` and returning updated count
- [x] 3.4 Implement `PATCH /api/gallery/:id` for owner to update `visibility` and/or `title`. Require session token + ownership check

## 4. Frontend — vue-router Setup

- [x] 4.1 Install `vue-router@4`
- [x] 4.2 Create `src/router.js` with routes: `/` (WizardView), `/gallery` (GalleryList), `/gallery/:id` (GalleryDetail)
- [x] 4.3 Refactor `App.vue` to use `<router-view>` instead of step-based `v-if`. Keep shared layout (header, nav, auth modal, toast)
- [x] 4.4 Extract current wizard flow into `src/views/WizardView.vue` preserving all step logic and `pipelineStore.step` navigation

## 5. Frontend — Gallery List Page

- [x] 5.1 Create `src/components/ui/GalleryCard.vue` — color swatch grid, author name, optional title + date, light/dark indicator, View/Download buttons
- [x] 5.2 Create `src/views/GalleryList.vue` — page layout with filter bar (color pills, theme dropdown, sort dropdown, My Designs toggle), card grid, and Load More button
- [x] 5.3 Wire up API calls: fetch gallery list with filter/sort/pagination params, handle loading and empty states
- [x] 5.4 Implement color family filter pills (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Neutral) with single-select toggle behavior
- [x] 5.5 Implement My Designs toggle (visible only to authenticated users, sends `mine=1` + auth params)

## 6. Frontend — Gallery Detail Page

- [x] 6.1 Create `src/views/GalleryDetail.vue` — single-column layout with author info bar, UI Kit iframe preview, collapsible JSON panel, full UI Kit render
- [x] 6.2 Implement author info section: user name/avatar (or "Anonymous"), title, date, light/dark badge, Download JSON + Download HTML buttons
- [x] 6.3 Implement UI Kit preview: call `buildUIKitHTML(tokens_json)` and render in sandboxed iframe
- [x] 6.4 Implement collapsible JSON panel with syntax highlighting (reuse StepResult's highlighting logic) and copy-to-clipboard
- [x] 6.5 Implement download actions: JSON file download and HTML preview download, both calling `POST /api/gallery/:id/download` to increment count
- [x] 6.6 Handle 404 / private design not found state with back-to-gallery link

## 7. Frontend — Design Visibility

- [x] 7.1 Add visibility toggle (Public/Private) to `StepResult.vue`, visible only for authenticated users after design is saved
- [x] 7.2 Wire toggle to call `PATCH /api/gallery/:id` with `currentDesignId` on change
- [x] 7.3 Modify `StepResult.vue` save-result calls to include `title` (from `uiKitName`) and `visibility` in request body
- [x] 7.4 Add visibility toggle to `GalleryCard.vue` for owner's own designs (shown when My Designs filter is active)

## 8. Frontend — Landing Page Marquee

- [x] 8.1 Create marquee component in `StepUpload.vue` (or extract to `src/components/ui/GalleryMarquee.vue`) — compact color-swatch cards with CSS `@keyframes` horizontal auto-scroll
- [x] 8.2 Fetch `GET /api/gallery?limit=12&sort=latest` on mount, render cards, add "View Gallery →" link
- [x] 8.3 Implement hover-to-pause behavior on marquee animation
- [x] 8.4 Click on marquee card navigates to `/gallery/:id`

## 9. Polish & Integration

- [x] 9.1 Add Gallery link to App.vue header/nav (alongside existing navigation)
- [x] 9.2 Add i18n entries for gallery UI strings (zh/en/ja) in `src/data/i18n.js`
- [x] 9.3 Verify routing: direct URL access to `/gallery` and `/gallery/:id` works (Vite dev server + production build)
- [x] 9.4 Test full flow: create design → appears in gallery → view detail → download → toggle visibility
