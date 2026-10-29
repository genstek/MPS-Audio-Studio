# Privacy rules, data lifecycle and threat model

Status: **proposed** (LAS-20), for Gennady's review. Applies to the browser studio and the development account server of ADR-003. It is a development policy, not a legal privacy notice; production hosting would need its own review.

## Principles
1. **Local first.** Guests and signed-in users work on audio in the browser. Nothing is uploaded unless the user explicitly saves a file to their private library.
2. **Minimum data.** Accounts hold an email address and a password hash. No names, phone numbers, payment data, analytics or tracking.
3. **Owner only.** Every stored item belongs to one account; no sharing feature exists, so no other person can see it.
4. **Explicit consent for third parties.** No audio goes to an external service without a recorded, recipient-specific opt-in given immediately before the transfer. None is configured today.
5. **Deletion propagates.** Deleting a file, project or account removes everything derived from it, with backup expiry stated honestly.

## Data-flow inventory
| Data | Where it lives | Who can read it | Created by | Leaves the device / server? |
| --- | --- | --- | --- | --- |
| Source WAV chosen for playback | Browser memory only (File handle + decoded AudioBuffer) | The page | Import | Never in local use (verified by `tests/e2e/local-only.spec.js`) |
| Original file on disk | User's device | User | — | Never written by the studio (LAS-12 hash test) |
| Account: email, scrypt hash, salt, verified flag, timestamps | Server SQLite `users` | Server only | Register | No |
| Session tokens | Browser cookie (HttpOnly); server stores SHA-256 only | Server | Login | No |
| Verification / reset tokens | Email (dev outbox); server stores SHA-256 only | Recipient of the mail | Register / recover | Dev: stays in local outbox. Prod: mail provider (external setup) |
| Projects (name) | Server SQLite `projects` | Owner | User | No |
| Library audio (source, reference, stem, preview, export copies) | Server `blobs/` with random names; metadata in `assets` | Owner via session + signed link | Explicit "Save to library" | No |
| Upload temporary files | Server `tmp/` | Server | Upload | Deleted after validation or failure |
| Processing jobs and results (levels) | Server SQLite `jobs` | Owner | Owner request | No |
| Consents | Server SQLite `consents` | Owner | Owner | No |
| Audit events (type, hashed user id, item id, time) | Server SQLite `audit` | Server operator | Server | No; never contain audio, passwords, tokens or signed URLs |
| Server logs | Process stdout | Operator | Server | No; request logs show method, path without query, status, duration |
| Server secret (link signing) | `MPS_DATA_DIR/server-secret` (0600) | Server | First start | Never sent to the browser |
| Test artifacts (Playwright report, traces) | Developer machine | Developer | Test runs | Only if someone attaches them; auth tests disable traces (LAS-21) and LAS-25 scans artifacts |
| Backups | None in development | — | — | Production: encrypted, expire after 30 days (to be configured) |

## Trust boundaries
1. **Browser ↔ device:** the studio reads files the user picks; it never writes to them.
2. **Browser ↔ studio server (same origin `/api`):** authenticated by session cookie; state-changing requests need `X-MPS-Request: 1` and an allowed `Origin`. Audio crosses only on explicit library upload, owner download, or deletion requests.
3. **Studio server ↔ storage:** the server alone touches SQLite and blobs; paths are generated, never taken from users.
4. **Studio server ↔ external services:** mail provider (production) and future processing services. Audio crosses this boundary only after consent for that recipient.

## Retention and deletion
| Item | Retention | Deletion |
| --- | --- | --- |
| Session | Until logout, 24 h idle or 7 days absolute | Logout deletes it; password reset and account deletion delete all |
| Verification token | 24 h, single use | Deleted on use; expired rows purged by a sweep |
| Reset token | 30 min, single use | Deleted on use or replaced by a newer request |
| Development mail outbox | 24 h | Purged by the sweep; deleted with the account |
| Library audio and metadata | Until the user deletes it | File/project deletion removes blobs and rows at once and cancels running jobs |
| Account | Until the user deletes it (password required) | Immediate purge of users, sessions, tokens, projects, assets, blobs, jobs, consents, outbox entries; audit keeps only a hashed id for 90 days |
| Backups (production only) | Up to 30 days | Deleted data disappears from backups when they expire; it is **not** erased from existing backups immediately |
| Audit events | 90 days | Sweep |

## External processing consent
- A consent names one recipient, its location and its retention, and is given in a dialog that also offers Cancel. Cancel sends nothing.
- The server refuses an external job without an active consent for that recipient (`403`), and a consent can be withdrawn at any time.
- No external recipient exists in this delivery; a local test recipient that records "transmissions" in a table lets the rule be tested without the network.

## Local-only mode (verifiable no-upload expectation)
Using the studio without signing in, and without using "Save to library", is local-only mode. `tests/e2e/local-only.spec.js` records every request during import → play → pause → stop → remove and fails on any non-GET request, any request body or any other origin; a negative control that adds an upload makes it fail. Future analysis, preview and export steps must be added to this test as they appear.

## Threat model
| Threat | Example | Control | Test owner |
| --- | --- | --- | --- |
| Account takeover: password guessing | Credential stuffing on login | scrypt hashing; generic "email or password is incorrect"; per-email and per-IP limits with 429 | LAS-22 `tests/server/auth.test.js` (limits), LAS-25 |
| Account takeover: session theft | Script reads the cookie; database leak | HttpOnly SameSite=Lax cookie; only token hashes stored; expiry and revocation | LAS-21/22 `tests/server/auth.test.js` |
| Account takeover: recovery abuse | Reused or guessed reset link; probing which emails exist | 32-byte single-use hashed tokens, 30 min; identical answers; reset revokes sessions | LAS-22 `tests/server/auth.test.js`, `tests/e2e/account.spec.js` |
| Cross-site request forgery | Another site posts to `/api` with the user's cookie | Custom header + Origin allow-list, no CORS | LAS-21 `tests/server/auth.test.js`, LAS-25 matrix |
| Cross-user access by guessing IDs | User B requests A's project/asset/job/download | Owner filter in every query; random IDs; same 404 as missing | LAS-23 `tests/server/storage.test.js`, LAS-25 `tests/server/authorization-matrix.test.js` |
| Shared or leaked links | A download URL is pasted elsewhere | No sharing feature; links expire in 5 min, are bound to asset and owner, and also require the owner's session | LAS-23, LAS-25 |
| Malicious or malformed audio | Disguised file, huge chunk sizes, endless chunk lists, wrong extension, path in file name | Size cap while streaming, bounded RIFF parser, generated storage names; browser decoding stays in the browser sandbox | LAS-23 `tests/server/storage.test.js`, LAS-8/LAS-10 browser tests |
| Resource exhaustion | Very large uploads or JSON bodies | 100 MiB upload cap, 64 KiB JSON cap, analysis job time limit and cancellation | LAS-23 |
| Secrets in logs or artifacts | Password in a trace, token in a log line, signed URL in audit | Log redaction (no query strings), audit without secrets, auth tests without traces, artifact scanner | LAS-21, LAS-25 `scripts/scan-artifacts.mjs` |
| Secrets in the browser bundle | Server secret or env values compiled into `dist/` | Server code is not imported by the client; build scan | LAS-25 |
| Backups | Old copies of deleted data | None in dev; production backups encrypted with 30-day expiry stated to users | Operational, production decision |
| Unconsented third-party processing | Audio sent to an AI service by default | Consent per recipient, Cancel sends nothing, server-side refusal without consent | LAS-24 `tests/server/privacy.test.js`, `tests/e2e/library.spec.js` |
| Supply chain | Compromised server dependency | Server uses only the Node standard library | LAS-25 dependency check |

Residual risks (accepted for development): in-memory rate limits reset on restart; no TLS in local development; `node:sqlite` is experimental; no intrusion detection; a stolen unlocked computer with an active session can use the account until expiry or logout.
