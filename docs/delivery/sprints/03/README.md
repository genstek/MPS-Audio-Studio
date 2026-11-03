# Sprint group 03 — Audio analysis, validated DSP chain, design system gate

Native sprint: LAS Sprint 03 (ID 4, **future** — not started, closed or re-dated by this work).

**Tested integration commit:** `5683a978fcdafad4b8cc20f0ef0740fd1c6db41c` on `delivery/LAS-40-all-sprints` — `npm run check` exit 0 (2026-10-29, finished 23:25 UTC): ESLint clean, Vitest 181/181 (10 files), Vite build, Playwright 56/56 on Linux Chromium 141; `npm run scan:artifacts`: 117 pieces, 0 findings — `evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-26 analysis: loudness, true peak, dynamics, stereo, spectrum | IMPLEMENT | `feat/LAS-26-analysis` → [#29](https://github.com/genstek/MPS-Audio-Studio/pull/29) | a21e687 | READY_FOR_QA (EBU 3341/3342 tests, FFmpeg ebur128 cross-check 24/24) | NOT_RUN |
| LAS-27 EQ, compressor, limiter chain | IMPLEMENT | `feat/LAS-27-processing-chain` → [#30](https://github.com/genstek/MPS-Audio-Studio/pull/30) | 23865e4 | READY_FOR_QA — engine slice; worklet preview = offline render (difference 0); 1 defect found and fixed | NOT_RUN |
| LAS-44 design system and hi-fi screens | DESIGN_REVIEW_REQUIRED | — (status documents only) | — | **BLOCKED** — LAS-42 direction and LAS-43 walkthrough pending | PENDING |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 5683a978fcdafad4b8cc20f0ef0740fd1c6db41c
npm ci
npm run dev                                   # studio; Import a WAV → Analyze
npm run check && npm run scan:artifacts
npm run crosscheck:analysis -- ./crosscheck   # needs FFmpeg on PATH (development tool only)
npm run characterize:chain -- ./chain-report  # numerical report of the processing chain
```
No migrations in this group: the account database stays at schema v3. Chain settings start at schema `mps-chain` v1.

## Regressions
None. All foundation, sprint 01 and sprint 02 tests pass unchanged. Visible change: a track now shows **Analyze** next to **Remove track**. At 320 px the heading buttons wrap; this is covered by a new layout test. The processing chain is not wired into playback yet (LAS-28).

## Blockers and decisions for Gennady
1. LAS-42 direction and LAS-43 walkthrough. LAS-44, and later LAS-45, wait on both.
2. From earlier groups: approve ADR-003 and the privacy policy; production release gates in LAS-25.

## Suggested manual QA order
LAS-26-QA-01..03 (make the test tone with the FFmpeg command in `docs/delivery/LAS-26/manual-qa.md`) → LAS-27-QA-01..03 → LAS-42/43/44 design reviews. All **Not Run**.
