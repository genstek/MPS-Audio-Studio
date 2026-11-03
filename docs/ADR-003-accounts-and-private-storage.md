# ADR-003: accounts, sessions and private storage

Date: 2026-10-29. Status: **proposed** for Gennady's review (LAS-19). Implemented in development form by LAS-21–LAS-25 on `delivery/LAS-40-all-sprints`; nothing is deployed.

## Context

Until now the studio is a static browser app: audio is decoded and played locally and never leaves the device (ADR-002). Sprint 01–02 stories need accounts (LAS-21/22), private storage with ownership checks (LAS-23), deletion and consent (LAS-24) and a two-user security baseline (LAS-25). ADR-002 allows a backend only with a concrete requirement and a separate decision; this is that decision.

Constraints from the work orders: no fake browser-flag or localStorage authentication; secrets stay on the server; guest/local playback keeps working without any account or server; a runnable development setup with test mail; no paid provider, purchase or production deployment in this delivery.

## Options considered

| Option | For | Against | Decision |
| --- | --- | --- | --- |
| Hosted auth/storage provider (e.g. Supabase, Firebase, Auth0 + S3) | Mature flows, managed mail and backups | Needs an account, credentials and network in every test run; costs; cannot run in this container; data leaves the device by design | Not now. Revisit for production hosting. |
| Self-hosted Node server with an auth library (e.g. Lucia/Passport) + a database package | Familiar patterns | Extra dependencies (native SQLite builds, ORM); library churn (Lucia was deprecated in 2025) | Not needed for the scope. |
| **Self-hosted Node server, standard library only** (`node:http`, `node:crypto`, `node:sqlite`) | Zero runtime dependencies; runs anywhere the app runs (Node 22.13+); tests start real servers on random ports; every rule is visible and testable | We own the security code; `node:sqlite` is marked experimental in Node 22; no production mail, TLS, backups or scaling | **Chosen for development**; production hosting is a later decision. |

## Decision

- **Server:** `server/` — an ES-module Node HTTP server with no runtime dependencies. `npm run server` starts it on `127.0.0.1:8787`. Vite's dev server proxies `/api` to it, so the browser talks to one origin (no CORS). The studio still loads and plays audio when the server is not running; account features then say "Accounts are unavailable".
- **Data:** SQLite file `studio.sqlite` and private audio blobs in `MPS_DATA_DIR` (default `.data/dev`, git-ignored). The schema is versioned with forward migrations (`server/db.js`). Audio blobs get random file names; user file names are metadata only and never become paths.
- **Server secret:** 32 random bytes in `MPS_DATA_DIR/server-secret` (created on first start, mode 0600, never committed, never sent to the browser). It signs download links.
- **Passwords:** `scrypt` (N = 2^15, r = 8, p = 1, 64-byte key, 16-byte random salt per user), length 10–128 characters, compared with `timingSafeEqual`.
- **Sessions:** 32 random bytes in an `HttpOnly; SameSite=Lax; Path=/` cookie `mps_session` (`Secure` when `MPS_COOKIE_SECURE=1`, required behind HTTPS). The database stores only the SHA-256 of the token. Idle timeout 24 h, absolute lifetime 7 days. Logout deletes the session; a password reset or account deletion deletes all of the user's sessions.
- **CSRF and cross-origin:** every state-changing request must carry `X-MPS-Request: 1` and, when present, an `Origin` from `MPS_ALLOWED_ORIGINS` (default the local 5173/5174 dev origins). The server sends no CORS headers, so other sites cannot send the custom header.
- **Email:** development mode writes messages to an outbox table. `GET /api/dev/outbox` exists only when `MPS_DEV_ENDPOINTS=1` (set by the test and dev scripts). A real mail provider (SMTP/API key) is an external setup item.
- **Verification policy:** registration answers the same, and takes as long, whether the address is new or already registered (no account enumeration); emailed tokens travel in the URL fragment (`/#verify=…`, `/#reset=…`), so they never reach a server or its logs (LAS-25); verification tokens are single-use, stored hashed and expire after 24 h. Login with a correct password but an unverified address is refused with "Verify your email first" and a resend option.
- **Recovery:** requests always get the same answer; reset tokens are single-use, hashed, expire after 30 min; a successful reset revokes every session of that user.
- **Abuse limits:** in-memory sliding windows per email and per client IP for login, registration, verification resend and recovery (limits in `server/limits.js`); limited requests get `429` with `Retry-After`. Limits reset when the server restarts — acceptable for one development process, not for a cluster.
- **Ownership:** every project/asset/job query filters by the session's user id at the database layer. Another user's id gives the same `404` as a missing one.
- **Uploads:** raw `audio/wav` bodies up to 100 MiB (configurable), streamed to a temporary file with a hard byte limit, then checked by a bounded RIFF/WAVE chunk parser (PCM or IEEE float, 1–8 channels, 8–192 kHz, data chunk consistent with the file size). Invalid files are deleted.
- **Downloads:** owners request a link signed with HMAC-SHA256 over asset id, owner and expiry (5 min). The download endpoint needs both a valid unexpired signature and the owner's session. No public or shared links exist.
- **Processing jobs:** the server's only job today is a real streaming level analysis (peak and RMS per channel) of the owner's uploaded WAV; it can be cancelled. Mastering DSP stays in the browser (LAS-27+).
- **External processing:** the server never sends audio to a third party without a recorded, recipient-specific consent. No external recipient is configured in this delivery. A local test recipient (`MPS_TEST_RECIPIENT=1`) records "transmissions" in a table so the consent rule can be tested without the network.

## Guest and local behaviour

Guests (no account) can import, play, pause, stop and remove local WAV files exactly as before; nothing is uploaded. Saving a file to the private library is an explicit, signed-in action that says where the file goes and how long it is kept. The LAS-10 exercises and every existing test keep running without accounts.

## Session and endpoint matrix

See `docs/delivery/LAS-19/README.md` for the flow diagram and the full endpoint × caller matrix (anonymous, unverified, verified owner, other user, expired/revoked session).

## Consequences, costs and rollback

- No money is spent; production needs HTTPS hosting, a mail provider, backups and monitoring — **external setup blockers**, not done here.
- Security code is ours: LAS-25 adds a two-user regression suite, log and bundle checks. `node:sqlite` prints an experimental warning; if its API changes, the storage layer (`server/db.js`) is the only place to adapt.
- **Rollback:** the server is additive. Stop `npm run server`, remove the `/api` proxy and the account button, and delete `MPS_DATA_DIR`; the static studio and its tests are unaffected.
