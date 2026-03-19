## ADDED Requirements

### Requirement: Full-screen overlay modal for export
The export panel SHALL be a centered overlay modal with a semi-transparent backdrop, replacing the current popover. The modal SHALL close when clicking the backdrop or the close button.

#### Scenario: Opening the modal
- **WHEN** user clicks the Export button on step 7
- **THEN** a full-screen overlay appears with a centered modal card containing theme selector, format list, and download button

#### Scenario: Closing via backdrop
- **WHEN** user clicks the semi-transparent backdrop area outside the modal card
- **THEN** the modal closes without triggering any export

#### Scenario: Closing via close button
- **WHEN** user clicks the ✕ button in the modal header
- **THEN** the modal closes without triggering any export

### Requirement: Format options displayed as individual rows
Each export format SHALL be displayed as its own selectable row/card with: an icon, a format name, and a one-line description. The five formats are: JSON, SKILL.md, SKILL ZIP, HTML Preview, DESIGN.md.

#### Scenario: All formats visible
- **WHEN** the export modal is open
- **THEN** all five format options are visible, each on its own row with icon, name, and description

#### Scenario: Active format indication
- **WHEN** user selects a format
- **THEN** the selected row SHALL show a distinct active state (accent border and/or background highlight) differentiating it from unselected rows

#### Scenario: DESIGN.md badge
- **WHEN** the export modal is open
- **THEN** the DESIGN.md format row SHALL display a badge indicating "for Google Stitch"

### Requirement: Theme selector in modal
The modal SHALL include a Light/Dark theme toggle that determines which design system variant is exported.

#### Scenario: Theme toggle
- **WHEN** user toggles theme to Dark
- **THEN** the export SHALL use the dark design system tokens regardless of the currently viewed theme

### Requirement: Download action
The modal SHALL include a Download button that triggers the export in the selected format and theme, then closes the modal.

#### Scenario: Successful download
- **WHEN** user clicks Download with a format and theme selected
- **THEN** the file downloads and the modal closes

### Requirement: Mobile responsiveness
The modal SHALL work on mobile viewports (≤768px) with the card taking near-full width and format rows remaining easy to tap.

#### Scenario: Mobile layout
- **WHEN** viewport width is ≤768px
- **THEN** modal card SHALL use near-full width (with small margin) and format rows SHALL have adequate tap targets (min 44px height)

### Requirement: i18n support
All modal text (title, format names, descriptions, button labels) SHALL support zh/en/ja translations via the existing `i18n.js` system.

#### Scenario: Chinese language
- **WHEN** user language is set to zh
- **THEN** all modal labels and descriptions SHALL display in Traditional Chinese
