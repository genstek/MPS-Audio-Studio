**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-22

Scope: recovery with identical answers, single-use 30-minute hashed reset tokens, reset revokes all sessions and mails a notice; session idle 24 h / max 7 days with a "session ended" message; per-address and per-client sliding-window limits with 429 + Retry-After (five failed sign-ins lock an address for 15 min, known or unknown).
Branch / PR: feat/LAS-22-recovery-limits → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: dd277058b443fba083d93ea029982e2008bf6456

| Criterion | Actual result | Evidence |
| --- | --- | --- |
| AC-01 reset; expired/used tokens fail | PASS | log, HTML report |
| AC-02 revocation + next steps | PASS | HTML report |
| AC-03 limits without disclosure | PASS | HTML report |
| AC-04 expiry/tokens/limits/session loss automated | PASS (controlled clock) | Vitest |

Commands: `npm run check` exit 0 (Vitest 35/35, Playwright 42/42, Linux Chromium 141). Manual QA: NOT_RUN.
Limits: in-memory counters (single process), no CAPTCHA, development mail outbox.
Disposition: READY_FOR_QA.
