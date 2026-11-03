# LAS-66 — Sprint 10 QA acceptance and regression coverage

Jira: [LAS-66](https://genstek69.atlassian.net/browse/LAS-66) · Sprint 10 package · Mode: QA

Branch `delivery/LAS-40-sprint-10` → [PR #45](https://github.com/genstek/MPS-Audio-Studio/pull/45) (base `delivery/LAS-40-all-sprints`, not main) · tested application commit `2c5d0ce`

Developer status: **IN_PROGRESS**. The automated acceptance and regression has been executed. The entry criterion "approved relevant designs" is not met, so design acceptance for LAS-44/45 cannot run yet. Gennady's manual, design and listening results: **NOT_RUN**.

## What this issue delivers
| Item | Where |
| --- | --- |
| Acceptance-mapped coverage matrix for LAS-60/61/62/63/64/65/67/68/69/70/71 and LAS-44/45, plus the retained regressions | [`acceptance.md`](acceptance.md) |
| Consolidated manual checklist, with web, design selection, listening and wrapper results kept separate (all NOT_RUN) | [`manual-qa.md`](manual-qa.md) |
| Executed regression on the final commit: logs and summary | [`../sprints/10/`](../sprints/10/) |
| Defects found by this regression and by the PR #45 reviews, with fixes and tests | below |

## Executed automated results (final commit)
| Check | Command | Exit | Result | Log |
| --- | --- | --- | --- | --- |
| Lint | `npm run lint` (in `npm run check`) | 0 | no findings | `../sprints/10/final/npm-run-check-2c5d0ce.log` |
| Unit and DSP tests | `npm run test:unit` (in `npm run check`) | 0 | 313/313 in 26 files | same; per test: `../sprints/10/final/vitest-verbose-2c5d0ce.log` |
| Build | `npm run build` (in `npm run check`) | 0 | built | same |
| Browser | `npm run test:e2e` (in `npm run check`), 2 workers | 0 | **119/119** in 8.2 min | same |
| Artifact scan | `npm run scan:artifacts` | 0 | 159 pieces, 0 findings | `../sprints/10/final/scan-artifacts-2c5d0ce.log` |
| DSP regression | `npm run dsp:regression` | 0 | 120 renders (96 earlier + 24 Space), 0 findings, 0 golden differences | `../sprints/10/final/dsp-regression-2c5d0ce.log` |

Before the review fixes, the full browser run on the LAS-70 tree (`1146068`) was **116/118**. Its 2 failures are kept in `../sprints/10/runs/e2e-1146068-before-review-fixes.log`:
- LAS-26: a 212 ms main-thread task.
- LAS-64: the speakers tail read −70.23 dBFS.

Both were root-caused and fixed (see LAS-66), not re-run until green.

Environment:
- OS: Ubuntu 24.04.5 (Linux 6.18, x86_64), 4 CPUs.
- Runtime: Node 22.23.4.
- Browser: Chromium 153.0.8010.12, headless, through `PLAYWRIGHT_EXECUTABLE_PATH`.
- Test tools: Playwright 1.64.1 with 2 workers; Vitest 5.0.5; Vite 8.3.4.
- Viewport: 1280×720 by default (DPR 1, zoom 100 %). The viewport suites set 320–1440 px widths and 450–1080 px heights.
- Fixtures: synthetic WAVs only (`tests/fixtures/wav.js`, `tests/fixtures/large-wav.js`).
- Audio: no audio device. Meters read the samples sent to the destination.

## Defects found during Sprint 10 QA, and their fixes
| Found by | Defect | Fix | Test |
| --- | --- | --- | --- |
| Full regression (LAS-26 test) | Main-thread tasks up to 212 ms while analysing during playback. Every 100 ms position tick re-rendered the whole studio. Baseline `0296386` had no long tasks | `2c5d0ce`: the position moved to a small store; the spectrum is sized by a ResizeObserver. Afterwards: 0 long tasks in 3 runs | `analysis.spec.js` (LAS-26) |
| Full regression (LAS-64 test) | The speakers measurement depended on scheduling (−70.23 dBFS against a −70 bound under load) | `159e902`: readings on the audio clock in a window placed by the signal; bound unchanged | `space.spec.js` |
| Codex review, P1 | Section renders (Compare, proposal checks) missed reverb started before the section | `d65775b`: the pre-roll adds Space pre-delay + decay | `space.test.js` |
| Codex review, P1, and Cursor Bugbot | The same WAV on two stems collapsed into one strip on relink | `e42b2ff`: each strip is relinked through its own slot | `project.spec.js` |
| Codex review, P2 | A same-name, same-size track replacement looked saved | `e42b2ff`: a media identity in the unsaved-changes key | `project.test.js`, `project.spec.js` |
| Cursor Bugbot | Holding FF through the end kept moving the playhead after playback stopped | `2c5d0ce`: a held button stops at the track ends | `player.spec.js` |
| Sprint 10 feature work | Mixer Undo shortcut handler threw when the event target was the document; Play from the end did not show the new position at once; Help view did not return focus | fixed in the feature commits before review | covered by the feature suites (`player.spec.js`, `help.spec.js`) |

## Unresolved and out of scope here
- **LAS-44/45 visual acceptance:** blocked on Gennady's selection of a design.
- **LAS-59 (macOS ECONNRESET on the streamed oversize test):** not reproducible here; there is no macOS in this environment. The Linux assertion passes unchanged.
- **Real Chrome on macOS, Safari, Firefox, iOS and the Apple wrapper (PR #43 / LAS-58):** NOT_RUN. PR #43 was inspected, not merged.
- **Listening:** NOT_RUN. Build and test passes do not establish sound quality.
- **Native file pickers:** exercised with an in-memory stand-in, because a headless browser cannot drive native dialogs. The download fallback ran for real.
- **Help coverage:** parameter-level ⓘ icons inside the older dialogs (Stems, Compare, References, Account, Settings, Analyze) are not added yet; see `../LAS-70/coverage-inventory.md`.
