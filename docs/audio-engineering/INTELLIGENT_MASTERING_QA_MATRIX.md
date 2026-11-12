# Intelligent Mastering — QA acceptance matrix (research v0.1)
**Status:** design / test plan; no app DSP changed by this documentation PR. Use deterministic synthetic fixtures and independently decoded output. Do not commit private customer tracks.

## Test suites and expectations
| ID | Input / action | Expected |
|---|---|---|
| IA-01 | Stereo 44.1/48/96k WAV; 16/24/float | Correct source rate/format/duration and SHA. Distinguish source, processing context and export rate. |
| IA-02 | Synthetic spectra change in 2s windows | Time marker within one defined analysis hop; values reproducible on repeated render. |
| IA-03 | Intentional high-mid dropout during instrumental break (Mayak-style) | “Possible arrangement change” warning; **no automatic EQ boost**. |
| IA-04 | Silence segment | No NaN/Inf/divide-by-zero or speculative loudness/tonality repair. |
| IA-05 | Pan L→R→L automated guitar | Visible motion, no automatic re-centering. Only genuine clipping/mono loss raises technical risk. |
| IA-06 | L=-R side-heavy signal over a short region | Time- and band-local mono cancellation flagged, even if whole-track correlation positive. |
| IA-07 | Fully centered mono-like signal | No phantom width or invented stereo movement. |
| IA-08 | Synth 's' bursts + high-hats, no vocal source | No confident 'vocal de-esser' claim; candidate/uncertain marker or skip. |
| IA-09 | Vocal phrase and 85/485ms delayed copy, >1s decaying return | Detect overlap risk / present bypass and dry/wet comparison; no committed DSP change without Apply. |
| IA-10 | Stem alignment +47ms and non-linear drift | Alignment proposal with uncertainty; user must approve and hear A/B. No invisible destructive shift. |
| IA-11 | Stem contaminated with -30dB vocal bleed | Suspect spill; avoid copied vocal wet returns by default; no claim to know original Suno generation model. |
| IA-12 | Two level-only versions | Loudness-matched A/B removes gain-only mismatch; original remains bit-identical. |
| IA-13 | User marks deliberate guitar pan 'intentional' | Annotation persists after Save/Reopen and doesn't trigger repeat auto-fix; no global suppression of true-peak warnings. |
| IA-14 | Monitor-only EQ enabled | Offline master export content unaffected; separate creative-EQ path when explicitly opted-in. |
| IA-15 | Apply → Undo → Redo → Save → Reopen during playback | EQ and audio state consistent; no filter resetting to -12dB; stable after 3+ min. |
| IA-16 | Unsupported AI proposal, out-of-bounds EQ or stale revision | Reject with clear error; no worklet parameter mutation. |
| IA-17 | Worker cancel/reimport 250MB source | Worker cancelled, no stale results or UI lock; file import/analysis handles resource budget. |
| IA-18 | 24-bit PCM export from 48→96k | Independent header, frame count, true peak and bandlimited SRC validation; no claim of added source fidelity. |
| IA-19 | Reference with mismatched start/duration | Warn and align conservatively; no 'new EQ hole' false positive caused by shifted window. |
| IA-20 | 7.1.4 impulse channel test | FL/FR/FC/LFE/BL/BR/SL/SR/TFL/TFR/TBL/TBR checked, no speaker-channel swap; no misleading Atmos ADM label. |
| IA-21 | Independent LUFS/TP fixture | Conform to documented ITU BS.1770 meter method and EBU test materials within justified tolerance. |
| IA-22 | Live/offline same chain snapshot | Numeric audio parity within documented SRC/device behavior; measured exported bytes, not UI values alone. |

## Gates
**G0** Evidence/provenance register reviewed. **G1** Measurement-only timeline validated. **G2** Findings ranked and annotated, no autonomous Apply. **G3** One new DSP processor per PR, disabled for old project migration. **G4** E2E on Intel macOS Ventura and independent PCM/QC plus listener acceptance.

## Existing regression harness to extend
- `tests/unit/analysis.test.js`, `tests/unit/dsp-regression.test.js`, `tests/unit/ai-eq-proposal.test.js`, `tests/unit/monitor-bus.test.js`
- `tests/e2e/analysis.spec.js`, `tests/e2e/chain-parity.spec.js`, `tests/e2e/project.spec.js`, `tests/e2e/recovery.spec.js`, `tests/e2e/stem-render.spec.js`, `tests/e2e/mastering-controls.spec.js`
- `tests/fixtures/signals.js` and the existing golden/test harness.

## Non-goals of the first implementation
No automatic “fix all” button, no undocumented secret preset, no listener-hearing-based mastering default, no claimed 96 kHz sound improvement, no 7.1.4 PCM misrepresented as Dolby Atmos, no unsupported AI direct editing, and no forced user pan balancing.

## Source and sign-off records
Every test run records build/commit SHA, algorithm version, fixture and source hash, sample rate, channel layout, time window, expected measurement tolerance, output verification, and whether the creative result was approved by a person. An independently accurate measurement and a positive listener reaction are different fields.
