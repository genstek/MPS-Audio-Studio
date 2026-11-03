**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-34

Scope:
- **Stems…** (mixer heading) opens a stem session through the master chain.
- Each stem has a strip with gain, equal-power pan, mute, solo, whole-sample offset and a real meter; there is a master meter too.
- A shared-clock start for every play, seek and resume, so stems cannot drift.
- An explicit policy for rates, lengths, offsets and channels, explained in the dialog.
- Single-track and stem playback take turns.

Branch / PR: feat/LAS-34-stems → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 98bf1c68e36edc70fa053cb71d41d6c19211e160
Material: docs/delivery/LAS-34/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 start/pause/resume/seek/stop together, no drift | offline Web Audio render through 6 operations: identical sample positions | PASS | evidence/playwright-stems.txt |
| AC-02 gain/pan/mute/solo per channel; real meters | rendered samples; meter readings | PASS | evidence/playwright-stems.txt |
| AC-03 explicit rate/offset/length policy explained | dialog notes; README policy | PASS | evidence/screenshots/ |
| AC-04 fixtures for summing/timing; single-track regressions | suites rerun; full check | PASS | evidence/npm-run-check-98bf1c68e36edc70fa053cb71d41d6c19211e160.log |

Commands/environment: npm run check exit 0 (ESLint clean, Vitest 266/266, build OK, Playwright 79/79, Chromium 141, Linux, Node 22.22); an earlier run failed 6 layout tests (masthead button, moved to the mixer heading); npm run scan:artifacts exit 0 (139 pieces, 0 findings).
Manual QA: docs/delivery/LAS-34/manual-qa.md — QA-01 sync, QA-02 routing and meters, QA-03 mismatches and single-track; Gennady execution NOT_RUN.
Limitations/blockers: not a DAW (no waveform/timeline, sessions not saved); per-stem processing and stem rendering are LAS-35; another-rate stems are resampled by the browser for listening; meters are monitoring peaks; provisional styling; Mac not run.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
