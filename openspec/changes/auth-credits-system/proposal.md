## Why

The current system uses email + Turnstile as a soft gate with a flat 30/day rate limit. This has several problems: no real user identity (can't build gallery/history), no way to control costs granularly, and the email input adds friction without providing real authentication. Moving to OAuth (Google + GitHub) with a credit-based system enables: user identity for gallery features, granular usage control, a freemium conversion funnel, and future monetization.

## What Changes

### Authentication
- Replace email input gate with Google OAuth (frontend GSI) + GitHub OAuth (Worker code exchange)
- Identity is email-based: same email from different providers = same account (auto-link)
- New `users` table + `auth_providers` table in D1
- Session token changes from `HMAC(email+ip+date)` to `HMAC(user_id+ip+date)`

### Credits System
- Append-only `credits_ledger` table (Level 2 schema, Level 1 logic)
- Welcome bonus: +10 credits on first registration
- Daily login refill: +3 credits (requires active login, not passive session)
- Cap: max 50 credits accumulated
- Deduction: -1 credit per UI Kit generation (at Kit page render)
- First generation is free for everyone (logged in or not), tracked as `amount=0` ledger entry

### Anonymous Experience
- First-time visitors get one complete flow (Upload → Kit → Download) for free, no login required
- Second attempt triggers Auth Modal with Google/GitHub login
- Anonymous detection: localStorage + IP (KV, no TTL) + Turnstile
- Anonymous results are saved to D1 with `user_id = NULL`, visible in gallery as "Anonymous"
- On login, frontend sends stored `design_id` from localStorage to claim anonymous work

### Step 1 UI Redesign
- Split from single-column centered layout to two-column: left intro / right upload
- Left column: logo, title, description, vertical feature list, registration CTA card (10 credits bonus)
- Right column: drop zone, "Free Start" CTA button, Turnstile
- Remove: email input field, daily rate limit display ("30 uses remaining")
- Add: top-right login button in navbar, user avatar dropdown when logged in
- Responsive: stack to single column on mobile (< 768px), upload area first

### Pipeline Changes
- Remove "re-annotate" capability from Kit page (re-do = re-upload = new generation)
- Kit page free operations: change colors, switch CSS framework, all downloads
- Remove `DAILY_LIMIT` constant and rate limit display from frontend

## Capabilities

### New Capabilities
- `oauth-auth`: Google (GSI frontend) + GitHub (Worker code exchange) authentication with email-based account linking
- `credits-system`: Append-only ledger for credit tracking (welcome +10, daily +3, generation -1, cap 50)
- `anonymous-gate`: One free complete flow for anonymous users, enforced by localStorage + IP + Turnstile
- `anonymous-gallery`: Anonymous results saved to D1 and displayed in gallery as "Anonymous"
- `claim-designs`: Associate anonymous designs with user account on login
- `split-layout-step1`: Two-column landing page layout with intro left / upload right

### Modified Capabilities
- `rate-limiting`: Replace flat 30/day IP+email limit with credit-based system
- `session-auth`: Update HMAC session to use user_id instead of email
- `step-upload`: Remove email gate, add OAuth flow, redesign layout

## Impact

- **New files**: `src/stores/auth.js`, `src/components/ui/AuthModal.vue`, `src/components/ui/LoginButton.vue`, `src/components/ui/UserMenu.vue`
- **Worker**: New endpoints (`/api/auth/google`, `/api/auth/github`, `/api/auth/github/callback`, `/api/claim-designs`, `/api/credits`), new tables (`users`, `auth_providers`, `credits_ledger`), modified session logic
- **Modified UI**: `StepUpload.vue` (full rewrite — two-column layout, remove email), `StepResult.vue` (remove re-annotate), `ActionFooter.vue` (login state awareness), `App.vue` (auth store init, navbar login)
- **Modified stores**: `pipeline.js` (remove email dependency, add anon tracking), `settings.js` (remove email/rateLimitRemaining)
- **Modified data**: `constants.js` (remove DAILY_LIMIT), `i18n.js` (new auth/credits keys, remove email gate keys)
- **Removed**: Email input flow, `DAILY_LIMIT` display, re-annotate from Kit page
- **Schema**: `worker/schema.sql` — add `users`, `auth_providers`, `credits_ledger`, `anon_usage` tables; add `user_id` column to `design_tokens`
