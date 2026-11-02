# LAS-68 — Functional Master Level fader for the studio output

Jira: [LAS-68](https://genstek69.atlassian.net/browse/LAS-68) · Sprint 10 package · Mode: IMPLEMENT (missing functionality; no earlier working baseline)

Branch `delivery/LAS-40-sprint-10` · implementation commit `8e74cc1` · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual / listening QA: **NOT_RUN**

## Policy: Master Level is a monitor volume
The package proposed, and this delivery implements, **monitor/output volume**:
- It changes what reaches the speakers and the output meters (LAS-67), for the single track **and** the stem mix.
- It is **not** part of the chain settings, presets, projects or exports. A WAV export is byte-identical at 0 dB and at −20 dB (tested). A render-affecting master trim would need its own design decision and export-parity tests; it is not built.
- It is applied **after** the Original/Processed switch and loudness matching, with the same gain on both paths and both channels, so A/B comparisons keep their relationship.
- Range: **mute (−∞ dB) … 0 dB (unity)**, 0.5 dB steps; the step below −60 dB is mute. No positive gain (it would need a headroom/limiter decision first).
- Reset policy: the level is a listening preference of this browser. It persists through Pause/Resume, Stop, editor open/close, track replacement, Remove track and New project, and across reloads (stored in `localStorage` when the browser allows it; otherwise it starts at 0 dB). Older chain settings files are unaffected (they never contained a master level).

## Signal path
```
output stage(s): processed / original / reference paths (LAS-28/31), after A/B and matching
   │  (single track stage and stem session stage)
   ▼
monitor bus (src/monitor-bus.js, created with the AudioContext)
   master gain (Master Level, 30 ms linear ramps) ──► speakers
        ├► splitter → left / right analysers (post-fader levels, LAS-67 meters)
        └► spectrum analyser (post-fader, LAS-67 player spectrum)
```
The EQ editor's spectrum keeps reading the output stage analyser (after A/B, **before** Master Level), so turning the monitor down does not hide the EQ spectrum.

## Control
- Pointer drag on the fader; keyboard ←/↓ −0.5 dB, →/↑ +0.5 dB, Page Down/Up ∓6 dB, Home = mute, End = 0 dB; double-click or **0 dB** button resets to unity.
- Value shown next to the label ("−6.0 dB", "−∞ dB") and a dB scale under the fader (−∞, −48, −36, −24, −12, 0 dB). Accessible name "Master level", `aria-valuetext` "−6.0 dB" or "Muted (−∞ dB)".
- Disabled with a reason when nothing can play: "Import a WAV or add stems to use the master level." / "Available when the audio has loaded." The old "Level control unavailable" text is gone.
- The same fader is reachable inside the (modal) Stem session dialog; both control the one monitor gain.

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Enabled with playable audio; reason when disabled | browser: disabled text, enabled after import and with stems only | PASS | `tests/e2e/master-level.spec.js` |
| Real stereo output gain, equal L/R, single track and stems | probe tap on the audio destination: unity −23.0 dBFS RMS; −6 dB → −29.0 dBFS (±0.25); mute → silence; stereo, L-only, R-only, mono; stem mix of an L-only and an R-only stem at −6 dB | PASS | `master-level.spec.js` |
| dB scale, numeric value, unity, true mute | `aria-valuetext`, visible value, gain node value 0.501 at −6 dB and 0 at mute | PASS | same |
| Pointer, keyboard, reset | arrows ×12 = −6.0 dB, Page Down −6 dB, Home mute, reset button; rapid pointer drags while playing | PASS | same |
| Smooth, no transport interruption | 30 ms ramp (unit), one source started, clock keeps running, status Playing during drags | PASS | `tests/unit/monitor-bus.test.js`, `master-level.spec.js` |
| Same gain on Original and Processed after matching | speakers −6 dB on both paths | PASS | `master-level.spec.js` |
| Excluded from export | export SHA-256 identical at 0 dB and −20 dB | PASS | `master-level.spec.js` (annotation) |
| Output meters follow the tap and mute | the monitor bus exposes post-fader levels/spectrum (used by LAS-67) | PASS | `tests/unit/monitor-bus.test.js`, LAS-67 |
| Preserved through pause/stop/editors/replacement/unload/reload | browser | PASS | `master-level.spec.js` |
| Engine: one bus per context, every stage plays into it, clamping, never sent with chain settings | unit | PASS | `tests/unit/audio-engine.test.js` |

The LAS-7 smoke test was updated: it asserted the old "Level control unavailable" placeholder, which this issue removes; it now asserts the disabled-state explanation and that the placeholder text is gone.

## Limitations
- No listening test; no hardware output was measured (headless Chromium, no audio device). Numeric checks measure the samples sent to the destination.
- macOS/iOS wrapper not run. Fader appearance is provisional until LAS-44/45 (a long hardware-style fader is proposed there).
- Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.
