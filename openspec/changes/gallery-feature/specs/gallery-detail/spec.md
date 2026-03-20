## ADDED Requirements

### Requirement: Gallery detail page renders full design preview
The system SHALL display a single design at `/gallery/:id` with the following sections in order: (1) author info bar with name, optional title, date, light/dark indicator, and download buttons; (2) UI Kit HTML preview rendered in a sandboxed iframe via `buildUIKitHTML()`; (3) collapsible Design Tokens JSON panel with syntax highlighting and copy button; (4) full 25-component UI Kit render.

#### Scenario: User views a public design detail
- **WHEN** a user navigates to `/gallery/:id` for a public design
- **THEN** the system fetches full `tokens_json` and renders the complete UI Kit preview, JSON panel, and component render

#### Scenario: User views a private design they don't own
- **WHEN** a user navigates to `/gallery/:id` for a private design they do not own
- **THEN** the system displays a "Design not found" message

#### Scenario: Design not found
- **WHEN** a user navigates to `/gallery/:id` with an invalid ID
- **THEN** the system displays a "Design not found" message with a link back to gallery

### Requirement: Gallery detail supports JSON download
The system SHALL provide a "Download JSON" button that downloads the design tokens as a formatted JSON file and increments the download count.

#### Scenario: User downloads JSON
- **WHEN** user clicks "Download JSON" on a design detail page
- **THEN** the browser downloads a `.json` file containing the full design tokens and the download count is incremented

### Requirement: Gallery detail supports HTML download
The system SHALL provide a "Download HTML" button that downloads a standalone HTML preview of the UI Kit.

#### Scenario: User downloads HTML
- **WHEN** user clicks "Download HTML" on a design detail page
- **THEN** the browser downloads a self-contained `.html` file with the rendered UI Kit

### Requirement: Gallery detail JSON panel is collapsible
The Design Tokens JSON panel SHALL be collapsed by default. Users MAY expand it to view the full JSON with syntax highlighting. A copy button SHALL copy the JSON to clipboard.

#### Scenario: User expands and copies JSON
- **WHEN** user clicks expand on the JSON panel then clicks copy
- **THEN** the JSON panel expands to show highlighted tokens and the full JSON is copied to clipboard
