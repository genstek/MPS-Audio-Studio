**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-12

Scope: "Remove track" action and engine `unload()` (stop, cancel pending start and imports, drop buffer, reset position, suspend context; engine remains usable). UI returns to the empty state; focus moves to Import WAV.
Branch / PR: `feat/LAS-12-unload-track` → `delivery/LAS-40-all-sprints` (PR link in docs/delivery/INDEX.md)
Tested application SHA: 4e8a9038bb1393eeb1c6b4c1addb459b209a49d7

| Criterion | Actual result | Evidence |
| --- | --- | --- |
| AC-01 accessible action | PASS | screenshots, log |
| AC-02 playing/paused/stopped, no resume | PASS (probe: 0 playing/connected; not listened) | HTML report |
| AC-03 empty state | PASS | HTML report |
| AC-04 transport disabled | PASS | HTML report |
| AC-05 reimport same/different | PASS | HTML report |
| AC-06 file unchanged, resources | PASS (SHA-256 equal; GC not measured) | HTML report |
| AC-07 deterministic + Playwright coverage | PASS (Vitest 16/16, Playwright 26/26; mutation check) | evidence/mutation |

Commands: `PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run check` exit 0. Manual QA: NOT_RUN. Linux Chromium only.
Disposition: READY_FOR_QA.
