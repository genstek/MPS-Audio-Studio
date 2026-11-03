**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-11

Scope: Pause toggles pause/resume (aria-pressed); Play also resumes; Stop resets. The engine allows one pending start and cancels it on pause/stop/new track/dispose; Playing is shown only after a source really started.
Branch / PR: `feat/LAS-11-pause-toggle` → `delivery/LAS-40-all-sprints` (PR link in docs/delivery/INDEX.md)
Tested application SHA: 760dc13b749ded8f5344d1e98dd9e09bb7fd3c9e

| Criterion | Actual result | Evidence |
| --- | --- | --- |
| AC-01 Pause keeps position | PASS | log, HTML report |
| AC-02 Pause again resumes | PASS (engine start offset ±0.051 s; not a listening test) | HTML report |
| AC-03 Play resumes | PASS (same) | HTML report |
| AC-04 Stop resets | PASS | HTML report |
| AC-05 no overlapping playback | PASS (probe max 1 source; unit guard with mutation checks) | evidence/mutation-* |
| AC-06 regression coverage | PASS (Vitest 14/14, Playwright 23/23) | log |

Note: the Playwright burst test passes even without guards because disabled buttons absorb repeated clicks; the engine guard is proven by unit tests.
Commands: `PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run check` exit 0. Manual QA: NOT_RUN. Linux Chromium only.
Disposition: READY_FOR_QA.
