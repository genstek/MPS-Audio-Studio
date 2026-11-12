# Intelligent Diagnostics — QA and acceptance matrix v0.1

Status: **test design only**, NOT_RUN. Code/CI/manual sound verification must be tied to exact commit/build and evidence.

## Levels of verification
1. Pure Vitest unit tests on non-copyright synthetic fixtures (sinusoid, chirp, silence, phase inversion, burst consonants, pan sweep, wet delay).
2. Worker integration with 44.1/48/96 kHz, mono/stereo, boundary and performance tests (including 250 MiB input policy; do not allocate 250 MiB for every routine test).
3. AudioWorklet live path vs offline WAV export numerical parity; independent decoding, BS.1770 loudness and true peak.
4. Browser Playwright flow for analysis → evidence marker → A/B Preview → Apply/Undo; native macOS Ventura Intel smoke separately.
5. Human listening, level-matched at *actual* consonant endings and track sections; record verdict separately from measured QC.

## Planned test matrix
| ID | Scenario / fixture | Expected result |
| --- | --- | --- |
| DIAG-01 | Silence / sub-gate windows | No NaN/0-as-measurement, no gain boost recommendation, accurate null state. |
| DIAG-02 | Synthetic steady tone, then staged 1.5–6k power decrease | Marker is timestamped within hop tolerance and reports measured change, **not** asserted EQ failure. |
| DIAG-03 | 'Mayak bridge' synthetic: high-mid instrument deliberately pauses at 3:08–3:20 | Flag possible arrangement change, do not suggest automatic 4k EQ boost. |
| DIAG-04 | Same fixture but actual EQ notch automation | Competing explanations include DSP change; requires provenance/inspection before diagnosis. |
| DIAG-05 | Guitar pans L→R→L; intentional user annotation | Pan trajectory retained; no auto-center, mono fold/peak warning only where measured. |
| DIAG-06 | L=−R for one band during one section | Segment/band mono cancellation warning despite good integrated stereo correlation elsewhere. |
| DIAG-07 | Centered L=R vocal and mono bass | No false stereo-width or drift alarm. |
| DIAG-08 | Synthetic high-hat bursts (no voice) | Do not assert sibilance or prescribe vocal de-esser. |
| DIAG-09 | Voice-like consonant bursts at 6–10 kHz | Identifies timed *candidates*; no automatic de-essing before Apply. |
| DIAG-10 | Wet duplicated voice 85ms/485ms + phrase interval | Echo overlap warning/sidechain dry/wet bypass, clean dry reference remains unchanged. |
| DIAG-11 | Instrument stem contains faint synthetic vocal bleed | Warns possible bleed, does not claim precise separation/original multitrack provenance. |
| DIAG-12 | Stems offset +47ms then progressively drifting | Distinguish fixed shift vs drift; don't silently auto-align unknown content. |
| DIAG-13 | Reference input differs by gain only | Loudness-matched A/B largely neutral; no false spectral improvement. |
| DIAG-14 | Reference and mix have different length/sample clock | Warning, comparable overlap selected explicitly, never claim sample-aligned when not. |
| DIAG-15 | 44.1/48/96k spectral markers on matched synthetic sources | Frequency/time coordinates consistent; no high-band fold/alias mislabel. |
| DIAG-16 | Record intentional marker, Save, Reopen | Annotation and decision survive; source hash/revision/version checked, no mutation to source PCM. |
| DIAG-17 | Change source/project after async analysis/proposal starts | Late response discarded, stale proposal cannot Preview/Apply. |
| DIAG-18 | Preview, Reject, Apply, Undo, Redo | Preview doesn't commit; Apply is one undoable step; export matches committed state. |
| DIAG-19 | Monitor-only EQ profile active | Export PCM identical (all else equal) to monitor-EQ OFF; no personal EQ leaked into output. |
| DIAG-20 | Listen 3+ minutes with EQ edits & Match Loudness | No click / worklet reset / unexpected flat mode (related LAS-166); UI values and signal agree. |
| DIAG-21 | WAV 7.1.4 or ADM dropped into mono/stereo-only analyzer | Clear 'unsupported' result; never silently report stereo-only metrics as multichannel BS.1770. |
| DIAG-22 | Export with lookahead limiter & 24-bit quantization | Independently measured true peak, actual bit depth, sample rate, duration, no channel swap. |
| DIAG-23 | Large source, cancel/restart / rapid seek and timeline zoom | Bounded memory/CPU; no stale markers, worker leak, sample drops or UI blocking. |
| DIAG-24 | Negative L/R asymmetry but intentional wide guitar, approved by listener | No automated defect correction and intentional note visible to subsequent AI. |
| DIAG-25 | Technical report export after analysis | Report values match UI, algorithms and units versioned, no hidden reanalysis, no private filenames/paths to third parties. |

## Engineering acceptance gates
- **Gate A (baseline)**: pin repo SHA; run npm ci, lint, unit, build, relevant existing Playwright; capture current native Ventura build identity and known bugs before changes.
- **Gate B (measurement)**: deterministic 2s and 5s timestamp metrics, full input compatibility/memory tests, synthetic spectral/phase fixture correctness, independent spectrogram crosscheck. **No DSP output change** in this stage.
- **Gate C (decision explanations)**: each marker has method, evidence, alternatives, whether technical/artistic/uncertain, and user can mark it intentional; no generic 'fix EQ' from narrow spectral share.
- **Gate D (proposal)**: render candidate from validated parameters; Preview A/B level matching; explicit Apply with scoped Undo; Reject closes cleanly; stale result rejected. No actual mutating AI provider access to DSP.
- **Gate E (audio)**: independent exported-byte QC and human consonant-tail check, mono and multiple devices. Distinguish measurement PASS from listening accepted.
- **Gate F (native compatibility)**: Intel Ventura 13.x and arm64 matrix. Mark arm64/manual NOT_RUN until physically tested, do not infer from web CI.

## Traceability and open defects
- Existing main analyzer: `src/dsp/analysis.js`, worker and `tests/unit/analysis.test.js`.
- Existing proposal transaction: `src/ai/proposal-session.js`, `tests/unit/ai-eq-proposal.test.js`.
- LAS-159: per-stem stereo stage/M/S. LAS-153: measurement-based AI EQ advice. LAS-171: analysis report saving. Coordinate rather than duplicate.
- LAS-166: EQ unexpectedly sounds flat after 30–60 s / click; LAS-160 slider state mismatch. A new feature must not obscure these investigations.
- Never upload or commit private Mayak/Pobud audio, personal hearing data, raw source stems, or user local paths as test fixtures.

## Expected evidence for each case
`caseID | tested SHA/build | source fixture hash | OS/browser/audio device | input rate/channels/bit-depth | exact processing revisions | expected | actual | status (PASS/FAIL/BLOCKED/NOT_RUN) | independent meter result | screenshots/logs | listening verdict | issue/PR`.

Reference standards:
[ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770-5-202311-I/en),
[EBU Tech 3342](https://tech.ebu.ch/publications/tech3342/).
