-- Soft delete support for design_tokens
-- Run: npx wrangler d1 execute img2ui-db --file=worker/migration-gallery-soft-delete.sql

ALTER TABLE design_tokens ADD COLUMN deleted_at TEXT DEFAULT NULL;
