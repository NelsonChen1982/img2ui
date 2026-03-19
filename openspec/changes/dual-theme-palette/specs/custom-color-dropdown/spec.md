## ADDED Requirements

### Requirement: Custom dropdown replaces native select for color slots
All color slot selection controls in Step 3 SHALL use a custom `ColorDropdown` component instead of native `<select>` elements. The dropdown SHALL display a color swatch (filled square) next to each hex code.

#### Scenario: Dropdown displays color options with swatches
- **WHEN** user clicks a color slot's dropdown trigger
- **THEN** a dropdown menu appears showing each extracted palette color as a row with a color swatch (minimum 20×20px) and hex code
- **THEN** the currently selected color is visually highlighted

#### Scenario: Custom color option
- **WHEN** user selects the "Custom" option in the dropdown
- **THEN** a native color picker opens allowing the user to pick any color
- **THEN** after picking, the selected hex is applied to the slot and the hex code is displayed

#### Scenario: Dropdown closes on outside click
- **WHEN** the dropdown is open and user clicks outside of it
- **THEN** the dropdown closes without changing the selection

### Requirement: Dropdown trigger shows current color
The dropdown trigger button SHALL display the current slot color as a swatch and its hex code, so users can see the assigned color at a glance without opening the dropdown.

#### Scenario: Trigger displays current selection
- **WHEN** a slot has `primary=#3B82F6` assigned
- **THEN** the trigger shows a blue swatch and the text `#3B82F6`

### Requirement: Mobile-friendly touch targets
All interactive elements in the dropdown SHALL have a minimum touch target of 44px height on viewports ≤768px wide.

#### Scenario: Mobile dropdown option size
- **WHEN** viewport width is ≤768px
- **THEN** each dropdown option row has at least 44px height
- **THEN** the dropdown trigger has at least 44px height

### Requirement: Hex code updates on color picker change
When a user edits a slot color via the color picker (custom option), the displayed hex code in the slot card SHALL update to reflect the new color.

#### Scenario: Color picker updates hex display
- **WHEN** user opens custom color picker on a slot showing `#3B82F6`
- **THEN** user picks `#EF4444`
- **THEN** the slot card displays `#EF4444` as the hex code and shows a red swatch
