## 1. DESIGN.md Export Function

- [x] 1.1 Add `describeColor(hex)` helper in `downloadService.js` — HSL-based hue naming + lightness/saturation qualifiers
- [x] 1.2 Add `buildDesignMD(DS, annotations, holisticResult)` function that outputs the 6-section Stitch-compatible markdown
- [x] 1.3 Add `downloadDesignMD()` wrapper that calls buildDesignMD and triggers file download

## 2. Export Modal UI

- [x] 2.1 Replace the popover template in `ActionFooter.vue` with overlay modal markup (backdrop + centered card + close button)
- [x] 2.2 Implement format row cards — each row: icon, name, description, optional badge; click to select
- [x] 2.3 Add DESIGN.md as fifth format option with "for Google Stitch" badge
- [x] 2.4 Wire up `doExport()` to handle `exportFormat === 'design-md'` case

## 3. Styling

- [x] 3.1 Replace `af-export-panel` / `af-export-radio` CSS with modal overlay styles (backdrop, card, format rows, active state)
- [x] 3.2 Add mobile responsive styles for modal (near-full width at ≤768px, adequate tap targets)

## 4. i18n

- [x] 4.1 Add i18n keys in `i18n.js` for: modal title, DESIGN.md format name, DESIGN.md description, badge text, and any new labels (zh/en/ja)

## 5. Verify

- [x] 5.1 Test all 5 export formats download correctly (JSON, SKILL.md, SKILL ZIP, HTML, DESIGN.md)
- [x] 5.2 Test modal open/close (backdrop click, ✕ button)
- [x] 5.3 Test theme toggle applies to DESIGN.md output
- [x] 5.4 Test mobile layout
