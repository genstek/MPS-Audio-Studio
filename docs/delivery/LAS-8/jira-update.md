**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-8

Scope: verified existing WAV import; closed the overlapping-import gap (newest import wins, dispose cancels pending imports); added boundary, header, lifecycle and decoded-metadata tests and an engine-level audio-source probe.
Branch / PR: `feat/LAS-8-import-lifecycle` → `delivery/LAS-40-all-sprints` (PR link in docs/delivery/INDEX.md)
Tested application SHA: 2325073ba12b29e2e4de00f6e36dcb17da5bfcda
Material: docs/delivery/LAS-8/

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 named track | TC-002, playback.spec | PASS | npm-run-check log |
| AC-02 decoded duration/status | stereo 48 kHz + TC-002 | PASS | HTML report |
| AC-03 recoverable errors | TC-003, header and 100 MiB unit tests | PASS | log |
| AC-04 no dangling nodes | probe + unit lifecycle tests, mutation check | PASS (node counts, not sound) | log, evidence/mutation |
| AC-05 synthetic fixtures | tests/fixtures/wav.js | PASS | source |
| AC-06 manual steps | manual-qa.md | prepared; NOT_RUN | this folder |

Commands: `PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run check` exit 0 (Vitest 10/10, Playwright 20/20).
Manual QA: NOT_RUN. Not measured: large-file UI responsiveness. Linux Chromium only.
Disposition: READY_FOR_QA.
