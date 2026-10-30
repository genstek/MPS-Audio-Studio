**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-35

Scope:
- **Per-stem chains** (bypass / master copy / settings or preset file) live on each strip, with the same constant latency so stems stay aligned.
- **Stem session files** (`mps-stem-session` v1, checksum-matched, no audio) for recall.
- **Offline stem master render** in a worker: combined master plus per-stem strip files, session-long, latency compensated, chain tails to the session end, at the files' own rate; clipping counted, never normalised; mixed rates and more than 2 channels refused.
- Live and offline mixes are identical to 1.19e-7.

Branch / PR: feat/LAS-35-stem-processing → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82
Material: docs/delivery/LAS-35/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 own chain/bypass/saved parameters per stem | unit + browser; recall | PASS | evidence/vitest-stems-verbose.log |
| AC-02 latency compensated, alignment in preview and export | impulse alignment; live/offline 1.19e-7 | PASS | evidence/playwright-stem-render.txt |
| AC-03 exports: duration, channels, rate; headroom/clipping documented | downloads decoded and compared (5.96e-8) | PASS | evidence/playwright-stem-render.txt |
| AC-04 known mixtures; mute/solo, recall, failures, originals preserved | unit + browser | PASS | evidence/vitest-stems-verbose.log |

Commands/environment: npm run check exit 0 (ESLint clean, Vitest 275/275, build OK, Playwright 81/81, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (145 pieces, 0 findings).
Manual QA: docs/delivery/LAS-35/manual-qa.md — QA-01 chains and recall, QA-02 alignment, QA-03 rendered files in a DAW; Gennady execution NOT_RUN.
Limitations/blockers: no per-stem editor panel (chains from master or file); no resampling for export; per-stem files for audible stems only; files downloaded one by one; sessions not stored in the account; no listening review; provisional styling; Mac not run.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
