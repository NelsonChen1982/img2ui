-- Migration: Create auth + credits tables only (user_id column already exists)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  raw_json TEXT DEFAULT '{}',
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(provider, provider_sub)
);

CREATE TABLE IF NOT EXISTS credits_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  memo TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS anon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_by TEXT,
  design_id TEXT,
  FOREIGN KEY (claimed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_provider ON auth_providers(provider, provider_sub);
CREATE INDEX IF NOT EXISTS idx_auth_user ON auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_type_date ON credits_ledger(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_anon_ip ON anon_usage(ip);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON design_tokens(user_id);
