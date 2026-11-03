# LAS-29 — DSP regression fixtures and a mastering listening-review protocol

Jira: [LAS-29](https://genstek69.atlassian.net/browse/LAS-29) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-29.md` · Mode: VALIDATE_IMPLEMENTATION · Prerequisite: LAS-28 (READY_FOR_QA)

Branch `test/LAS-29-dsp-fixtures` · tested commit `0c961b92d61c45cdda40c3bf505d1ac63721243c`

Developer status: **READY_FOR_QA** for the automated benchmark and the prepared protocol · Listening review: **NOT_RUN** (needs Gennady) · Lia v6 reference comparison: **BLOCKED** until the authorized file and its checksum are provided · Jira sync: **SYNC_PENDING**

## What was built
| Part | Where | Purpose |
| --- | --- | --- |
| Versioned fixtures `mps-fixtures-1` | `tests/fixtures/dsp-fixtures.js` | 12 deterministic signals at 44.1 and 48 kHz, generated from code (no audio files, no recorded material): silence; impulse; tones at 100 Hz, 1 kHz and 10 kHz; log sweep; inverted and quadrature stereo; left-only; transients (clicks and decaying bursts); a music-like programme (chords, bass, kick/snare/hat, formant voice, panning); the same programme 9 dB hot (overs) |
| Presets | `tests/harness/presets.js` | bypass; shipped defaults; a full master (HP, shelves, bell, RMS compressor, +4 dB into the limiter); independent L/R EQ |
| Independent render checks | `tests/harness/render-checks.js` | From the samples only: NaN/Inf, channel count, length, bypass identity, unintended clipping (more full-scale samples than the input), true peak over the ceiling (+0.1 dB), timing by cross-correlation on broadband fixtures (±1 sample), channel mapping (left-only stays left) |
| Golden results v1 | `tests/golden/dsp-golden.json` | 96 renders (12 fixtures × 4 presets × 2 rates): length, channels, integrated loudness, true peak, sample peak, RMS per channel, correlation, clipped and non-finite counts, and the SHA-256 of the 24-bit export; fixture PCM hashes |
| Harness | `scripts/dsp-regression.js` (`npm run dsp:regression`) | Full run with report; optional FFmpeg ebur128 cross-check (`--ffmpeg`); `--update --reason` writes a new golden version |
| Blind listening sets | `scripts/listening-set.js` (`npm run listening:set`) | Same segment of original and processed (and an optional authorized reference) at matched loudness, with blind labels, a key and a review sheet. Runs locally |
| Protocol | [`listening-protocol.md`](listening-protocol.md) | How Gennady prepares, listens, scores and records |

## Algorithms and tolerances
- **Renders:** `renderChain` (LAS-27/28): sample-by-sample processing, latency compensated, limiter detection at 8×.
- **Metrics:** BS.1770-4 integrated loudness; 4× true peak (LAS-26); sample peak; RMS; Pearson correlation; clipping counts |x| ≥ 1.
- **Golden comparison:**
  - frames, channels, clipped and non-finite counts must match exactly;
  - loudness, peaks and RMS within 0.01 dB; correlation within 0.0001;
  - the 24-bit export hash must match exactly.

  Renders are deterministic, so the numeric tolerances only absorb last-digit machine differences; any real processing change exceeds them and changes the hash.
- **Independent cross-check:** FFmpeg 6.1.1 `ebur128` on 20 renders (defaults and master). Integrated loudness agrees within ±0.15 LU (largest difference 0.044); FFmpeg's true peak is at most 0.2 dB over the ceiling (largest 0.1, in FFmpeg's 0.1-dB steps). Result: PASS.

## Golden versioning policy
1. The golden file records `goldenVersion`, `fixtureSetVersion`, `chainSchemaVersion`, `analysisVersion`, `limiterOversampling`, the Node version, and a history of reasons.
2. A change to any of these versions, any fixture generator, or any processing fails the regression test with a readable list of differences. Nothing updates silently.
3. An intentional change is accepted only by `npm run dsp:regression -- --update --reason "…"`. This writes golden version + 1 with the reason, and it refuses while any render check reports a finding. The reviewer checks the diff of the golden file in the PR.
4. A fixture generator change also bumps `FIXTURE_SET_VERSION`.
5. A difference seen only on another machine (for example Gennady's Mac) is reported as a platform difference and investigated, not overwritten.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| Full regression, both rates: 96 renders, 0 findings, 0 golden differences | PASS | `evidence/dsp-regression.md`, `.json` |
| FFmpeg ebur128 cross-check (20 renders) | PASS | `evidence/dsp-regression.md` § FFmpeg |
| Vitest: golden comparison at 44.1 kHz (48 renders) on every `npm run check` | PASS | `tests/unit/dsp-regression.test.js` |
| **Negative tests:** each check catches a broken render — NaN/Inf, a lost channel, a shortened render, uncompensated latency (83 samples), clipping, a peak over the ceiling, swapped channels, a non-identity bypass, a processing regression (golden) | PASS | same file |
| Listening set: loudness matched (−16.41 LUFS for all three versions in the demo), seeded balanced labels (101/99 over 200 seeds), reference found at its 0.37 s offset (correlation 0.96), written files aligned (lag 0), wrong reference checksum refused with nothing written, silent segment refused | PASS | `tests/unit/listening-set.test.js`, `evidence/listening-demo/` |
| `npm run check` on the tested commit: ESLint 0, Vitest 208/208 (13 files), build, Playwright 63/63; artifact scan 124 pieces, 0 findings | PASS | `evidence/npm-run-check-…log`, HTML report, scan |

Defects found while building this slice:
1. **Blind labels were not blind.** The first label shuffle used a generator whose first value barely depends on small seeds, so label A was almost always the processed version. The unit test caught this before it shipped; the tool now uses mulberry32.
2. **Timing check false positives.** The check flagged a sweep through the EQ, which is legitimate group delay on a signal that is narrowband at each instant. The timing check now uses only broadband fixtures.

## Supported browsers and devices
| Environment | Status |
| --- | --- |
| Chromium 141 (Playwright), Linux, 1× and emulated 1.25×/2× DPR | Tested: all browser checks |
| Node 22.22 (scripts, unit tests, harness) | Tested |
| Chrome on macOS (Gennady's machine) | Not run — manual QA |
| Safari, Firefox, Edge; iOS/Android | Not run. The app needs AudioWorklet, Web Workers, `<dialog>`, CSS `:has()` and `OfflineAudioContext`; current Safari and Firefox support these, but nothing was verified here |

## Performance observations
Node, 2 minutes of stereo 44.1 kHz, on this container's current host (4 × Xeon 2.8 GHz):
- decode WAV: 0.1 s
- analysis report: 2.9 s
- render, default chain: 9.5 s
- render, master preset: 12.2 s
- loudness match: 13.5 s
- encode 24-bit: 0.25 s
- peak memory: 445 MiB

In Chromium the AudioWorklet chain renders 2 s of audio in 0.2–0.3 s in an OfflineAudioContext, and a 2-minute analysis runs in about 4 s with **0 main-thread long tasks**. The same jobs ran about 1.7× faster earlier in this session, before a worker restart moved the container: the match took 5.7 s then and 9.9 s three times after. These figures describe this shared container, not a user's computer; Gennady's Mac timings are part of manual QA. Full numbers: `evidence/performance.txt`.

## Blockers and limitations
- **Representative music:** the fixtures include a synthetic music-like programme only. No authorized music clips are in the repository, and none will be added without rights. Gennady's own songs enter only through the local listening-set tool.
- **Lia v6 reference:** BLOCKED until the actual authorized file and its SHA-256 are provided. The tool verifies the checksum and refuses a mismatch. No historical figure is used as a measurement.
- **The listening review is a human result.** It stays Not Run until Gennady listens; it records taste, not objective truth.
- The golden hash assumes identical floating-point results across platforms (V8 implements its maths functions the same way everywhere); this has not been confirmed on macOS yet.
- The harness takes about 36 s for the full set here; the Vitest half adds about 25 s to `npm run check`.
