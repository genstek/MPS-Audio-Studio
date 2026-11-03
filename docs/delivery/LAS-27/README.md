# LAS-27 — Reproducible EQ, compressor and limiter processing chain

Jira: [LAS-27](https://genstek69.atlassian.net/browse/LAS-27) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-27.md` · Mode: IMPLEMENT · Prerequisite: LAS-26 (READY_FOR_QA)

Branch `feat/LAS-27-processing-chain` · tested application commit `23865e4a7e465a50b2f39f31782adb39f512c3f3`

Developer status: **READY_FOR_QA** (engine slice) · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Scope
The processing engine and its settings model. The controls, A/B and the export button are LAS-28; until then nothing in the visible UI changes and no control pretends to work.

| Part | File | What it does |
| --- | --- | --- |
| Settings schema | `src/dsp/chain-params.js` | `mps-chain` version 1, fixed order EQ → compressor → limiter, declared bounds, validation, stable serialisation, migration table, sample-rate resolution, Link/independent editing |
| Filter design | `src/dsp/eq-design.js` | RBJ Audio-EQ-Cookbook biquads (bell, low/high shelf, high/low-pass), stability check |
| Engine | `src/dsp/chain.js` | `createChain()` (block processing with carried state, live changes, meters, guards) and `renderChain()` (offline render with latency compensation) |
| Preview | `src/dsp/chain.worklet.js`, `src/dsp/chain-node.js` | the same `createChain()` inside an AudioWorklet; `createChainNode()` validates settings, reports latency/warnings, applies or refuses live settings, forwards meters |
| Evidence tool | `scripts/characterize-chain.js` (`npm run characterize:chain`) | numerical report: EQ responses, compressor curve/timing, limiter ceiling, latency, throughput |

## Settings (schema `mps-chain` v1)
| Group | Parameter | Range / values | Default |
| --- | --- | --- | --- |
| EQ | `enabled`, `mode` | `link` \| `independent` | on, `link` |
| EQ band (24 for `left`, 24 for `right`) | `enabled`, `type` | bell, low-shelf, high-shelf, high-pass, low-pass | off, bell |
| | `frequency` | 20 Hz – 20 kHz; at run time ≤ 0.45 × sample rate (higher values run at that limit and are reported) | 30 Hz … 16 kHz, log-spaced |
| | `gain` | −18 … +18 dB (bell, shelves) | 0 |
| | `q` | 0.2 … 12 (bandwidth; shelf slope, 0.707 = no overshoot; HP/LP resonance, 0.707 = Butterworth) | 1 |
| Compressor | `threshold` −60…0 dBFS, `ratio` 1…20, `attack` 0.1…200 ms, `release` 10…2000 ms, `knee` 0…24 dB, `makeup` −12…+24 dB, `detector` peak \| rms | | off, −18, 2, 10, 150, 6, 0, peak |
| Limiter | `ceiling` −6…−0.1 dBTP, `inputGain` 0…24 dB, `release` 10…1000 ms | | on, −1, 0, 100 |

Anything else is refused with a sentence naming the field and its range: non-numbers, out-of-range values, 23 or 25 bands, an unknown type, another processing order, another schema, a newer version (needs a newer studio) or an older version with no migration. The same settings always serialise to the same text.

**Link semantics.** In `link` mode the left set drives both channels, and `editBand()` writes an edit into both sets so they stay identical. Switching to `independent` starts from those linked settings. Switching back to `link` copies left → right. Mono audio uses the left/linked set.

## Processing semantics (preview and export)
- **One implementation.** Preview (AudioWorklet) and export (`renderChain`) both run `createChain()`. Processing is sample by sample with state carried between blocks, so the block size does not matter (tested with 1, 64, 128 and 1000). The browser test renders a signal through the real AudioWorklet in an `OfflineAudioContext` and through `renderChain`: the samples are **identical (largest difference 0)** at 44.1 kHz stereo, 48 kHz stereo and 96 kHz mono.
- **Latency** is constant: look-ahead (1.5 ms) + 12 samples for the true-peak detector = 77 / 83 / 155 samples at 44.1 / 48 / 96 kHz. It stays the same when the limiter is bypassed, so toggling never shifts time. Preview reports it (LAS-28 A/B alignment); `renderChain` compensates it, so export sample *n* lines up with source sample *n*. The tail of the look-ahead is rendered, not cut.
- **Fixed settings** start exactly at their values (export renders are deterministic). **Live changes** are smoothed over 20 ms:
  - EQ frequency/gain/Q ramp on log/dB scales, with coefficients recomputed every 32 samples on a sample clock.
  - A band switched on/off or changed in type cross-fades between the old and new filter.
  - Processor bypass cross-fades. An EQ re-enabled after full bypass restarts from clean filter state.
  - Compressor and limiter levels follow a 5 ms one-pole.
- **Bypass** = identity: with every processor off, the export equals the input sample for sample. Flat EQ, a compressor below threshold and a limiter below ceiling are also bit-transparent.
- **Compressor:** feed-forward with a stereo-linked detector (louder channel). Peak (|x|) or RMS (10 ms) detection. Soft knee per Giannoulis, Massberg & Reiss (2012). Gain smoothing in dB with attack/release as one-pole time constants (63 % of a step). Unity gain exactly below the threshold.
- **Limiter:** input gain, then a true-peak detector (4× oversampled with the same 24-tap Kaiser interpolation as LAS-26), a sliding minimum over the look-ahead, release toward the held gain, and a box average over the look-ahead. The gain therefore reaches the required value before each peak.
- **Guards:** non-finite input samples become silence and are counted. Filter states below 1e-30 are flushed (no subnormals). A non-finite internal state resets the chain and outputs silence for that block. Inputs are never modified.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| Filter stability: 5 types × 5 frequencies × 4 Q × 3 gains × 3 rates (900 designs) | all stable, finite | `vitest-chain-verbose.log` |
| Measured impulse response (FFT) vs transfer function, 6 bands × 3 rates | largest deviation < 0.00001 dB (test limit 0.01) | `chain-report.md` |
| Left band in independent mode | left +6.0 dB at 1 kHz, right output identical to input; Link changes both | unit test |
| Compressor static curve (−40…−4 dBFS, knee 0/6) | within 0.02 dB of the gain computer | `chain-report.md` |
| Compressor timing (1/10/50 ms attack, 50/100/500 ms release) | measured 0.98/9.98/49.98 ms and 49.98/99.96/499.81 ms | `chain-report.md` |
| Limiter ceiling −1/−0.1/−6 dBTP, 4 hard signals × 3 rates (36 cases) | output true peak at most **+0.026 dB** over the ceiling (DSP_SPEC tolerance +0.2) | `chain-report.md` |
| Latency, bypass, determinism, block-size independence, smooth live changes, NaN/Inf input, mono, input untouched | PASS | unit tests |
| Worklet preview vs offline render (browser) | identical samples at 44.1/48/96 kHz; 2 s rendered in 85–111 ms | `playwright-chain-parity.txt` |
| Production build: worklet bundled as a self-contained script, loaded through `vite preview`, limits a −0.9 dBFS tone to −6.00 dBTP | PASS | `production-build-worklet.md` |
| Throughput, all 48 bands + compressor + limiter, Node | 27× real time (16.5× in an earlier run under load) | `chain-report.md` |

`npm run check` on the tested commit: ESLint 0 problems, Vitest 181/181 (10 files), build OK, Playwright 56/56. `npm run scan:artifacts`: 117 pieces, 0 findings.

These are numerical checks of the engine. **No listening test has been run.** UI tests do not prove audio quality, and the listening review is planned in LAS-29.

## Defect found and fixed during development
`createChainNode()` waited forever when the processor could not start, for example with invalid settings: the worklet constructor threw, so no "ready" message arrived. This was found while checking the production build. Settings are now validated before the node is created (clear error), and the node's `processorerror` event rejects. The browser test checks that invalid settings reject instead of hanging.

## Decisions
- **Plain JavaScript in an AudioWorklet, not WebAssembly.** The chain runs 16–27× faster than real time in JavaScript, and one source file serves both preview and export, which is what guarantees parity. WebAssembly can be reconsidered if multitrack (LAS-34/35) needs it.
- **Fixed order EQ → compressor → limiter.** The limiter must be last for the ceiling guarantee. Other orders are refused, not silently reordered.
- **Bounds from `docs/DSP_SPEC.md`** (gain ±18 dB, Q 0.2–12, compressor/limiter ranges). The historic v1.2 ranges (±12 dB, Q 0.25–8) are inside these.
- **Deferred:** saturation, reverb, width, multiband (per work order and REQUIREMENT_RECONCILIATION.md).

## Limitations
- No UI yet (LAS-28). Gain-reduction meters are produced by the worklet (about 30 per second) but not displayed.
- Compressor stereo link is always on; no side-chain filter; the knee/curve is not program-dependent.
- Limiter look-ahead is fixed at 1.5 ms. The release is a single time constant; there is no adaptive or multi-stage release.
- Rapid repeated switching of the same band during its 20 ms cross-fade drops the older fade (a small step is possible). Continuous edits ramp smoothly.
- Measured on Linux Chromium 141 and Node 22 only; not run on Mac/Chrome.

## Addendum (LAS-28, 2026-10-30): limiter detector changed from 4× to 8×
The independent FFmpeg inspection of an exported file in LAS-28 found that the limiter, detecting at 4×, let peaks between its quarter-sample points through. The settings were EQ +4 dB at 3 kHz, compressor −20 dB 3:1 and +8 dB input gain on noise at 44.1 kHz. FFmpeg read −0.8 dBTP and a 32× reference meter read −0.77 dBTP against a −1 dBTP ceiling. The figures above (worst +0.026 dB) were measured with the same 4× meter the limiter used, so they could not show this. Since commit `c43345d` the limiter detects at 8×. Results:
- the same export reads −1.0 dBTP on FFmpeg and −0.995 dBTP on the 32× meter;
- the characterisation's 32× column shows at most +0.09 dB over the ceiling;
- throughput is 16× real time with all 48 bands.

Evidence: `docs/delivery/LAS-28/evidence/` (export inspection, 4× negative control, chain report with the 8× detector). The LAS-27 tested commit `23865e4` itself is unchanged.
