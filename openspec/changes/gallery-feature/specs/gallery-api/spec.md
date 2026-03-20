## ADDED Requirements

### Requirement: GET /api/gallery returns paginated public designs
The Worker SHALL expose `GET /api/gallery` returning a paginated list of public designs. Response SHALL include `items` array and `total` count. Each item SHALL contain: `id`, `title`, `user_name`, `user_avatar`, `primary_color`, `color_family`, `is_dark`, `colors` (extracted colors object only), `download_count`, `created_at`. Full `tokens_json` SHALL NOT be included in list responses.

#### Scenario: Fetch first page of gallery
- **WHEN** client calls `GET /api/gallery?page=1&limit=20`
- **THEN** Worker returns up to 20 public designs sorted by `created_at DESC` with total count

#### Scenario: Filter by color family
- **WHEN** client calls `GET /api/gallery?hue=blue`
- **THEN** Worker returns only designs where `color_family = 'blue'`

#### Scenario: Filter by theme
- **WHEN** client calls `GET /api/gallery?theme=dark`
- **THEN** Worker returns only designs where `is_dark = 1`

#### Scenario: Sort by downloads
- **WHEN** client calls `GET /api/gallery?sort=downloads`
- **THEN** Worker returns designs ordered by `download_count DESC`

#### Scenario: Filter own designs (authenticated)
- **WHEN** client calls `GET /api/gallery?mine=1` with valid session token and user_id
- **THEN** Worker returns all designs (public and private) belonging to that user

### Requirement: GET /api/gallery/:id returns full design detail
The Worker SHALL expose `GET /api/gallery/:id` returning full design data including `tokens_json`, `annotations_json`, `holistic_json`, author info, and metadata. Private designs SHALL only be returned to their owner.

#### Scenario: Fetch public design detail
- **WHEN** client calls `GET /api/gallery/abc123` for a public design
- **THEN** Worker returns full design data with all token fields

#### Scenario: Fetch private design by non-owner
- **WHEN** client calls `GET /api/gallery/abc123` for a private design without matching user_id
- **THEN** Worker returns 404

### Requirement: POST /api/gallery/:id/download increments download count
The Worker SHALL expose `POST /api/gallery/:id/download` that increments the `download_count` for the given design and returns the updated count.

#### Scenario: Increment download count
- **WHEN** client calls `POST /api/gallery/abc123/download`
- **THEN** Worker increments `download_count` by 1 and returns `{ download_count: <new value> }`

### Requirement: PATCH /api/gallery/:id updates design metadata
The Worker SHALL expose `PATCH /api/gallery/:id` accepting `visibility` and/or `title` fields. Only the design owner (matched by user_id + session token) SHALL be authorized.

#### Scenario: Owner updates visibility to private
- **WHEN** owner calls `PATCH /api/gallery/abc123` with `{ visibility: 'private' }`
- **THEN** Worker updates the design and returns success

#### Scenario: Non-owner attempts update
- **WHEN** a non-owner calls `PATCH /api/gallery/abc123`
- **THEN** Worker returns 403 Forbidden

### Requirement: save-result computes denormalized gallery fields
The existing `POST /api/save-result` SHALL be modified to accept `title` and `visibility` in the request body. The Worker SHALL compute `primary_color`, `color_family`, and `is_dark` from the submitted tokens and store all fields in `design_tokens`.

#### Scenario: Save result with gallery fields
- **WHEN** client calls `POST /api/save-result` with tokens containing `colors.primary = '#2563eb'` and `isDark = false`
- **THEN** Worker stores `primary_color = '#2563eb'`, `color_family = 'blue'`, `is_dark = 0`, along with provided title and visibility
