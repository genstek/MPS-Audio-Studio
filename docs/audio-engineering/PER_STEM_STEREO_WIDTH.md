# Per-stem stereo width (LAS-128, slice 1)

Path: `source → own chain → trim → WIDTH → pan → mute/solo gate → meter → bus`. Off by default; one stage per stem; the master chain and the pan law are untouched.

## Maths (`src/dsp/stem-width.js`, shared by preview and export)

`M = (L+R)/2`, `S = (L−R)/2`. The stage adds `D` to L and subtracts it from R, so mid never changes:

| width | D | meaning |
| --- | --- | --- |
| < 1 | `(width−1)·S` | whole band narrows toward mono (0 = mono) |
| ≥ 1 | `(width−1)·HP(S)` | only above the crossover widens; bass gets no extra width |

`HP` is a 2nd-order Linkwitz–Riley highpass (one biquad, Q = 0.5): −6 dB at the crossover, 12 dB/oct below it. Crossover 60–400 Hz, default 150 Hz. Width 0–2, neutral 1.

Measured properties (asserted in `tests/unit/stem-width.test.js`): side gain ≤ `width` everywhere; at width 2 it dips at most ~1.2 dB below 1 in the transition band; at 40 Hz with a 150 Hz crossover widening is < 5 %. A 4th-order slope was tried and rejected: its −180° phase at the crossover cuts the side signal there. Trade-off: 12 dB/oct protects the deep bass well but not the octave just under the crossover, so raise the crossover for bass-heavy material.

Identity: stage off, or width 1, or a mono file → `D = 0` / stage skipped; output is bit-identical to a render without the field (tested). Settings are kept when the stage is switched off (bypass) and **Reset width** restores `off / 100 % / 150 Hz`. Old project and stem-session files without `width` load as off; no schema version bump (additive field, validated, out-of-range refused).

Live graph: `trim → splitter → S → (direct gain, highpass → gain) → delta → L, −delta → R → pan`, summed with the untouched dry path. Off = both gains 0.

## Measurements instead of percentages

Rendered stem files carry measured zero-lag L/R correlation, mono fold-down (level of `(L+R)/2` against the average channel power: 0 dB identical, −3 dB uncorrelated, −∞ dB anti-phase) and the same below the crossover. Warnings appear under the render table only past stated thresholds (correlation < −0.2, fold-down < −6 dB) and quote the measured values. Full multi-band analysis and timeline views are **deferred to LAS-173**; only one low band is measured here.

## Not in this slice

- Loudness compensation for width, per-stem undo/redo, project-level automation of width.
- Early reflections / depth send (return HPF, predelay, bypass, migration): separate slice. No global convolution is added.
- Live (real-time) correlation meters per stem.

## Evidence and limits

Signal tests only: they show the maths, the identity and the live/offline match, not how it sounds. Native Ventura/macOS packaging is unverified (this run is Linux). Ventura QA checklist for the native build: add a stereo and a mono stem; width off sounds identical to before; width 0 collapses a stereo pad to mono; width 200 % with a bass-heavy stem leaves the bass image unchanged; reset; save/reopen the project and recall the stem session; render and check the rendered file with an independent tool (e.g. `ffmpeg -i stem.wav -af astats` or any DAW's correlation meter) against the report.
