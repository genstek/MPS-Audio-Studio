# LAS-19 — Authentication architecture and account/session flows

Jira: [LAS-19](https://genstek69.atlassian.net/browse/LAS-19) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-19.md` · Mode: ARCHITECTURE

Branch `docs/LAS-19-auth-architecture` · Decision: [`docs/ADR-003-accounts-and-private-storage.md`](../../ADR-003-accounts-and-private-storage.md) (status **proposed**, awaiting Gennady's review)

Developer status: **READY_FOR_QA** (decision documented; implemented in development form by LAS-21–25) · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Repository inspection
Before this decision the repository was a static React/Vite app (ADR-002) with no server, no accounts and no network use for audio. ADR-002 requires a separate decision before a backend; ADR-003 is that decision. The choice: a self-hosted Node.js server using only the standard library (`node:http`, `node:crypto`, `node:sqlite`), reached through Vite's `/api` proxy. Provider/library trade-offs, data ownership, development setup, costs and rollback are in the ADR.

## Development setup (implemented by LAS-21)
```sh
npm ci
npm run server          # API on http://127.0.0.1:8787, data in .data/dev (git-ignored)
npm run dev -- --port 5174
```
`npm run server` sets `MPS_DEV_ENDPOINTS=1`, so verification and reset emails land in the development outbox (`GET /api/dev/outbox?to=<email>`). Playwright starts its own API server on port 8788 with a fresh `.data/e2e` folder. No secrets are needed; production mail/TLS/hosting are external setup blockers.

## Account and session flows
```mermaid
stateDiagram-v2
    [*] --> Guest
    Guest --> Unverified: register(email, password)\n202 same answer for new or existing email
    Unverified --> Unverified: login → 403 "verify your email" (session not created)
    Unverified --> Verified: open verification link (single-use, 24 h)
    Unverified --> Unverified: expired/used link → 400, resend → 202
    Verified --> SignedIn: login(correct password) → session cookie
    Verified --> Verified: login(wrong password) → 401 generic; repeated → 429
    SignedIn --> Guest: logout → session deleted, cookie cleared
    SignedIn --> Guest: idle 24 h or absolute 7 days → 401, UI shows "session expired"
    Verified --> Verified: recover(email) → 202 always; reset link (single-use, 30 min)
    SignedIn --> Guest: password reset elsewhere → all sessions revoked
    SignedIn --> [*]: delete account (password) → sessions, projects, audio, jobs, consents purged
```

| Flow | Request | Success | Failure answers (no account enumeration) |
| --- | --- | --- | --- |
| Register | `POST /api/auth/register {email, password}` | 202 "Check your email" (new address: verification mail; existing: "someone tried to register" mail) | 400 invalid email / password length 10–128; 429 limit |
| Verify | `POST /api/auth/verify {token}` | 200 verified | 400 invalid, expired or already used |
| Resend | `POST /api/auth/resend-verification {email}` | 202 always | 429 limit |
| Login | `POST /api/auth/login {email, password}` | 200 + `mps_session` cookie | 401 "Email or password is incorrect" (unknown email and wrong password identical); 403 `unverified` only after a correct password; 429 limit |
| Session | `GET /api/auth/session` | 200 `{user}` or `{user: null}` | — |
| Logout | `POST /api/auth/logout` | 204, session row deleted, cookie cleared | 204 even without a session |
| Recover | `POST /api/auth/recover {email}` | 202 always | 429 limit |
| Reset | `POST /api/auth/reset {token, password}` | 200, all sessions revoked | 400 invalid/expired/used token or bad password |

## Endpoint × caller access matrix
Anonymous = no or unknown cookie. Expired = cookie of an idle-expired, absolute-expired, logged-out or reset-revoked session (treated exactly like anonymous). Other user = a different verified, signed-in account. "404*" = same answer as for an id that does not exist.

| Endpoint | Anonymous / expired | Unverified account | Owner (verified, signed in) | Other user |
| --- | --- | --- | --- | --- |
| `GET /api/health`, `GET /api/auth/session` | allowed (`user: null`) | — (no session is ever created) | allowed | allowed (own data only) |
| `POST /api/auth/register, verify, resend-verification, login, recover, reset` | allowed, rate limited | allowed | allowed | allowed |
| `POST /api/auth/logout` | 204 no-op | — | 204 | 204 (own session) |
| `GET/POST /api/projects` | 401 | — | own projects only | own projects only |
| `GET/PATCH/DELETE /api/projects/:id` | 401 | — | allowed | 404* |
| `GET/POST /api/projects/:id/assets` | 401 | — | allowed | 404* |
| `GET/DELETE /api/assets/:id` | 401 | — | allowed | 404* |
| `POST /api/assets/:id/download-link` | 401 | — | 5-minute signed link | 404* |
| `GET /api/download/:id?exp&sig` | 401 | — | bytes if signature valid and unexpired, else 403 | 404* (even with the owner's link) |
| `POST /api/assets/:id/jobs`, `GET/DELETE /api/jobs/:id` | 401 | — | allowed | 404* |
| `POST /api/assets/:id/external-jobs` | 401 | — | 403 without consent for that recipient | 404* |
| `GET/POST/DELETE /api/account/consents` | 401 | — | own consents | own consents only |
| `DELETE /api/account` | 401 | — | 204 with correct password, 403 otherwise | own account only |
| `GET /api/dev/outbox`, `GET /api/dev/transmissions` | only when `MPS_DEV_ENDPOINTS=1`; 404 otherwise | | | |

All state-changing requests also need `X-MPS-Request: 1` and an allowed `Origin` (403 otherwise).

## Guest restrictions
None for local work: import, play, pause, stop, remove and every LAS-10 exercise run without a server or account. Only the private library, processing jobs, consents and account settings need a signed-in, verified account.

## Limits of this decision
Development-grade: single process, in-memory rate limits, SQLite file, development mail outbox, no TLS termination, no backups. Production hosting, mail provider and backup policy need a later decision and credentials (external setup blockers).
