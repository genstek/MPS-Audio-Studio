# LAS-21 — Registration, verified login and logout

Jira: [LAS-21](https://genstek69.atlassian.net/browse/LAS-21) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-21.md` · Mode: IMPLEMENT · Prerequisite LAS-19 (ADR-003)

Branch `feat/LAS-21-accounts` · tested application commit `ac9ab7c7a1fdfe0165b9e7e171445ae0788a2245`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What was built
**Server** (`server/`, Node standard library only):
- `db.js` SQLite with forward migrations (`PRAGMA user_version`); `security.js` scrypt (N = 2^15, r = 8, p = 1) and random tokens; `http.js` JSON limits (64 KiB), cookies, security headers; `app.js` routes; `index.js` entry with a Node ≥ 22.13 check and a reset guard that only deletes data folders under `.data/` or the temp folder.
- Endpoints: `GET /api/health`, `GET /api/auth/session`, `POST /api/auth/register`, `/verify`, `/resend-verification`, `/login`, `/logout`, protected `GET /api/account`, development-only `GET /api/dev/outbox`.
- Rules (ADR-003): hashed single-use 24 h verification tokens; same 202 answer for new/existing addresses; generic 401 for unknown email and wrong password (decoy hash keeps timing similar); 403 `unverified` only after a correct password; HttpOnly SameSite=Lax `mps_session` cookie whose hash is stored with 24 h idle / 7 day limits; logout deletes the session; state changes need `X-MPS-Request: 1`, an allowed Origin and not `Sec-Fetch-Site: cross-site`; request logs show method, path, status and time only; audit rows hold a keyed hash of the user id.

**Studio** (`src/AccountDialog.jsx`, `src/account-api.js`): an **Account** button in the header opens a native modal dialog — Sign in, Create account, Check your email, Verify your email (resend), Your account (Sign out). Loading and success messages use `role=status`, errors `role=alert`. The studio contacts the server only when the dialog opens or when a verification link is followed (then the token is removed from the address bar). Without the server the dialog says accounts are unavailable and playback works.

**Test wiring**: Vite proxies `/api` (`MPS_API_URL`, default 8787). Playwright starts its own server on 8788 with a fresh `.data/e2e`; global setup now also refuses a reused 5173 server that forwards `/api` elsewhere (`evidence/api-guard-refusal.log`).

## How to try it
```sh
npm ci
npm run server                 # terminal 1: http://127.0.0.1:8787, data in .data/dev
npm run dev -- --port 5174     # terminal 2
# Account → Create account; then open http://127.0.0.1:5174/api/dev/outbox?to=<email> and follow the link
```

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| register, verify by link, sign in, reach a protected endpoint, sign out | Vitest (real HTTP) | AC-01..03, cookie attributes, replayed cookie rejected after logout |
| unknown email and wrong password get the same answer; unverified only after the right password | Vitest | AC-02 policy, no session on failure |
| registering an existing address answers the same and changes nothing | Vitest | enumeration, account takeover by re-registration |
| verification links work once, expire after 24 hours and are replaced by a resend | Vitest (clock) | token lifecycle |
| state changes need the studio header and an allowed origin | Vitest | CSRF / cross-origin |
| invalid input is rejected with clear errors | Vitest | validation, 415, 413 |
| secrets are not stored, logged or exposed in plain form | Vitest | AC-04: DB, logs (incl. query strings), secret file mode 0600 |
| production password hashing uses scrypt N=2^15; dev endpoints only when enabled | Vitest | config |
| LAS-21: register, verify from the email link, sign in and sign out | Playwright | full UI flow; API accepts then rejects the session; replayed cookie 401 |
| LAS-21: wrong password and unverified email are refused without opening a session | Playwright | UI error states; no cookie set |
| LAS-21: without the account server the studio still plays and says accounts are unavailable | Playwright | guest/local behaviour |

Account Playwright tests run with traces off and enter passwords without putting them in step titles; the HTML report of the tested run contains **no** generated password (`MPSPW-` prefix: 0 occurrences) and no session token value (the only `mps_session=` text is test source code). LAS-25 turns this into a scanner.

## Limits
Development server only: no TLS, no real email delivery (outbox), in-memory rate limits arrive with LAS-22, single process. `node:sqlite` is experimental in Node 22 (warning suppressed in npm scripts). Linux Chromium 141 only.
