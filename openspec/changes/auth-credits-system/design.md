## Architecture Decisions

### Identity: Email as Primary Key
- User identity is the email address, not the OAuth provider sub ID
- Same email from Google and GitHub = same account, auto-linked
- `users` table keyed by email (unique), `auth_providers` as a separate join table
- If a user logs in with Google first, then GitHub with the same email, the GitHub provider is automatically added to `auth_providers` without user interaction
- Rationale: OAuth providers verify email ownership, so trusting their email claim is safe. This breaks down if email+password auth is added later (would need email verification).

### OAuth Implementation: Mixed Strategy (Option C)
- **Google**: Frontend GSI (Sign In With Google) — returns `id_token` directly, Worker verifies via Google's public keys
- **GitHub**: Worker-side code exchange — frontend redirects to GitHub, GitHub redirects to Worker callback endpoint, Worker exchanges code for access token + user info
- Rationale: Each provider's recommended flow. Google GSI is lighter (no redirect), GitHub requires server-side secret.

### Credits: Level 2 Schema, Level 1 Logic
- Append-only `credits_ledger` table from day one (not a single `credits` column on `users`)
- Balance = `SELECT SUM(amount) FROM credits_ledger WHERE user_id = ?`
- Initial types: `welcome` (+10), `daily_refill` (+3), `generation` (-1 or 0)
- Future types reserved: `admin_grant`, `purchase`, `figma_export`, `premium_model`
- Daily refill check: `SELECT COUNT(*) FROM credits_ledger WHERE user_id = ? AND type = 'daily_refill' AND created_at >= date('now')`
- Cap check before refill: if balance >= 50, skip refill
- Rationale: Ledger is the single source of truth. No sync issues between a balance column and transaction history. Trivial to add new credit types later.

### First Generation Free
- Tracked in ledger as `amount = 0, type = 'generation'` entry
- Check: `SELECT COUNT(*) FROM credits_ledger WHERE user_id = ? AND type = 'generation'` — if 0, generation is free
- For anonymous users: no ledger entry (no user_id), controlled purely by localStorage + IP
- On login, if the user has never generated before (ledger count = 0), their first logged-in generation is also free
- This avoids the "logging in costs me more" paradox

### Anonymous Flow
- **Detection (3 layers)**:
  1. `localStorage.pic2ui_free_used = "true"` — fast client check
  2. KV key `anon:ip:{ip}` (no TTL, permanent) — server backup if localStorage cleared
  3. Turnstile — bot prevention (already exists)
- **Storage**: Anonymous Kit results are POSTed to `/api/save-result` with `user_id = NULL`
  - Worker assigns a `design_id` (UUID) returned to frontend
  - Frontend stores `pic2ui_anon_designs = ["design_abc123"]` in localStorage
- **Claim on login**: Frontend sends stored design_ids to `POST /api/claim-designs`
  - Worker: `UPDATE design_tokens SET user_id = ? WHERE id IN (?) AND user_id IS NULL`
  - If localStorage was cleared, claim is lost — acceptable tradeoff
- **Gallery display**: Anonymous designs show as "Anonymous" / "Guest" with a default avatar icon

### Session Token
- Current: `HMAC(email + ip + today)` using `TURNSTILE_SECRET_KEY`
- New (logged in): `HMAC(user_id + ip + today)` — same mechanism, swap email for user_id
- New (anonymous): `HMAC("anon" + ip + today)` — allows anonymous users to save results
- Token lifetime: same day (resets at midnight UTC)

## DB Schema

### New Tables

```sql
-- Users (identity = email)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                -- UUID v4
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- OAuth provider links (many-to-one with users)
CREATE TABLE IF NOT EXISTS auth_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,             -- 'google' | 'github'
  provider_sub TEXT NOT NULL,         -- external ID from provider
  raw_json TEXT DEFAULT '{}',         -- original OAuth response (debug)
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(provider, provider_sub)
);

-- Credits ledger (append-only)
CREATE TABLE IF NOT EXISTS credits_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,            -- +10, +3, -1, 0
  type TEXT NOT NULL,                 -- welcome, daily_refill, generation, admin_grant, purchase, figma_export
  memo TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Anonymous usage tracking
CREATE TABLE IF NOT EXISTS anon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  used_at TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_by TEXT,                    -- user_id after claim, NULL if unclaimed
  design_id TEXT,                     -- links to design_tokens.id
  FOREIGN KEY (claimed_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_provider ON auth_providers(provider, provider_sub);
CREATE INDEX IF NOT EXISTS idx_auth_user ON auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_type_date ON credits_ledger(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_anon_ip ON anon_usage(ip);
```

### Modified Tables

```sql
-- design_tokens: add user_id, change id to TEXT UUID
ALTER TABLE design_tokens ADD COLUMN user_id TEXT REFERENCES users(id);
-- Existing rows retain email-based lookup; new rows use user_id
```

## API Endpoints

### New
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/google` | POST | None | Verify Google id_token, create/find user, return session |
| `/api/auth/github` | GET | None | Redirect to GitHub OAuth |
| `/api/auth/github/callback` | GET | None | Exchange code, create/find user, redirect to app with session |
| `/api/claim-designs` | POST | Session | Associate anonymous design_ids with logged-in user |
| `/api/credits` | GET | Session | Get current credit balance |
| `/api/anon-check` | GET | None | Check if IP has used anonymous free pass |

### Modified
| Endpoint | Change |
|----------|--------|
| `/api/upload-image` | Remove email requirement for anonymous; accept `user_id` or `anon_token` |
| `/api/save-result` | Accept `user_id = null` for anonymous saves; return `design_id` |
| `/api/rate-status` | Replace with `/api/credits` for logged-in users |

## Component Architecture

```
App.vue
├── Navbar (new)
│   ├── Logo
│   ├── LanguageDropdown (existing)
│   └── LoginButton / UserMenu (new)
│
├── AuthModal (new, teleported to body)
│   ├── Google GSI button
│   └── GitHub OAuth button
│
└── Steps
    ├── StepUpload (rewritten)
    │   ├── LeftColumn (intro, features, registration CTA)
    │   └── RightColumn (drop zone, CTA button)
    └── StepResult (modified)
        └── Remove re-annotate button
```

### New Store: `src/stores/auth.js`
```
State:
  user: null | { id, email, name, avatarUrl }
  sessionToken: string
  isAuthenticated: computed

Actions:
  loginWithGoogle(idToken)
  loginWithGitHub(code)
  logout()
  claimAnonymousDesigns()
  checkCredits() → { balance, canGenerate }
  deductCredit() → triggers after Kit page render
  refreshDailyCredits() → called on login
```

## Step 1 Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  img2ui                           [語言▼]  [登入]      │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│  [Logo]                │  ┌────────────────────────┐    │
│                        │  │                        │    │
│  img2ui                │  │   ☁ 拖拉或點擊上傳     │    │
│  截圖變設計系統         │  │   支援 PNG/JPG/WebP    │    │
│                        │  │   最大 5MB             │    │
│  一段描述文字...        │  │                        │    │
│                        │  └────────────────────────┘    │
│                        │                                │
│  🎨 智能色彩萃取        │  [    ▶ 免費開始辨識     ]    │
│  📐 自動排版系統        │                                │
│  🧩 25 種元件辨識       │                                │
│  📦 多格式匯出          │                                │
│  🎨 Figma (即將上線)    │                                │
│                        │                                │
│  ┌────────────────┐    │                                │
│  │ 🎁 註冊即送     │    │                                │
│  │   10 點額度     │    │                                │
│  │                │    │                                │
│  │ ✦ 保存歷史設計  │    │                                │
│  │ ✦ 每日登入 +3  │    │                                │
│  │ ✦ Gallery 展示  │    │                                │
│  │                │    │                                │
│  │ [Google][GitHub]│    │                                │
│  └────────────────┘    │                                │
│                        │                                │
└────────────────────────┴────────────────────────────────┘
```

## Step 1 Layout (Mobile < 768px)

```
┌──────────────────────────┐
│ img2ui        [語言][登入]│
├──────────────────────────┤
│ [Logo] img2ui            │
│ 截圖變設計系統 (短版)     │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │  ☁ 拖拉或點擊上傳    │ │
│ └──────────────────────┘ │
│                          │
│ [ ▶ 免費開始辨識 ]       │
├──────────────────────────┤
│ Features (橫向捲動)      │
├──────────────────────────┤
│ 🎁 註冊送 10 點          │
│ [Google] [GitHub]        │
└──────────────────────────┘
```
