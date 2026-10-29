**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-24

Scope: project deletion removes all file kinds and cancels jobs; password-confirmed account deletion purges everything immediately (audit keeps only a keyed hash for 90 days; backups policy 30 days in production); per-recipient consent required for external processing, withdrawable; no external service is configured (a local test stand-in proves the gate); consent question names recipient, location, retention, purpose; Cancel sends nothing; audit rows hold no audio, credentials, emails or links.
Branch / PR: feat/LAS-24-deletion-consent → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 8cf70845db887661cf7aaed40f8f600fc67788ba

| Criterion | Actual result | Evidence |
| --- | --- | --- |
| AC-01 project deletion | PASS | log |
| AC-02 account deletion schedule | PASS | log, README |
| AC-03 consent; cancel sends nothing | PASS (local stand-in) | HTML report |
| AC-04 messages; clean audit | PASS | screenshots, Vitest |

Commands: npm run check exit 0 (Vitest 63/63, Playwright 47/47, Linux Chromium 141). Manual QA: NOT_RUN.
Disposition: READY_FOR_QA.
