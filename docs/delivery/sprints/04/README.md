# Sprint group 04 — Mastering controls, level-matched A/B, WAV export, DSP fixtures, studio shell gate

Native sprint: LAS Sprint 04 (ID 5, **future** — not started, closed or re-dated by this work).

**Tested integration commit:** `6ffe099917fa6c7fe673581c5933cdb069179c2b` on `delivery/LAS-40-all-sprints` — `npm run check` exit 0 (2026-10-30, finished 03:10 UTC): ESLint clean, Vitest 208/208 (13 files, including the LAS-29 golden regression), Vite build, Playwright 63/63 on Linux Chromium 141; `npm run scan:artifacts`: 124 pieces, 0 findings — `evidence/`.

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady |
| --- | --- | --- | --- | --- | --- |
| LAS-28 controls, level-matched A/B, processed WAV export | IMPLEMENT | `feat/LAS-28-controls-ab-export` → [#31](https://github.com/genstek/MPS-Audio-Studio/pull/31) | c43345d | READY_FOR_QA — export equals the offline chain; independent FFmpeg/ffprobe inspection; limiter 8× detection fix (found by FFmpeg) | NOT_RUN |
| LAS-29 DSP fixtures, golden harness, listening protocol | VALIDATE_IMPLEMENTATION | `test/LAS-29-dsp-fixtures` → [#32](https://github.com/genstek/MPS-Audio-Studio/pull/32) | 0c961b9 | READY_FOR_QA — 96 renders, 0 findings, FFmpeg PASS; listening review NOT_RUN; Lia v6 reference blocked on the authorized file | NOT_RUN |
| LAS-45 approved studio shell and components | GATED_IMPLEMENTATION | — (status documents only) | — | **BLOCKED** — needs an approved LAS-44 design | PENDING |

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints && git switch --detach 6ffe099917fa6c7fe673581c5933cdb069179c2b
npm ci
npm run dev                                  # Import a WAV → Mixer: Edit EQ / dynamics / limiter → Processed/Original → Export WAV
npm run check && npm run scan:artifacts
npm run dsp:regression -- --out ./dsp-regression --ffmpeg
npm run listening:set -- song.wav --settings mps-chain-settings.json --start 60 --duration 20
```
No database migrations in this group. Chain settings files use schema `mps-chain` v1. The golden results file is version 1.

## Regressions and behaviour changes
- No test regressions. Tests that described the old placeholders now describe the real controls:
  - strip names and buttons;
  - the Export WAV name;
  - the LAS-51 Tab budget, from 4 to 12.

  The layout guarantees are unchanged; see the LAS-28 README.
- Playback now goes through the processing chain. The default limiter at −1 dBTP is audible on tracks that peak above it; **Original** plays the untouched audio.
- Files with more than two channels play as a stereo downmix.
- The limiter now detects at 8× (true peaks stay under the ceiling on finer meters). Chain throughput is about half what it was in LAS-27, still well above real time.

## Blockers and decisions for Gennady
1. Design gates: LAS-42 direction → LAS-43 walkthrough → LAS-44 approval. LAS-45, and later LAS-46/47, wait on these.
2. LAS-29: the authorized Lia v6 file and its SHA-256, if the reference should be part of the listening review; and the listening session itself.
3. From earlier groups: approve ADR-003 and the privacy policy; production release gates in LAS-25.

## Suggested manual QA order
LAS-28-QA-01..03 (EQ editing/undo, A/B with matching, export inspection) → LAS-29-QA-01 (regression on the Mac) → LAS-29-QA-02 (blind listening per `docs/delivery/LAS-29/listening-protocol.md`). All **Not Run**.
