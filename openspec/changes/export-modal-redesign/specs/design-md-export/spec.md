## ADDED Requirements

### Requirement: Generate DESIGN.md in Stitch-compatible format
The system SHALL generate a DESIGN.md file that follows Google Stitch's semantic design system format with six sections: Visual Theme & Atmosphere, Color Palette & Roles, Typography Rules, Component Stylings, Layout Principles, and a Project Header.

#### Scenario: Basic DESIGN.md generation
- **WHEN** user selects DESIGN.md format and clicks Download
- **THEN** system downloads a file named `DESIGN.md` containing all six Stitch-format sections populated from the active design system tokens

#### Scenario: Color descriptions use natural language with hex codes
- **WHEN** DESIGN.md is generated
- **THEN** each color entry SHALL include a descriptive natural-language name derived from HSL analysis, the exact hex code in parentheses, and its functional role (e.g., "Vibrant Sky Blue (#3B82F6) — primary actions, links, key interactive elements")

#### Scenario: Typography rules use descriptive language
- **WHEN** DESIGN.md is generated
- **THEN** typography section SHALL describe font families, weight hierarchy, and sizing in natural language rather than raw px/weight values (e.g., "semi-bold (600) with comfortable line-height" instead of "h1 32/700")

#### Scenario: Theme selection applies to DESIGN.md
- **WHEN** user selects Dark theme and exports DESIGN.md
- **THEN** the Visual Theme section SHALL describe a dark aesthetic and color palette SHALL reflect the dark theme tokens

### Requirement: Color naming from HSL analysis
The system SHALL derive descriptive color names from HSL values using a hue-to-name mapping (red, orange, yellow, green, teal, blue, indigo, purple, pink) combined with lightness/saturation qualifiers (vibrant, muted, deep, soft, pale, etc.).

#### Scenario: Saturated blue color
- **WHEN** a color has H=210-240, S>60%, L=40-60%
- **THEN** its descriptive name SHALL include "Blue" with an appropriate intensity qualifier (e.g., "Vibrant Blue", "Deep Blue")

#### Scenario: Near-neutral color
- **WHEN** a color has S<10%
- **THEN** its descriptive name SHALL use neutral terms (e.g., "Near-Black", "Soft Gray", "Off-White") based on lightness

### Requirement: Style DNA integration
The system SHALL incorporate holistic analysis data (if available) into the Visual Theme & Atmosphere section to provide richer design narrative.

#### Scenario: Holistic data available
- **WHEN** `holisticResult` contains style DNA data
- **THEN** Visual Theme section SHALL incorporate detected aesthetic qualities and design philosophy

#### Scenario: Holistic data unavailable
- **WHEN** `holisticResult` is null or missing
- **THEN** Visual Theme section SHALL be derived from color analysis (isDark, dominant hues, contrast levels) with reasonable defaults
