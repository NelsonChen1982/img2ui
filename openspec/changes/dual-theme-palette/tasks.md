## 1. Color Utilities & Theme Derivation

- [x] 1.1 Add `contrastRatio(hex1, hex2)` and `adjustForContrast(color, background, minRatio)` to `src/services/colorUtils.js`
- [x] 1.2 Create `src/services/deriveThemePair.js` — takes brand colors + meta, returns `{ light: colorSlots, dark: colorSlots }` with WCAG contrast enforcement
- [x] 1.3 Refactor `autoAssignSlots` in `src/services/autoAssignSlots.js` — return `{ brand, meta }` instead of flat colorSlots (remove surface/text/border assignment)

## 2. Pipeline Store Updates

- [x] 2.1 Add `lightColorSlots`, `darkColorSlots`, `DS_light`, `DS_dark`, `activeTheme` refs to `src/stores/pipeline.js`
- [x] 2.2 Add `activeDS` computed that returns `DS_light` or `DS_dark` based on `activeTheme`
- [x] 2.3 Update `buildDS_action()` to call `buildDS` twice (once per theme), passing forced luminance values
- [x] 2.4 Update `autoAssignSlots` call site to consume new `{ brand, meta }` shape and call `deriveThemePair`
- [x] 2.5 Add backward-compatible `DS` and `colorSlots` computed aliases pointing to active theme
- [x] 2.6 Initialize `activeTheme` from `imgAvgLum` (`< 128` → `'dark'`, else `'light'`)

## 3. Step 2 Cleanup

- [x] 3.1 Update `i18n.js` s2.tasks — keep only 3 real items (color extraction, luminance detection, token generation) for all 3 languages
- [x] 3.2 Update `StepScan.vue` — adjust animation delays to be evenly spaced across the total duration

## 4. Custom ColorDropdown Component

- [x] 4.1 Create `src/components/ui/ColorDropdown.vue` — props: `modelValue`, `options`, `allowCustom`; emits `update:modelValue`
- [x] 4.2 Implement dropdown trigger showing current color swatch (20×20px) + hex code
- [x] 4.3 Implement dropdown menu with color swatch + hex per option, plus "Custom" option that opens `<input type="color">`
- [x] 4.4 Implement click-outside and Esc to close
- [x] 4.5 Mobile styles: 44px min touch targets on viewports ≤768px

## 5. Step 3 Redesign

- [x] 5.1 Update `StepColors.vue` — show extracted palette as read-only (remove edit controls: color picker, remove button on extracted colors)
- [x] 5.2 Add Light palette section — editable slots using `ColorDropdown`, bound to `lightColorSlots`
- [x] 5.3 Add Dark palette section — editable slots using `ColorDropdown`, bound to `darkColorSlots`; dark background styling for visual context
- [x] 5.4 Replace all native `<select>` elements with `ColorDropdown` in slot cards
- [x] 5.5 Update `i18n.js` — add labels for Light/Dark palette sections, extracted palette read-only label

## 6. StepResult Theme Tab Preview

- [x] 6.1 Add Light/Dark tab bar to `StepResult.vue`, wired to `pipelineStore.activeTheme`
- [x] 6.2 Update `uiKitHTML` computed to use `pipelineStore.activeDS`
- [x] 6.3 Update `coverBg` / `coverTextColor` computeds to use `pipelineStore.activeDS`
- [x] 6.4 Update `fullJSONOutput` computed to use `pipelineStore.activeDS`
- [x] 6.5 Add i18n labels for Light/Dark tab text

## 7. Export Panel Redesign

- [x] 7.1 Replace 3 separate download buttons with single "Export" button in `StepResult.vue`
- [x] 7.2 Create export popover/panel with theme radio (Light/Dark) + format radio (JSON/SKILL.md/HTML)
- [x] 7.3 Default theme selection to current `activeTheme`
- [x] 7.4 Wire download action to use selected theme's DS (`DS_light` or `DS_dark`) + selected format
- [x] 7.5 Add i18n labels for export panel (theme/format options, button text)

## 8. Integration & Cleanup

- [x] 8.1 Update `dsBuilder.js` `buildDS` to accept optional `forceIsDark` parameter (skip `imgAvgLum` heuristic when provided)
- [x] 8.2 Verify `uiKitRenderer.js` works correctly with both `isDark=true` and `isDark=false` DS objects (no changes expected — existing ternaries handle both cases)
- [x] 8.3 Update `downloadService.js` to accept DS parameter instead of reading from store directly
- [ ] 8.4 Smoke test: upload light image → verify both Light and Dark kits render correctly
- [ ] 8.5 Smoke test: upload dark image → verify default tab is Dark, both kits render correctly
<!-- 8.4 and 8.5 require manual browser testing -->
