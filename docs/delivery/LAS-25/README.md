# LAS-25 — Authentication, cross-user isolation and sensitive-data validation

Jira: [LAS-25](https://genstek69.atlassian.net/browse/LAS-25) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-25.md` · Mode: VALIDATE_IMPLEMENTATION · Prerequisites LAS-22, LAS-23, LAS-24

Branch `test/LAS-25-security-baseline` · tested application commit `d2d415d873d5efe626e39041fa4c200366136dbc`

Developer status: **READY_FOR_QA** (technical validation; this is not Gennady's sign-off and does not claim zero risk) · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What was validated
1. **Two-account authorization matrix** (`tests/server/authorization-matrix.test.js`): 20 operations × anonymous, idle-expired (24 h), signed-out (revoked), other user and owner. Destructive operations are tried by every other caller first, and the owner's file is checked intact before each owner action. Observed statuses: [`evidence/authorization-matrix-observed.md`](evidence/authorization-matrix-observed.md) — every stale or missing session gets 401, the other user gets 404 for everything of the owner's (or acts only on their own account/consents), the owner gets 2xx.
2. **Direct API regression suites** already in place: auth (LAS-21), recovery/expiry/limits (LAS-22), storage incl. a 12-operation cross-user test, 13 malformed uploads and proxy behaviour (LAS-23), deletion/consent/audit (LAS-24); UI coverage in Playwright (account, recovery, library, privacy, local-only).
3. **Artifact, bundle and log scan** (`npm run scan:artifacts` → `scripts/scan-artifacts.js`): HTML report incl. its embedded ZIP, traces, `dist/` and the test server's request log (`.data/e2e/server.log`), for generated test passwords, session tokens, the server secret, private keys, one-time email tokens, download signatures, server-only code in the client bundle and unexpected log lines. On the tested commit: 113 pieces scanned, **0 findings** (`evidence/scan-artifacts-d2d415d873d5efe626e39041fa4c200366136dbc.json`). Negative control: planted fake password/session token/reset token in a file and a ZIP → all caught, exit 1 (`evidence/scanner-negative-control/`).
4. **Dependencies and configuration**: `npm audit --omit=dev` 0 vulnerabilities (runtime: react, react-dom); full `npm audit` 0; the server has no runtime dependencies. Development endpoints exist only with `MPS_DEV_ENDPOINTS=1` (tested 404 otherwise); the data reset guard refuses folders outside `.data/` or the temp folder.

## Findings
| ID | Severity | Status | Finding | Reproduction / evidence |
| --- | --- | --- | --- | --- |
| F-01 | Medium | **Fixed** in this slice | Registration hashed the password only for new addresses; an existing address answered in ~7 ms instead of ~70 ms, so timing revealed which emails have accounts | `tests/server/security.test.js`; on the old code: "existing 6,7,9 ms vs new 86,74,63 ms" (`evidence/timing-old-code/vitest.log`) |
| F-02 | Medium | **Fixed** in this slice | Verification and reset links carried the token in the query string, which reaches web-server/proxy access logs and appeared in Playwright report step titles (13 tokens found by the first scan) | tokens now in the URL fragment (`/#verify=`, `/#reset=`); rescan 0 findings; account tests check the fragment is cleared |
| F-03 | Major (UI) | Fixed in LAS-23 | Refused uploads lost their 401/404 behind the dev proxy (EPIPE → 500) | `docs/delivery/LAS-23/` |
| F-04 | Low | Open (test only) | The LAS-23 cancelled-job test raced the job under load ("done" instead of "cancelled") | fixed with the job gate in this slice; 4/4 full unit runs green |
| F-05 | Medium (production) | Open — release gate | No TLS in development; the session cookie's `Secure` flag is set only with `MPS_COOKIE_SECURE=1` | ADR-003 |
| F-06 | Medium (production) | Open — release gate | No Content-Security-Policy, HSTS or frame-ancestors headers for the static studio (the API sends nosniff, no-store, no-referrer, DENY) | host configuration at deployment |
| F-07 | Low | Accepted | Rate limits are in memory: reset on restart, not shared between processes | ADR-003, `server/limits.js` |
| F-08 | Low | Accepted | Per-address sign-in lock lets someone who knows an address block its sign-in for 15 minutes | LAS-22 README |
| F-09 | Low | Accepted | Level analysis runs inside the server process (bounded by streaming, 60 s limit and cancellation, not a sandbox) | LAS-23 README |
| F-10 | Low | Accepted | `node:sqlite` is experimental in Node 22 | ADR-003 |
| F-11 | Info | Accepted | Recovery/resend for known vs unknown addresses differ by one database write (well under a millisecond) | code review |
| F-12 | Info | Accepted | Over-limit uploads (413) close the connection; through a proxy a client may see a generic error (the studio refuses files over 100 MiB before upload) | LAS-23 README |

## Release gates (before any deployment — none is part of this delivery)
1. HTTPS with `MPS_COOKIE_SECURE=1`; CSP/HSTS at the host (F-05, F-06).
2. `MPS_DEV_ENDPOINTS` and `MPS_TEST_RECIPIENT` unset; a real mail provider configured.
3. Shared rate-limit store if more than one server process runs (F-07); backups encrypted with 30-day expiry (privacy policy).
4. On the release candidate: `npm run check`, `npm run scan:artifacts` (0 critical), `npm audit --omit=dev` clean, and Gennady's manual QA of LAS-21–24.
