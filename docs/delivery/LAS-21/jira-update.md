**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-21

Scope: development account server per ADR-003 (Node standard library, SQLite, scrypt, hashed single-use verification tokens, HttpOnly SameSite=Lax hashed session, logout revocation, CSRF header/Origin rule, no account enumeration, dev mail outbox, redacted logs) and an accessible Account dialog (sign in, create account, verify/resend, sign out). The studio calls the server only when the dialog opens or a verification link is used; guest playback unchanged.
Branch / PR: feat/LAS-21-accounts → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: ac9ab7c7a1fdfe0165b9e7e171445ae0788a2245

| Criterion | Actual result | Evidence |
| --- | --- | --- |
| AC-01 register + verify (dev mail) | PASS | log, HTML report, screenshots |
| AC-02 login policy | PASS | HTML report |
| AC-03 logout invalidates; protected API rejects | PASS (incl. replayed cookie) | HTML report |
| AC-04 Playwright flows; no secrets in traces/logs/fixtures | PASS (traces off, random passwords, report scan clean) | Vitest secrets test |

Commands: `PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run check` exit 0 (Vitest 26/26, Playwright 39/39).
Manual QA: NOT_RUN. Limits: development only (no TLS, outbox instead of mail); rate limits in LAS-22.
Disposition: READY_FOR_QA.
