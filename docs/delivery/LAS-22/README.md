# LAS-22 — Password recovery, session expiry and abuse controls

Jira: [LAS-22](https://genstek69.atlassian.net/browse/LAS-22) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-22.md` · Mode: IMPLEMENT · Prerequisite LAS-21

Branch `feat/LAS-22-recovery-limits` · tested application commit `dd277058b443fba083d93ea029982e2008bf6456`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Behaviour
- **Recovery** (`POST /api/auth/recover`): the same 202 answer for any address; an existing account gets a reset link (single-use, stored as a hash, 30 minutes; a newer request replaces older links).
- **Reset** (`POST /api/auth/reset`): the new password is checked first, so a typo does not burn the link; then the password changes, the address counts as verified (the link proved it), **every session of the account is deleted** and a "password was changed" notice is mailed.
- **Session expiry** (from LAS-21, now tested): 24 h without activity or 7 days after sign-in at most, whatever the activity. The studio says "Your session has ended. Sign in again." when the server no longer accepts a session the page had.
- **Abuse limits** (`server/limits.js`, in-memory sliding windows; 429 with `Retry-After`):

| Limit | Value |
| --- | --- |
| Failed sign-ins per address (known or unknown) | 5 per 15 min, then the address waits — even with the right password |
| Failed sign-ins per client IP | 50 per 15 min |
| Registrations per address / per client | 3 / 10 per hour |
| Verification + recovery mails per address / per client | 3 / 20 per hour |
| Verify/reset token attempts per client | 30 per 15 min |

Per-address limits apply to unknown addresses the same way, so they do not reveal whether an account exists. Trade-off: someone who knows your address can make you wait 15 minutes; documented and accepted for development. Behind the Vite proxy every request comes from 127.0.0.1, so per-client limits act as global limits in development; `MPS_LIMIT_SCALE` (tests: 20) scales only per-client limits.

- **Studio**: "Forgot password?" → "Reset your password" (email) → mail link → "Choose a new password" (token kept in memory and removed from the address bar) → "Password changed… signed out everywhere else."; invalid or used links show "This reset link is invalid or has expired. Request a new one." with a button to do that.

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| a reset link changes the password and signs out every session | Vitest | AC-01/02, revocation on two devices, notice mail |
| reset links are single-use, expire after 30 minutes, are replaced by a newer request and cannot be forged | Vitest (clock) | AC-01 |
| a too-short new password does not use up the link | Vitest | AC-01 safe failure |
| recovery answers the same for unknown addresses and sends them nothing | Vitest | AC-03 enumeration |
| a session ends after 24 hours without activity; activity keeps it alive but never past 7 days | Vitest (clock) | AC-04 expiry |
| five failed sign-ins lock that address for 15 minutes, known or unknown | Vitest (clock) | AC-03, Retry-After, unlock |
| recovery and verification mails are limited per address and per client; registration per client | Vitest | AC-03 |
| LAS-22: reset a forgotten password from the email link; other sessions are signed out | Playwright (two browser contexts) | AC-01/02/04, session-ended message, old password refused |
| LAS-22: used and forged reset links are refused with a way to ask again | Playwright | AC-01 |
| LAS-22: repeated wrong passwords are throttled, for unknown addresses too | Playwright | AC-03 |

Time-based rules are tested with a controlled server clock (no sleeps). Account Playwright files keep no traces.

## Limits
In-memory limits reset when the server restarts and do not work across several server processes; no CAPTCHA; development mail outbox only. Linux Chromium 141.
