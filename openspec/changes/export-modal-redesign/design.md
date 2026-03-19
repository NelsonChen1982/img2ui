## Context

The export panel is currently an upward-popping popover anchored to the Export button in `ActionFooter.vue`. Format options (JSON, SKILL.md, SKILL ZIP, HTML) are radio buttons squeezed into a flex row. Adding a fifth format (DESIGN.md for Google Stitch) will further cramp the layout. The popover uses `af-export-*` CSS classes in `main.css` and all export logic lives in `ActionFooter.vue` + `downloadService.js`.

## Goals / Non-Goals

**Goals:**
- Replace popover with a centered overlay modal that works well on both desktop and mobile
- Each format occupies its own row with icon, title, and description
- Add DESIGN.md export that translates img2ui tokens into Stitch's natural-language semantic format
- Maintain all existing export formats with identical behavior

**Non-Goals:**
- Extracting the modal into a reusable generic modal component (not needed elsewhere yet)
- Adding Stitch MCP server integration or SDK calls
- Changing the design system data pipeline — only adding a new output format

## Decisions

### 1. Modal lives inside ActionFooter.vue (not a new component)

The modal is tightly coupled to export state and logic already in ActionFooter. Extracting it would mean prop-drilling or event-busing for `exportTheme`, `exportFormat`, `doExport()`. Keep it co-located.

**Alternative considered:** Separate `ExportModal.vue` component — rejected because there's no reuse case, and the export logic is already 70 lines embedded in ActionFooter.

### 2. DESIGN.md translation approach: template-based with Style DNA enrichment

`buildDesignMD()` will:
1. Map each color slot to a descriptive name using HSL analysis (e.g., `primary #3B82F6` → "Vibrant Sky Blue (#3B82F6) — primary actions and interactive elements")
2. Convert typography px/weight values to natural descriptions
3. Incorporate `holistic.styleDNA` data if available for the Visual Theme section
4. Use radius/shadow tokens for Component Stylings section

This is a pure function in `downloadService.js` — no AI calls, no external dependencies.

**Alternative considered:** Calling an LLM to generate descriptive language — rejected because it adds latency, cost, and API dependency for what can be done with a lookup table + HSL heuristics.

### 3. Modal styling: CSS overlay with backdrop-filter

Use `position: fixed; inset: 0` backdrop with `background: rgba(0,0,0,0.5)` and a centered card. Close on backdrop click or ✕ button. This follows the same pattern as other web modals without needing a library.

### 4. Format rows as selectable cards

Each format is a clickable row/card with: left icon, title + badge area, description below. Active state shown with left border accent + subtle background. This replaces the inline radio buttons.

### 5. DESIGN.md follows Stitch's 6-section structure

Output sections: Project Header, Visual Theme & Atmosphere, Color Palette & Roles, Typography Rules, Component Stylings, Layout Principles. This matches what Stitch's `design-md` skill produces, ensuring compatibility.

## Risks / Trade-offs

- **Color naming heuristic may not match Stitch's aesthetic language perfectly** → Acceptable for v1; users can edit the .md file. The hex values are always accurate.
- **Modal may feel heavy for a simple export action** → Mitigated by keeping the modal lightweight (no animation library, fast open/close). The extra space pays off with 5 formats.
