## Why

The current export UI is a small popover anchored to the footer button, which cramps format options into a single row. Adding DESIGN.md (for Google Stitch) as a fifth export format will make this worse. A full-screen modal overlay gives each format its own row with icon, title, and description — improving discoverability and making room for future formats. This also positions img2ui as an upstream design-system source for the Stitch ecosystem.

## What Changes

- Replace the popover-style export panel with a centered overlay modal (backdrop + card)
- Each export format gets its own selectable row: icon, name, one-line description
- Add new export format: **DESIGN.md** — natural-language design system file compatible with Google Stitch's `design-md` skill
- DESIGN.md output translates img2ui's precise tokens (hex colors, px values) into Stitch's descriptive semantic language (e.g., "Warm Barely-There Cream (#FCFAFA) — surface backgrounds")
- Theme selector (Light / Dark) remains as toggle inside the modal
- Badge on DESIGN.md row: "for Google Stitch"

## Capabilities

### New Capabilities
- `design-md-export`: Generate DESIGN.md files in Google Stitch's semantic format from img2ui's extracted design tokens (colors, typography, spacing, radius, shadows, style DNA)
- `export-modal`: Full-screen overlay modal for export with per-format rows, descriptions, and theme selection

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- **UI**: `ActionFooter.vue` — modal replaces popover; new CSS in `main.css`
- **Services**: `downloadService.js` — new `buildDesignMD()` and `downloadDesignMD()` functions
- **i18n**: `i18n.js` — new keys for DESIGN.md format label/description and modal title
- **No breaking changes** — existing export formats (JSON, SKILL.md, SKILL ZIP, HTML) remain identical
