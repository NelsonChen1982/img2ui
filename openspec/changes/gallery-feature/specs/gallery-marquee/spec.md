## ADDED Requirements

### Requirement: Landing page shows marquee of recent public designs
The StepUpload page (Step 1) SHALL display a horizontal auto-scrolling marquee at the bottom showing the most recent public designs. The marquee SHALL fetch up to 12 designs from `GET /api/gallery?limit=12&sort=latest` and render them as compact color-swatch cards. A "View Gallery →" link SHALL navigate to `/gallery`.

#### Scenario: Marquee displays recent designs
- **WHEN** user lands on the upload page and public designs exist
- **THEN** a horizontal marquee of up to 12 compact design cards auto-scrolls at the bottom

#### Scenario: Marquee handles no designs gracefully
- **WHEN** no public designs exist in the database
- **THEN** the marquee section is not rendered

#### Scenario: User clicks a marquee card
- **WHEN** user clicks a design card in the marquee
- **THEN** the user is navigated to `/gallery/:id` for that design

### Requirement: Marquee uses CSS animation for smooth scrolling
The marquee SHALL use CSS `@keyframes` animation for continuous horizontal scrolling. The animation SHALL pause on hover to allow interaction.

#### Scenario: Marquee pauses on hover
- **WHEN** user hovers over the marquee
- **THEN** the scrolling animation pauses
