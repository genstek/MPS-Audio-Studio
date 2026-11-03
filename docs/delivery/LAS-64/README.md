# LAS-64 — Space: editable reverb with reliable WAV export

Jira: [LAS-64](https://genstek69.atlassian.net/browse/LAS-64) · Sprint 10 package · Mode: IMPLEMENT (first delivery: reverb only; no delay/vocoder)

Branch `delivery/LAS-40-sprint-10` · implementation commit `bef9308`, review fixes `d65775b` (section pre-roll) and `159e902` (speakers test) · tested application commit `2c5d0ce`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual QA and **listening: NOT_RUN** (build and test passes do not establish listening quality)

## What the user gets
- The Space strip is a working module (the "Coming soon / Unavailable" placeholder is gone). Its card shows the configured decay shape (pre-delay gap, decay line, faster high-frequency fall, dry/wet bar) even when stopped, and a caption such as "Hall · 22 % · 2.6 s" or "Off".
- **Edit space** opens an independent, movable editor (LAS-61/62) with: **Space on**, **Preset** (Room / Hall / Plate; "Custom" when edited), **Mix (wet)** 0–100 %, **Pre-delay** 0–200 ms, **Decay (RT60)** 0.2–10 s, **Damping** 0–100 %, the same graph large with labels, and an explanation of placement and tail behaviour.
- **Export WAV** gets a "Reverb tail" choice whenever Space is on: *Include the tail (+pre-delay + decay)* (default) or *Cut at the end of the source*. The report shows the tail length.

| Preset | Mix | Pre-delay | Decay | Damping | Note |
| --- | --- | --- | --- | --- | --- |
| Room | 18 % | 10 ms | 0.8 s | 50 % | short, darker |
| Hall | 22 % | 30 ms | 2.6 s | 35 % | long |
| Plate | 20 % | 5 ms | 1.6 s | 15 % | bright and dense |

Presets are starting points of one algorithm; no real room or mechanical plate is modelled.

## Design
- **Chain position:** EQ → compressor → **Space** → limiter. The reverb comes before the limiter so the true-peak ceiling also holds the reverb tail.
- **Algorithm** (`src/dsp/chain.js`, the same code in the AudioWorklet preview and the offline export): mono sum → pre-delay (linear interpolation) → four series all-pass diffusers (g = 0.6) → 8-line feedback delay network (31.7–73.7 ms) with an orthogonal Householder matrix; each line has a decay gain from the RT60 and a one-pole low-pass (damping, coefficient up to 0.7) in its feedback path. Early sound: the diffused input reaches the output right after the pre-delay. Deterministic: no modulation or random numbers.
- **Stereo/mono:** left and right are taken from the lines with two orthogonal sign patterns (decorrelated, equal level); a mono track uses a mono chain and gets mono reverb. A one-sided (left-only) source is spread into both channels — intended for a stereo reverb (the LAS-29 channel-mapping check is not applied to the Space preset for this reason, documented in the harness).
- **Mix law:** linear crossfade, out = dry × (1 − mix) + wet × mix.
- **Smoothing:** mix, damping, decay and pre-delay glide with the chain's 20 ms smoother (decay gains recomputed every 32 samples); switching Space on/off crossfades over 20 ms. Space switched on after full bypass starts from silence.
- **Bypass:** while Space is off and fully faded out, the stage is skipped entirely, so output is **bit-identical** to the chain without Space.
- **Tails:** Pause and Stop let the tail ring out naturally (the chain keeps running on silence). Remove track, Replace WAV and New project send a reset that clears every chain state at once (reverb lines, diffusers, pre-delay, limiter delay), so no stale tail is heard. Export: tail included (pre-delay + decay, after which the low-frequency tail is 60 dB down) or cut at the source length.
- **Schema:** chain settings v2 (`order: eq, compressor, space, limiter`, `space: {enabled, mix, preDelay, decay, damping}`). **v1 files, presets and stem sessions load with Space off** and are otherwise unchanged (migration in `chain-params.js`); newer versions are refused. Undo/redo, snapshots, settings files and presets carry Space.
- **Sample rate:** line and diffuser lengths are set in milliseconds and converted at the running rate; RT60 and pre-delay hold at 44.1/48/96 kHz.

## Validation (deterministic signal tests)
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Bypass identity / existing projects unchanged | Space off with any stored values = bit-identical; **all 96 existing LAS-29 golden renders byte-identical** after the schema change | PASS | `tests/unit/space.test.js`; `evidence/dsp-regression-before-golden-update.md` |
| Impulse response / decay | low-band RT60 within 10 % of 0.5, 1.8 and 5 s at 44.1, 48 and 96 kHz (measured 0.538 / 1.78 / 4.95 s at 48 kHz) | PASS | `space.test.js` |
| Pre-delay | first reverb sample exactly at 0 / 50 ms (48 kHz) and 120 ms (44.1 kHz) | PASS | same |
| Damping | high-frequency share of the late tail halves at 80 % vs 0 %; low-band RT60 within 10 % | PASS | same |
| Stereo / mono | L/R within 1 dB, correlation < 0.3; mono chain stays one channel | PASS | same |
| Mix | 0 % equals dry within 1e-6; 100 % has nothing before the pre-delay | PASS | same |
| No NaN/Infinity, no runaway feedback | 20 s full-scale noise, decay 10 s, damping 0: finite, bounded, no guard resets; tail 60 dB down after 11 s | PASS | same |
| Parameter changes do not click | largest sample step with mix/pre-delay/decay/damping/bypass changes mid-stream < 0.05 on a 0.5 110 Hz sine | PASS | same |
| Preview = export (render parity) | block size 128 vs 997 identical; tail only appends; UI export = offline chain within 24-bit rounding, tail included and cut | PASS | `space.test.js`, `tests/e2e/space.spec.js` |
| Reset clears the tail | silence out after `reset()` | PASS | `space.test.js` |
| Audibly and measurably affects playback | speakers tap read every 20 ms on the audio clock, loudest RMS 0.25–0.8 s after the tone ends: silence with Space off; Hall L ≈ −42 dBFS, R ≈ −36 dBFS (bound −70) | PASS | `space.spec.js` |
| Section renders (reference comparison, proposal checks) match the whole render with Space on | 1 s tone, 10 s decay: the 7–8 s section equals the whole render within 1e-6 | PASS | `space.test.js` |
| Editor, presets, undo/redo, settings file v2 | browser | PASS | `space.spec.js` |
| v1 migration in files/presets | unit + LAS-33 browser import of a v1 file | PASS | `presets.test.js`, `presets.spec.js` |
| Golden results | regenerated as golden v2 with the recorded reason; only header lines changed for existing renders; 24 Space renders added and passing the render checks | PASS | `tests/golden/dsp-golden.json` |

**Performance** (Node 22, this container, 10 s stereo 48 kHz, best of three after warm-up): default chain 10.9× real time, with Space (Hall) 8.5× real time (≈ 28 % more CPU). Recorded by the `performance` test; not a guarantee for other machines.

## Found after the first delivery (PR #45 review and the full regression)
- **Section pre-roll ignored the reverb** (Codex review, P1): `renderSegment()` pre-rolled only for the dynamics, so with a long decay the section used by Compare and the proposal check lost reverb started earlier. The pre-roll now adds pre-delay + decay. The unit test above failed before the fix (pre-roll 3 s for a 10 s decay) — `d65775b`.
- **The speakers test measured at a scheduling-dependent moment**: it read once when the displayed position reached 1.6 s, with `expect.poll` backing off up to 1 s. Under load it read late, when the Hall tail at 1 kHz had fallen below the bound (−70.23 dBFS in a full run). The reading now runs on the audio clock in a window placed by the signal; the bound is unchanged — `159e902`.

## Limitations
- **Listening NOT_RUN.** Use [`manual-qa.md`](manual-qa.md) (listening checklist). Numbers above prove behaviour, not taste.
- The stem master render (LAS-35) still ends with the longest stem (no tail option there yet).
- Loudness matching for A/B compares the processed and original over the source length (no tail).
- Visual design of the editor is provisional until LAS-44/45; LAS-65 proposes the final look.

## Evidence on the tested commit `2c5d0ce`
- Test results: [`evidence/test-log-2c5d0ce.txt`](evidence/test-log-2c5d0ce.txt), an extract of [`../sprints/10/final/`](../sprints/10/final/). The full `npm run check` exited 0: Playwright 119/119 and Vitest 313/313.
- Screenshots (Chromium 153, headless, synthetic tone; the viewport is in each file name): [`space-editor-hall-1440x900.png`](evidence/space-editor-hall-1440x900.png)
- Records: [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · [`manual-qa.md`](manual-qa.md) (**NOT_RUN**)
