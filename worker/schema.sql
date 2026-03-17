-- img2ui D1 Database Schema
-- Run: npx wrangler d1 execute img2ui-db --file=schema.sql

-- Email collection + user tracking
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT NOT NULL DEFAULT (datetime('now')),
  total_uses INTEGER NOT NULL DEFAULT 1,
  last_ip TEXT DEFAULT ''
);

-- Design token snapshots (linked to email + image)
CREATE TABLE IF NOT EXISTS design_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  image_key TEXT NOT NULL DEFAULT '',
  tokens_json TEXT NOT NULL,
  annotations_json TEXT DEFAULT '[]',
  holistic_json TEXT DEFAULT '{}',
  provider TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (email) REFERENCES emails(email)
);

-- Usage / audit log
CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  provider TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  image_key TEXT DEFAULT '',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_email ON emails(email);
CREATE INDEX IF NOT EXISTS idx_tokens_email ON design_tokens(email);
CREATE INDEX IF NOT EXISTS idx_tokens_created ON design_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_email ON usage_log(email);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);
