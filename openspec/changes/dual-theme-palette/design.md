## Context

img2ui currently derives a single design system (DS) from each uploaded image. The `isDark` flag is set by `imgAvgLum < 128` in `dsBuilder.js`, and this single boolean propagates through 60+ ternary expressions in `uiKitRenderer.js`. Users get either a Light or Dark kit — never both.

The color pipeline is: `extractColors` → `autoAssignSlots` → `buildDS` → `renderFullKit`. All four stages assume a single theme.

Step 2 (StepScan) displays 6 animated task items, but only 3 have real implementations (color extraction, luminance detection, token generation). Step 3 (StepColors) uses native `<select>` elements for color slot assignment with no visual color preview.

## Goals / Non-Goals

**Goals:**
- Generate dual Light/Dark palettes from a single set of extracted brand colors
- Ensure WCAG contrast ratio safety (≥3.0:1) automatically when deriving themed palettes
- Allow independent editing of Light and Dark palettes in Step 3
- Tab-based Light/Dark preview switching in StepResult (cover + full kit)
- Unified export with theme × format selection
- Replace native `<select>` with custom dropdown showing color swatches
- Clean up Step 2 to reflect only real operations

**Non-Goals:**
- Vision LLM-assisted color extraction (deferred to phase 2)
- Auto-sync between Light and Dark palettes when editing (palettes are independent after derivation)
- CSS custom properties / dark mode toggle in exported HTML (exports are single-theme snapshots)
- Redesigning the annotation or processing steps

## Decisions

### 1. Dual DS objects instead of a single toggleable DS

**Decision**: Store two separate DS objects (`DS_light`, `DS_dark`) in the pipeline store. Each is a complete, independent DS with its own `isDark`, `colors`, `shadows`, and `semanticTokens`.

**Why**: `uiKitRenderer.js` already branches on `DS.isDark` in 60+ places. By feeding it a complete DS with the correct `isDark` value, we get correct Light/Dark rendering with zero changes to the renderer. A single DS with a "toggle" would require runtime swapping of colors, shadows, and semantic tokens — more complex and error-prone.

**Alternative considered**: Single DS with a `theme` overlay map. Rejected because it would require refactoring the renderer to look up themed values, touching 60+ lines for no benefit.

### 2. Brand colors separated from theme colors in autoAssignSlots

**Decision**: `autoAssignSlots` will return `{ brand: { primary, secondary, accent, success, warning, danger, info }, meta: { lightestHex, darkestHex } }`. Surface, text, and border are no longer assigned here — they are determined by the theme derivation step.

**Why**: Surface/text/border are theme-dependent (Light = white surface + dark text; Dark = dark surface + light text). Extracting them in `autoAssignSlots` was conflating "what colors exist in the image" with "how to use them in a theme." The lightest and darkest extracted colors are passed as metadata for optional use in derivation.

### 3. New `deriveThemePair` service

**Decision**: Create `src/services/deriveThemePair.js` that takes brand colors + extracted color metadata and returns `{ light: colorSlots, dark: colorSlots }`.

Core logic:
- **Light**: `surface=#ffffff`, `text=#1a1a1a`, `border=rgba(#1a1a1a, 0.12)`. Each brand color checked: if `contrastRatio(color, #ffffff) < 3.0` → darken until it meets threshold.
- **Dark**: `surface=#121212`, `text=#f0f0f0`, `border=rgba(#f0f0f0, 0.12)`. Each brand color checked: if `contrastRatio(color, #121212) < 3.0` → lighten until it meets threshold.

**Why**: Centralizes all theme derivation logic. Easy to test in isolation. Clean separation from extraction (what colors exist) and building (what tokens to generate).

### 4. `contrastRatio` utility added to colorUtils

**Decision**: Add `contrastRatio(hex1, hex2)` and `adjustForContrast(color, background, minRatio)` to `colorUtils.js`.

`adjustForContrast` iteratively lightens or darkens the color in 5% L steps (HSL) until the contrast ratio meets the minimum. Cap at 20 iterations to prevent infinite loops. Returns the adjusted hex.

### 5. Custom ColorDropdown component

**Decision**: Single `ColorDropdown.vue` component used for all color slot selections. Props: `modelValue` (current hex), `options` (array of `{hex, label?}`), `allowCustom` (boolean). Emits `update:modelValue`.

Desktop: absolute-positioned dropdown below trigger. Mobile (≤768px): same dropdown but full-width with larger touch targets (44px min height per option). Click-outside or Esc to close. Each option shows a 20×20 color swatch + hex code.

"Custom" option opens the hidden `<input type="color">` (same pattern as current implementation).

**Why**: Native `<select>` cannot render color swatches. A custom component keeps the existing interaction pattern (click slot → pick color) while adding visual feedback.

### 6. Pipeline store changes

**Decision**: Add to pipeline store:
- `lightColorSlots` (ref, Object) — Light theme color slots
- `darkColorSlots` (ref, Object) — Dark theme color slots
- `DS_light` (ref, Object) — Light design system
- `DS_dark` (ref, Object) — Dark design system
- `activeTheme` (ref, `'light'` | `'dark'`) — which tab is active, initialized from `imgAvgLum < 128 ? 'dark' : 'light'`
- `activeDS` (computed) — returns `DS_light` or `DS_dark` based on `activeTheme`

`buildDS_action()` calls `buildDS()` twice: once with `lightColorSlots` (force `imgAvgLum=200` to get `isDark=false`), once with `darkColorSlots` (force `imgAvgLum=50` to get `isDark=true`).

Existing `DS` ref and `colorSlots` ref kept as computed aliases to `activeDS` / active color slots for backward compatibility with any code that reads them.

### 7. StepResult tab design

**Decision**: Simple tab bar `[☀ Light] [● Dark]` above the cover section. Switching tabs sets `pipelineStore.activeTheme`, which causes `activeDS` to reactively update, and all computed properties (uiKitHTML, coverBg, etc.) re-derive.

### 8. Export panel

**Decision**: Replace the current 3 separate download buttons with a single "Export" button that opens a dropdown/popover containing:
- Theme selector: radio buttons `○ Light  ○ Dark`
- Format selector: radio buttons `○ JSON  ○ SKILL.md  ○ HTML`
- Download button

Download calls existing `downloadService` functions with the selected theme's DS.

## Risks / Trade-offs

- **Double DS build time**: Building two DS objects instead of one. → Mitigation: `buildDS` is pure computation on small data, takes <1ms. Negligible.
- **Palette editing UX complexity**: Two editable palettes may feel overwhelming. → Mitigation: Clear visual separation (Light section with white bg, Dark section with dark bg), making each palette's context self-evident.
- **Brand color divergence**: After independent editing, Light and Dark palettes may drift far apart. → Accepted trade-off: Users have full control. Re-running auto-derivation is always available as a reset.
- **`autoAssignSlots` return shape change**: Breaking internal API. → Mitigation: Only called in `pipeline.js` (one call site). Update the consumer in the same PR.
