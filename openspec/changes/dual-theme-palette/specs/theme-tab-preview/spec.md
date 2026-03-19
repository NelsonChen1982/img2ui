## ADDED Requirements

### Requirement: Light/Dark tab switcher in StepResult
StepResult SHALL display a tab bar with "Light" and "Dark" options. Switching tabs SHALL update both the cover hero section and the full UI Kit component preview to render the selected theme's design system.

#### Scenario: Switch from Light to Dark tab
- **WHEN** user is viewing the Light tab and clicks "Dark"
- **THEN** the cover hero re-renders with Dark theme colors (dark gradient background, light text)
- **THEN** the UI Kit component list re-renders using `DS_dark` (dark backgrounds, light text, dark-mode shadows)

#### Scenario: Switch from Dark to Light tab
- **WHEN** user is viewing the Dark tab and clicks "Light"
- **THEN** the cover hero re-renders with Light theme colors (light/gradient background, dark or contrast text)
- **THEN** the UI Kit component list re-renders using `DS_light` (light backgrounds, dark text, light-mode shadows)

### Requirement: Default tab matches image luminance
The initially active tab SHALL be determined by the source image's average luminance. Dark images default to the Dark tab; light images default to the Light tab.

#### Scenario: Dark image defaults to Dark tab
- **WHEN** uploaded image has `imgAvgLum < 128`
- **THEN** StepResult opens with the "Dark" tab active

#### Scenario: Light image defaults to Light tab
- **WHEN** uploaded image has `imgAvgLum >= 128`
- **THEN** StepResult opens with the "Light" tab active

### Requirement: Tab state persists during session
The selected tab SHALL persist when navigating away from StepResult (e.g., clicking "Edit Colors") and returning.

#### Scenario: Tab persists after editing colors
- **WHEN** user selects "Dark" tab, then clicks "Edit Colors" to go back to Step 3, then returns to StepResult
- **THEN** the "Dark" tab is still selected
