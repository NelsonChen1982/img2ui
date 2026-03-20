## ADDED Requirements

### Requirement: Gallery page displays paginated grid of public designs
The system SHALL display a paginated grid of design cards at `/gallery`. Each card SHALL show a structured color swatch (primary, secondary, accent, success, warning, danger, surface, text), the author name (or "Anonymous"), an optional title with creation date, a light/dark indicator, and View/Download action buttons. The grid SHALL load 20 items per page with a "Load More" button for pagination.

#### Scenario: User visits gallery page
- **WHEN** a user navigates to `/gallery`
- **THEN** the system displays up to 20 public design cards sorted by newest first

#### Scenario: Load more designs
- **WHEN** user clicks "Load More" and more designs exist
- **THEN** the next 20 designs are appended to the grid

#### Scenario: No designs exist
- **WHEN** no public designs are in the database
- **THEN** the system displays an empty state message

### Requirement: Gallery supports color family filter
The system SHALL provide color family filter pills (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Neutral). Selecting a pill SHALL filter the gallery to show only designs whose `color_family` matches. Only one color family MAY be active at a time. Clicking the active pill SHALL deselect it and show all.

#### Scenario: Filter by color family
- **WHEN** user clicks the "Blue" color pill
- **THEN** only designs with `color_family = 'blue'` are displayed

#### Scenario: Clear color filter
- **WHEN** user clicks the already-active color pill
- **THEN** the filter is removed and all public designs are shown

### Requirement: Gallery supports theme filter
The system SHALL provide a theme filter with options: All, Light, Dark. Selecting Light or Dark SHALL filter designs by their `is_dark` value.

#### Scenario: Filter by dark theme
- **WHEN** user selects "Dark" theme filter
- **THEN** only designs with `is_dark = 1` are displayed

### Requirement: Gallery supports sort options
The system SHALL support sorting by "Latest" (created_at DESC) and "Most Downloads" (download_count DESC). Default sort SHALL be "Latest".

#### Scenario: Sort by most downloads
- **WHEN** user selects "Most Downloads" sort option
- **THEN** designs are reordered by download_count descending

### Requirement: Gallery supports My Designs filter
The system SHALL show a "My Designs" toggle visible only to logged-in users. When active, the gallery SHALL show only the current user's designs (both public and private).

#### Scenario: Logged-in user views own designs
- **WHEN** a logged-in user enables "My Designs" toggle
- **THEN** only that user's designs are shown, including private ones

#### Scenario: Anonymous user does not see My Designs toggle
- **WHEN** an anonymous user visits the gallery
- **THEN** the "My Designs" toggle is not visible
