## Why

The current pipeline produces a single UI Kit locked to the source image's detected luminance (light or dark). Users cannot preview or export both themes. By generating dual Light/Dark palettes from extracted colors and letting users switch between them, img2ui delivers twice the value from a single screenshot while eliminating the fragile `imgAvgLum < 128` heuristic that currently determines the entire kit's appearance.

## What Changes

- **Dual palette derivation**: After color extraction, automatically generate a Light palette (white surface, dark text) and a Dark palette (dark surface, light text) from the same brand colors, with WCAG contrast-ratio enforcement.
- **Step 2 cleanup**: Remove fake task items (layout structure, typography levels, component semantics) that have no backing implementation; keep only real tasks with evenly-spaced animation timing.
- **Step 3 redesign**: Show extracted palette (read-only) at top, then Light palette and Dark palette side-by-side (both editable). Replace native `<select>` dropdowns with a custom dropdown component showing color swatches + hex, mobile-friendly (44px touch targets).
- **StepResult dual-tab preview**: Add Light/Dark tab switcher controlling both the cover hero and the full UI Kit component list. Each tab renders its own DS → Kit.
- **Export redesign**: Single export button opening a panel to choose theme (Light/Dark) and format (JSON / SKILL.md / HTML), then downloads the selected combination.
- **`isDark` decoupled from image**: Light DS always has `isDark=false`, Dark DS always has `isDark=true` — structurally defined, not inferred from luminance. `imgAvgLum` retained only to decide which tab shows first by default.

## Capabilities

### New Capabilities
- `dual-theme-derivation`: Derive Light and Dark color palettes from extracted brand colors with automatic contrast-ratio adjustment (darken/lighten to meet WCAG 3.0:1 minimum).
- `custom-color-dropdown`: Reusable Vue dropdown component replacing native `<select>` for color slot selection — shows color swatch + hex, supports color picker fallback, responsive (desktop absolute dropdown / mobile-friendly layout).
- `theme-tab-preview`: Tab-based Light/Dark switching in StepResult controlling cover preview and full UI Kit render.
- `theme-aware-export`: Export panel allowing user to select theme (Light/Dark) × format (JSON/SKILL.md/HTML) before download.

### Modified Capabilities
_(none — no existing specs are affected)_

## Impact

- **Services**: New `deriveThemePair.js` service; minor changes to `autoAssignSlots.js` (separate brand colors from surface/text); `dsBuilder.js` called twice (once per theme); `downloadService.js` accepts theme parameter.
- **Stores**: `pipeline.js` gains `DS_light` / `DS_dark` refs, `activeTheme` ref, and updated `buildDS_action` to produce both.
- **Components**: `StepScan.vue` (trim task list), `StepColors.vue` (dual palette + custom dropdown), `StepResult.vue` (tab switcher + export panel). New `ColorDropdown.vue` component.
- **Data**: `i18n.js` updated for new labels (Light/Dark tabs, export panel, palette section headers).
- **No new dependencies** — pure JS contrast-ratio math, Vue 3 Composition API.
