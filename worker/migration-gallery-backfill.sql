-- Backfill gallery fields for existing design_tokens rows
-- This must be run AFTER migration-gallery.sql
-- NOTE: SQLite/D1 lacks native hex→HSL functions, so this sets sensible defaults.
-- For accurate backfill, use the JS backfill endpoint below instead.

-- Mark all existing rows as public (they were created before visibility existed)
UPDATE design_tokens SET visibility = 'public' WHERE visibility IS NULL OR visibility = '';
