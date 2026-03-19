## ADDED Requirements

### Requirement: Auto-derive Light and Dark palettes from brand colors
The system SHALL take extracted brand colors (primary, secondary, accent, success, warning, danger, info) and produce two complete color slot sets: one for Light theme and one for Dark theme.

Light theme SHALL use a white-range surface (`#ffffff`) and dark-range text (`#1a1a1a`).
Dark theme SHALL use a dark-range surface (`#121212`) and light-range text (`#f0f0f0`).
Border color SHALL be derived from the text color with low alpha in each theme.

#### Scenario: Standard brand colors with good contrast
- **WHEN** extracted brand colors include `primary=#3B82F6` (medium blue)
- **THEN** Light palette has `surface=#ffffff`, `text=#1a1a1a`, `primary=#3B82F6` (unchanged, already meets contrast on white)
- **THEN** Dark palette has `surface=#121212`, `text=#f0f0f0`, `primary=#3B82F6` (unchanged, already meets contrast on dark)

#### Scenario: Brand color with poor contrast on light background
- **WHEN** extracted brand color `primary=#B0D4F1` (light blue, contrast ratio < 3.0 on white)
- **THEN** Light palette `primary` SHALL be darkened until `contrastRatio(primary, #ffffff) >= 3.0`
- **THEN** Dark palette `primary` SHALL remain `#B0D4F1` if it already meets contrast on `#121212`

#### Scenario: Brand color with poor contrast on dark background
- **WHEN** extracted brand color `primary=#1A237E` (very dark blue, contrast ratio < 3.0 on `#121212`)
- **THEN** Dark palette `primary` SHALL be lightened until `contrastRatio(primary, #121212) >= 3.0`
- **THEN** Light palette `primary` SHALL remain `#1A237E` if it already meets contrast on `#ffffff`

### Requirement: autoAssignSlots returns brand colors only
The `autoAssignSlots` function SHALL return brand color assignments (primary, secondary, accent, success, warning, danger, info) and metadata (lightest/darkest extracted hex). It SHALL NOT assign surface, text, or border — these are theme-dependent.

#### Scenario: Color extraction with mixed luminance palette
- **WHEN** extracted colors include saturated mid-tones and neutral extremes
- **THEN** `autoAssignSlots` returns `{ brand: { primary, secondary, accent, success, warning, danger, info }, meta: { lightestHex, darkestHex } }`
- **THEN** surface, text, and border are NOT included in the return value

### Requirement: Contrast ratio utility functions
The system SHALL provide `contrastRatio(hex1, hex2)` returning WCAG relative luminance contrast ratio, and `adjustForContrast(color, background, minRatio)` that adjusts the color's lightness to meet the minimum ratio.

#### Scenario: Compute contrast ratio
- **WHEN** `contrastRatio('#000000', '#ffffff')` is called
- **THEN** the result SHALL be `21` (maximum contrast)

#### Scenario: Adjust color for contrast
- **WHEN** `adjustForContrast('#B0D4F1', '#ffffff', 3.0)` is called
- **THEN** the returned hex SHALL have `contrastRatio(result, '#ffffff') >= 3.0`
- **THEN** the returned hex SHALL preserve the original hue as closely as possible

### Requirement: Step 2 task list reflects real operations
StepScan SHALL display only tasks that have real backing implementations: color extraction, luminance detection, and token generation. Animation timing SHALL be evenly distributed across the total animation duration.

#### Scenario: Step 2 displays real tasks only
- **WHEN** Step 2 (StepScan) loads
- **THEN** exactly 3 task items are shown (color extraction, luminance detection, token generation)
- **THEN** the fake items (layout structure, typography levels, component semantics) are NOT shown

#### Scenario: Even animation timing
- **WHEN** Step 2 animates task completion
- **THEN** the time interval between each task completion SHALL be approximately equal

### Requirement: Dual DS objects in pipeline store
The pipeline store SHALL maintain two complete design system objects (`DS_light` and `DS_dark`). Each SHALL be built by calling `buildDS` with the respective theme's color slots. `DS_light` SHALL always have `isDark=false`. `DS_dark` SHALL always have `isDark=true`.

#### Scenario: Build both DS objects
- **WHEN** `buildDS_action` is called
- **THEN** `DS_light` is built with Light color slots and `isDark=false`
- **THEN** `DS_dark` is built with Dark color slots and `isDark=true`

#### Scenario: Default active theme based on image luminance
- **WHEN** the uploaded image has `imgAvgLum < 128` (dark image)
- **THEN** `activeTheme` defaults to `'dark'`
- **WHEN** the uploaded image has `imgAvgLum >= 128` (light image)
- **THEN** `activeTheme` defaults to `'light'`

### Requirement: Light and Dark palettes are independently editable
In Step 3, users SHALL be able to edit each slot in the Light palette and Dark palette independently. Changing a color in the Light palette SHALL NOT affect the Dark palette, and vice versa.

#### Scenario: Edit Light palette primary
- **WHEN** user changes Light palette `primary` from `#3B82F6` to `#EF4444`
- **THEN** Light palette `primary` becomes `#EF4444`
- **THEN** Dark palette `primary` remains unchanged

### Requirement: Step 3 shows extracted palette as read-only
The extracted palette (from K-means) SHALL be displayed at the top of Step 3 as read-only. Users SHALL NOT be able to edit extracted colors. The Light and Dark palettes below it are editable.

#### Scenario: Extracted palette is non-editable
- **WHEN** Step 3 loads with extracted colors
- **THEN** extracted palette is displayed with color swatches and hex codes
- **THEN** no edit controls (color picker, remove button) are shown on extracted palette items
