## Phase 1: Database Schema + Worker Auth Endpoints

- [x] Add new tables to `worker/schema.sql` (users, auth_providers, credits_ledger, anon_usage)
- [x] Add `user_id` column to existing `design_tokens` table
- [x] Implement `POST /api/auth/google` — verify Google id_token, upsert user, auto-link provider, issue session token
- [x] Implement `GET /api/auth/github` + `GET /api/auth/github/callback` — GitHub OAuth code exchange flow
- [x] Implement login helper: check daily_refill, check balance cap (50), insert welcome bonus (+10) for new users, insert daily_refill (+3)
- [x] Implement `GET /api/credits` — return balance (SUM of ledger), can_generate flag
- [x] Implement `POST /api/claim-designs` — associate anonymous design_ids with user_id
- [x] Implement `GET /api/anon-check` — check KV for IP anonymous usage
- [x] Update session signing to use user_id instead of email; add anonymous session variant
- [x] Add wrangler secrets documentation for GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

## Phase 2: Frontend Auth Store + Modal

- [x] Create `src/stores/auth.js` — user state, loginWithGoogle, loginWithGitHub, logout, checkCredits, claimAnonymousDesigns
- [x] Create `src/components/ui/AuthModal.vue` — Google GSI button + GitHub OAuth button, triggered by auth gate checks
- [x] Create `src/components/ui/UserMenu.vue` — avatar dropdown with credits display, "My Designs", logout
- [x] Create `src/components/ui/LoginButton.vue` — top-right navbar login trigger
- [x] Integrate Google GSI script loading (accounts.google.com/gsi/client)
- [x] Implement anonymous gate logic: `hasUsedFreePass()` check using localStorage + `/api/anon-check` fallback
- [x] Wire auth store init in `App.vue` — restore session from cookie/localStorage on mount

## Phase 3: Step 1 Redesign

- [x] Rewrite `StepUpload.vue` — two-column layout (left intro / right upload)
- [x] Left column: logo, title, subtitle, description, vertical feature list, registration CTA card (10 credits bonus, Google/GitHub buttons)
- [x] Right column: drop zone, "Free Start" CTA button, Turnstile
- [x] Remove: email input field, email validation, `DAILY_LIMIT` display, rate limit notice
- [x] Add responsive breakpoint: stack to single column on mobile (< 768px), upload area first
- [x] Update `App.vue` or layout wrapper to include navbar with LoginButton/UserMenu
- [x] Logged-in state: show credits in navbar, hide registration CTA card, CTA text changes to "Start" (not "Free Start")

## Phase 4: Credit Deduction + Anonymous Save

- [x] Modify `StepResult.vue` (Kit page): on render, call credit deduction logic
  - Anonymous: mark `localStorage.pic2ui_free_used = true` + POST to KV via `/api/anon-check`
  - Logged in, first generation: insert `amount=0, type='generation'` ledger entry
  - Logged in, subsequent: insert `amount=-1, type='generation'` ledger entry; block if balance <= 0
- [x] Modify `/api/save-result` to accept `user_id = null` for anonymous saves; return `design_id` (UUID)
- [x] Frontend: store returned `design_id` in `localStorage.pic2ui_anon_designs` array
- [x] On login (auth store): auto-call `claimAnonymousDesigns()` using stored design_ids
- [x] Remove re-annotate button/flow from Kit page

## Phase 5: Cleanup + Migration

- [x] Remove `DAILY_LIMIT` from `src/data/constants.js`
- [x] Remove rate limit display from `StepUpload.vue` (already done in Phase 3)
- [x] Remove `rateLimitRemaining` from `src/stores/settings.js`
- [ ] Remove `email` from `src/stores/settings.js` — deferred: still used by StepProcessing/aiService for AI analysis calls
- [ ] Remove email-related i18n keys; add auth/credits i18n keys — deferred: auth i18n added inline in components, legacy keys kept for now
- [x] Update `src/stores/rateLimit.js` — kept as-is, effectively dead code (only App.vue inits it)
- [x] Modify `/api/upload-image` to work without email for anonymous users (use IP-based session)
- [x] Update worker rate limiting: remove flat 30/day, anonymous uses KV IP check, logged-in uses credits
