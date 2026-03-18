## ADDED Requirements

### Requirement: Cover Hero section renders at top of Result page
The system SHALL display a Cover Hero section above the existing UI Kit render and JSON panel in Step 7 (Result). The cover SHALL use DS tokens (colors, typo, fonts, radius, shadows) for all visual styling.

#### Scenario: Cover renders with DS tokens
- **WHEN** user reaches Step 7 with a completed design system
- **THEN** a Cover Hero section appears at the top of the page, using DS.colors for background, DS.typo for text sizing, and DS.fonts for font families

### Requirement: Editable UI Kit name with default value
The system SHALL provide an editable text input for the UI Kit name in the cover's left side. The default value SHALL be "img2ui UI Kit". The field SHALL be optional — users can keep the default or type a custom name.

#### Scenario: Default name displayed
- **WHEN** user reaches Step 7 without editing the name
- **THEN** the cover title displays "img2ui UI Kit" using DS.typo Display level and DS.fonts.heading

#### Scenario: User edits name
- **WHEN** user modifies the UI Kit name input
- **THEN** the cover title updates immediately to reflect the new name
- **AND** the value is stored in pipeline store's `uiKitName` field

### Requirement: Three icon badges displayed vertically
The system SHALL display three icon badges stacked vertically below the title on the left side. Each badge SHALL use a Font Awesome icon with DS-driven colors. The badges represent: JSON Format, Coding Agent SKILL, and Preview HTML.

#### Scenario: Badges render with DS colors
- **WHEN** the cover is rendered
- **THEN** three badges appear vertically: "JSON Format" (with code/brackets icon), "Coding Agent SKILL" (with bolt/wand icon), "Preview HTML" (with browser/code icon)
- **AND** each badge icon uses a distinct DS color (accent, primary, secondary respectively)

### Requirement: Component preview panel on right side
The system SHALL render a 16:9 aspect ratio panel on the right side of the cover containing a mini layout of 6 auto-selected representative components: navbar, hero, cards (×2), button row, and input + alert. The panel SHALL use CSS `transform: rotate()` and parent `overflow: hidden` to create a tilted bleed effect.

#### Scenario: Preview renders with DS tokens
- **WHEN** the cover is rendered
- **THEN** the right side shows a 16:9 panel with 6 mini components, all styled using DS tokens
- **AND** the panel is rotated (approximately -12deg) with overflow hidden creating a bleed effect

### Requirement: Cover background uses DS-driven colors
The system SHALL use a background derived from DS.colors.primary (at reduced opacity) with a subtle gradient. In dark mode (DS.isDark), the background SHALL adapt to use darker tones with primary as an accent glow.

#### Scenario: Light mode background
- **WHEN** DS.isDark is false
- **THEN** the cover background uses a gradient based on primary color at low opacity

#### Scenario: Dark mode background
- **WHEN** DS.isDark is true
- **THEN** the cover background adapts to dark tones with primary color used as a subtle accent

### Requirement: Pipeline store holds uiKitName
The pipeline store SHALL include a `uiKitName` state field with default value "img2ui UI Kit". This field SHALL be reactive and accessible to all components.

#### Scenario: Store initialized with default
- **WHEN** pipeline store initializes
- **THEN** `uiKitName` is set to "img2ui UI Kit"

### Requirement: Responsive layout for mobile
The cover layout SHALL adapt on mobile screens (≤768px). On mobile, the component preview panel MAY be hidden or repositioned below the title area to maintain readability.

#### Scenario: Mobile layout
- **WHEN** viewport width is ≤768px
- **THEN** the cover adjusts layout so title and badges remain readable
- **AND** the component preview panel is either hidden or stacked below
