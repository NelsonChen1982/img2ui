## ADDED Requirements

### Requirement: Single export button with theme and format selection
StepResult SHALL display a single "Export" button. Clicking it SHALL open a panel/popover where the user selects a theme (Light or Dark) and a format (JSON, SKILL.md, or HTML), then confirms the download.

#### Scenario: Export Light theme as JSON
- **WHEN** user opens the export panel, selects "Light" theme and "JSON" format, and clicks download
- **THEN** the system downloads a JSON file containing the Light design system data

#### Scenario: Export Dark theme as HTML
- **WHEN** user opens the export panel, selects "Dark" theme and "HTML" format, and clicks download
- **THEN** the system downloads an HTML file rendering the Dark UI Kit

#### Scenario: Export panel defaults to active tab theme
- **WHEN** user is viewing the "Dark" tab and opens the export panel
- **THEN** the "Dark" theme option is pre-selected

### Requirement: Export uses selected theme's DS
The export function SHALL use the design system object corresponding to the selected theme (`DS_light` or `DS_dark`), NOT the currently previewed tab.

#### Scenario: Export different theme than preview
- **WHEN** user is previewing Light tab but selects Dark in export panel
- **THEN** the downloaded file contains Dark theme data

### Requirement: Replace separate download buttons
The current three separate download buttons (JSON, SKILL.md, HTML) SHALL be replaced by the single unified export button with panel.

#### Scenario: Old buttons removed
- **WHEN** StepResult renders
- **THEN** there are no separate JSON, SKILL.md, or HTML download buttons
- **THEN** there is exactly one "Export" button that opens the selection panel
