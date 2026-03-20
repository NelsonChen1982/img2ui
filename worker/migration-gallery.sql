-- Gallery feature migration
-- Run: npx wrangler d1 execute img2ui-db --file=worker/migration-gallery.sql

-- New columns on design_tokens for gallery
ALTER TABLE design_tokens ADD COLUMN visibility TEXT DEFAULT 'public';
ALTER TABLE design_tokens ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN primary_color TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN color_family TEXT DEFAULT '';
ALTER TABLE design_tokens ADD COLUMN is_dark INTEGER DEFAULT 0;
ALTER TABLE design_tokens ADD COLUMN download_count INTEGER DEFAULT 0;

-- Indexes for gallery queries
CREATE INDEX IF NOT EXISTS idx_tokens_gallery ON design_tokens(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_color_family ON design_tokens(color_family);
CREATE INDEX IF NOT EXISTS idx_tokens_downloads ON design_tokens(visibility, download_count DESC);
