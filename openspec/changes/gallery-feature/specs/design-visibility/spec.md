## ADDED Requirements

### Requirement: Designs default to public visibility
All newly created designs SHALL have `visibility = 'public'` by default. Public designs SHALL appear in the gallery for all users.

#### Scenario: New design is public by default
- **WHEN** a design is saved via `POST /api/save-result` without explicit visibility
- **THEN** the design is stored with `visibility = 'public'`

### Requirement: StepResult page includes visibility toggle
The StepResult page SHALL display a visibility toggle (Public / Private) after a design is saved. Toggling SHALL immediately call `PATCH /api/gallery/:id` to update the visibility. Default state SHALL be Public.

#### Scenario: User toggles to private on StepResult
- **WHEN** a logged-in user toggles visibility to "Private" on the StepResult page
- **THEN** the system calls PATCH to update the design's visibility to private

#### Scenario: Anonymous user does not see visibility toggle
- **WHEN** an anonymous user is on the StepResult page
- **THEN** the visibility toggle is not displayed

### Requirement: Owner can change visibility from Gallery
Logged-in users viewing their own designs in the Gallery (via "My Designs" filter) SHALL see a visibility toggle on each card. Toggling SHALL update the design's visibility via `PATCH /api/gallery/:id`.

#### Scenario: Owner changes visibility from gallery card
- **WHEN** owner toggles a design from public to private in the gallery
- **THEN** the system updates visibility and the design no longer appears in public gallery listings

### Requirement: Private designs are hidden from public gallery
Designs with `visibility = 'private'` SHALL NOT appear in public gallery queries. They SHALL only be visible to their owner via the "My Designs" filter.

#### Scenario: Private design excluded from public listing
- **WHEN** any user browses the public gallery
- **THEN** designs with `visibility = 'private'` are not included in results
