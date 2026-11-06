# Mastering DSP expansion — plan (issue #56)

Status: **planning document only.** No DSP, UI or schema code changes accompany it. Nothing described under "Proposed" exists yet.

Scope rules (from `AGENTS.md`, ADR-002): web-first React/Vite/Web Audio/AudioWorklet; small issue-linked PRs; no copied DSP, trademarks, proprietary presets or plugin binaries; "functional inspiration" only. Products named in the epic (FabFilter, Weiss, Manley, Thermionic Culture, Sonnox, Waves, Studer/Ampex, SoundBlade) are *reference points for feature sets*, never targets for exact emulation.

## 1. Verified baseline (HEAD `df996b0`)

Verified by reading source and running `npm ci`, `npm run lint`, `npm run test:unit` (see §8 for results).

| Area | Present at HEAD | Where |
|---|---|---|
| Chain schema | `mps-chain` v2, order `eq → compressor → space → limiter`, bounded validation, one migration (v1→v2), refuses newer versions | `src/dsp/chain-params.js` |
| EQ | 24 bands per channel, bell/low-shelf/high-shelf/HP/LP, link/independent L/R, gain ±18 dB, Q 0.2–12, ramped coefficient updates, 0.45×fs clamp with warnings | `chain-params.js`, `chain.js`, `eq-design.js`, `EqEditor.jsx` |
| Compressor | Feed-forward, peak/RMS detector, threshold/ratio/attack/release/knee/makeup, GR meter. **No** sidechain filter, modes, or per-band operation | `chain.js`, `ModuleEditors.jsx` |
| Space | 8-line FDN reverb with diffusers, pre-delay/decay/damping/mix, presets | `chain.js` |
| Limiter | Look-ahead, 8× oversampled true-peak detector, ceiling −6…−0.1 dBTP, input gain, release; latency compensated inside the path | `chain.js`, `true-peak.js` |
| Live/offline | `chain.worklet.js` (live) and `render.worker.js` (offline) both call the same `createChain` core | `chain.worklet.js`, `render.worker.js`, `tests/e2e/chain-parity.spec.js` |
| Loudness | BS.1770 integrated (gated), momentary max, short-term max, LRA; true peak; stereo correlation in analysis | `loudness.js`, `analysis.js` |
| Export | 24-bit and 16-bit PCM WAV; 16-bit uses seeded TPDF dither | `wav-encode.js`, `ExportDialog.jsx` |
| Other | Reference comparison/proposal, stems, mixer, project save/reopen, A/B (Compare), movable editor windows, Master Level | `reference-comparison.js`, `proposal.js`, `StemsDialog.jsx`, `MixerPanel.jsx`, `EditorDialog.jsx`, `MasterLevel.jsx` |
| Tests | 314 vitest tests (unit + server), ~35 Playwright specs incl. `chain-parity`, responsive matrices, `dsp-regression`, `characterize:chain` scripts | `tests/` , `scripts/` |

Not present: dynamic EQ, analog tone EQ, de-esser, compressor modes/sidechain filter, tape/saturation, bass enhancement, multiband, stereo width/M-S processor, real-time GR *history* or live LUFS meters (only offline analysis values), timeline/sequencing/batch export/metadata, skin system.

Documentation drift to correct (separate small PR): `docs/SCRUM-6_AUDIT.md` still says EQ/dynamics/export/persistence are "not implemented in the modern app", and `docs/DSP_SPEC.md` mentions a 10-band graphic EQ; both are stale versus the code above.

## 2. Gate 0 — stability audit before new DSP

No P0 blocker was confirmed in this run. The audit below separates what is **covered by an existing automated test** (named) from what is **unverified** here. Nothing is marked "fixed".

| Gate item | Existing coverage | Gap / to verify |
|---|---|---|
| Import / playback | `import-valid-wav`, `import-lifecycle`, `import-errors`, `playback`, `player`, `transport-position`, `pause-toggle`, `unload-track` specs | Repeated load/unload ×N and seek/stop under parameter change as one soak test |
| Project save/reopen | `tests/unit/project.test.js`, `project.spec.js`, `recovery.spec.js` | Fixture projects from each schema version once new processors land |
| Bypass | `chain.test.js`, `dsp-regression` | Per-new-processor unity ±0.1 dB test (DSP_SPEC target) |
| Source-vs-processed A/B | `compare.spec.js`, `CompareDialog` | — |
| Independent Undo/Redo | e2e coverage not located in this audit | **Unverified** — locate or add a test before any editor work |
| Reference match | `reference-comparison.test.js`, `proposal.test.js`, `references.spec.js` | — |
| WAV export | `wav-encode.test.js`, `chain-parity.spec.js`, `stem-render.test.js` | Exported-sample verification against an independent analyzer (`crosscheck:analysis` exists; run in CI?) |
| Sample rates 44.1/48/96 kHz | Not confirmed as a systematic matrix | Add to the shared fixture harness (§6) |

Observed in the baseline unit run: `tests/server/security.test.js` ("registering an existing address takes about as long as registering a new one") failed once under full-suite load with a timing-ratio assertion. It is a wall-clock test and appears load-sensitive; it is unrelated to DSP. Treated as a flake candidate, **not** investigated or fixed here (re-run result in §8).

## 3. Module interfaces and routing

Constraint: every new processor must (a) live in the chain schema with bounds, (b) be implemented once inside the shared `createChain` core so the worklet and the render worker run identical code, (c) default to **off** so older projects sound unchanged, (d) report latency and meters through the existing `meters` object.

Proposed order (changes the chain version each time a module is added; each is a migration that inserts the module disabled):

```
input guard → eq → dynamicEq* → toneEq* → deEsser* → compressor → saturation* → bass* → space → limiter → export (dither last)
                                  (* = proposed)
```

Rationale: tonal shaping before dynamics; saturation after the compressor so drive is not undone; limiter last so the true-peak ceiling holds over everything, including reverb tails (existing principle in `chain-params.js`).

Module interface (sketch; names provisional):

```js
// params slice: { enabled: boolean, ...bounded numeric/enum fields }  // validated in chain-params.js
// state:        allocated in createChain(sampleRate, channelCount); no per-sample allocation
// process:      (l, r, n) -> [l, r]           // per sample inside createChain's loop
// latency:      integer samples, summed and compensated so bypass/enable does not shift timing
// meters:       { gainReductionDb, ... }      // measured from signal, never synthesised
// ramp:         enable/disable mix ramped over RAMP_SECONDS; parameters smoothed
```

Proposed per-module parameter slices (bounds to be fixed in each issue and added to `BOUNDS`):

- **dynamicEq**: per EQ band `dynamic: { enabled, thresholdDb, rangeDb, attackMs, releaseMs, detector: 'self'|'external', stereo: 'link'|'lr'|'ms' }`. Reuses the band biquad; reduction modulates the band gain. UI curve = actual instantaneous response.
- **toneEq** (Pultec-*inspired*, original topology): `{ lowFreq (discrete), lowBoost, lowAtten, midFreq, midGain, highFreq, highBoost, highAtten, bandwidth }`. Documented as an original design with the classic simultaneous boost+cut interaction; not a model of any Manley product.
- **deEsser**: `{ detectHz, detectQ, thresholdDb, rangeDb, attackMs, releaseMs, mode: 'wideband'|'split', listen: boolean }`. `listen` is the sidechain audition and is a monitoring mode that must never reach export.
- **compressor.mode**: `'transparent'|'opto'|'fet'|'bus'` plus `sidechainHpHz`. Each mode defined by documented, *measurable* differences (e.g. program-dependent release curve, attack law, detector, ratio law), characterised by `characterize:chain`. Names describe behaviour, not hardware models.
- **saturation**: `{ driveDb, curve, mix, oversample: 2|4|8, outputDb }`; oversampled with measured alias rejection; wow/flutter/noise omitted until a later slice and **off by default** when added.
- **bass / multiband**: crossover phase and latency documented; linear-phase vs minimum-phase decision recorded in an ADR before implementation.

Monitoring (item 5) is a read-only consumer: worklet posts GR, momentary/short-term LUFS (BS.1770 K-weighting, same maths as `loudness.js`), true peak, and correlation at a fixed rate. It does not alter audio. Needs a streaming variant of the loudness code that is tested against the existing offline implementation on the same fixtures.

## 4. Phased delivery plan and dependency order

Each row is intended to be its own issue and PR. Nothing below is created yet (see §7).

| # | Slice | Depends on | Priority |
|---|---|---|---|
| 0 | This document | — | now |
| 1 | Shared DSP fixture harness: synthetic copyright-free signals (sines, sweeps, noise with fixed seed, impulses, clipped/NaN buffers) at 44.1/48/96 kHz; helper assertions (magnitude response, gain-reduction, null test, finite output) | 0 | P0 enabler |
| 2 | Gate-0 gaps: Undo/Redo independence test, load/unload/seek/param-change soak | 1 | P0 |
| 3 | Docs drift fix (`SCRUM-6_AUDIT.md`, `DSP_SPEC.md`) | 0 | P0 docs |
| 4 | **Monitoring bus**: live GR history, momentary/short-term LUFS, TP, correlation | 1 | P1 (item 5) — first DSP-adjacent slice, no audio change |
| 5 | Compressor sidechain HP + modes | 1, 4 | P1 (item 4) |
| 6 | De-esser | 1, 4 | P1 (item 3) |
| 7 | Dynamic EQ | 1, 4, 6 detector reuse | P1 (item 1) |
| 8 | Tone EQ | 1 | P1 (item 2) |
| 9 | Skin separation (tokens + skin switch, no DSP) | independent; before more UI-heavy slices | UI |
| 10 | Saturation | 1, 5 | P2 (item 6) |
| 11 | Bass enhancement / multiband (ADR first) | 1, 10 | P2 (item 7) |
| 12 | Timeline / sequencing / batch export / metadata / export verification | 2 | P3 (item 8) |
| 13 | Native AU/VST3 feasibility study (document only; ADR-004 context) | — | P3 (item 9) |

Recommended next implementation slice: **#1 (fixture harness)**, then **#4 (monitoring bus)**. Rationale: every later module's acceptance criteria are numeric assertions on these fixtures, and the meters make gain-reduction visible for all dynamics work without changing audio.

## 5. Acceptance criteria (apply to every module)

1. Bypass (disabled) output equals input within ±0.1 dB RMS (null test), excluding documented latency.
2. Enabling/disabling and parameter changes during playback produce no step discontinuity above −60 dBFS relative to the signal (smoothing test on a sine).
3. Invalid values (NaN, ±Infinity, out of range, wrong type) are rejected by `validateChain`; non-finite audio input yields finite output and increments `nonFiniteInputs`.
4. Live (`createChain` driven in 128-frame blocks) and offline (`renderChain`) output match to within float tolerance for the same parameters and any block size.
5. Mono and stereo; L/R and M/S behave as specified; link mode produces identical L/R gain.
6. Schema: version bump, migration test from every earlier version, fixtures of saved project and preset files load and sound identical with the new module off.
7. Latency reported, compensated, and tested by impulse position.
8. Measured results are asserted against **published tolerances** declared in the issue before implementation (see matrix); tests never claim to prove audible quality.
9. Every visible control has a test showing it changes the live engine output *and* the offline render.
10. Controls are keyboard operable and labelled (Playwright checks at the existing responsive viewport matrix).

## 6. Test matrix (initial, tolerances to be finalised per issue)

| Module | Signal fixture | Assertion | Proposed tolerance |
|---|---|---|---|
| Dynamic EQ | Sine at band centre, stepped level | Static reduction equals `range` limit; steady-state gain vs threshold; attack/release time to 63 % | ±0.5 dB; ±10 % time |
| Tone EQ | Log sweep / impulse FFT | Magnitude at control frequencies vs design curve; boost+cut interaction documented | ±0.3 dB |
| De-esser | Speech-like synthetic: low tone + 6–8 kHz bursts | Reduction only in detect band (wideband) / only band gain (split); out-of-band null in split mode; listen mode excluded from export | ±0.5 dB; out-of-band ±0.1 dB |
| Compressor modes | Tone bursts at several levels | Static curve; attack/release law distinct between modes (assert measurable differences, not "tone") | ±0.3 dB |
| Monitoring | EBU Tech 3341/3342-style generated signals (self-generated, not copied recordings) | Momentary/short-term/integrated vs `loudness.js` and, where available, ffmpeg crosscheck | ±0.1 LU; TP ±0.2 dB |
| Saturation | Sine at several fs | Harmonic levels vs curve; alias products below limit at 96/48/44.1 kHz | to be set after measuring prototype |
| Export | Processed render | Re-read WAV equals render quantised; 16-bit dither only at final stage; ceiling holds | ≤ 1 LSB; ceiling +0.2 dBTP |
| Soak | Any | Repeated load/unload ×20, seek/stop, param sweeps: no throw, no growth in AudioContext/node count, finite output | binary |

All fixtures are generated in code with fixed seeds; none are recordings.

## 7. Issue mapping

At the time of writing this run could not list repository issues (the available tooling did not permit `gh issue list`), so **no mapping to existing issues was verified and no issues were created**, to avoid duplicating open work. Before starting slice 1 a maintainer should check the open list; proposed issue titles match the rows in §4 (slice 1: "DSP fixture harness at 44.1/48/96 kHz", slice 4: "Monitoring bus: GR history, LUFS M/S, TP, correlation", etc.). Existing code comments reference earlier tracker keys (LAS-27, LAS-28, LAS-64) that may correspond to closed work.

## 8. Evidence for this PR

Commands run on the PR branch (Linux CI sandbox):

- `npm ci` — ok.
- `npm run lint` — clean.
- `npm run test:unit` — 313 passed, 1 failed (`tests/server/security.test.js` timing test, see §2). An isolated rerun was not possible in this run (command not permitted), so whether it fails deterministically is unknown.
- `npm run build` and `npm run test:e2e` — **not run** in this run; this PR changes documentation only.

## 9. UI and skin separation

- Parameters (the schema) are the only thing DSP reads. Skins consume parameters through the same React state; they never hold audio logic or private copies of values.
- Proposed seam: components take `params` and `onChange(path, value)`; skin = CSS tokens + optional layout/knob-rendering components selected by a `skin` UI preference stored **outside** the chain schema (so presets and projects are skin-independent).
- Skins planned: Modern Graph (current), Analog Rack, Neo Tuskan — original artwork only; no third-party logos or lookalike trade dress.
- Preserve: independent movable processor windows (`EditorDialog.jsx`), visible Master Level, responsive matrix (`LAS51-*` specs), isolated tooltips (`HelpTip.jsx`), independent Undo/Redo, keyboard access.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Live/offline divergence as modules multiply | Single `createChain` core; parity test is part of every slice |
| Schema churn breaks old projects | One migration per module, inserted disabled; fixtures per version |
| Dynamic EQ / de-esser zipper or instability from gain modulation | Smoothed GR, coefficient interval reuse, NaN/extreme tests |
| Latency stacking (oversampling, look-ahead, multiband) | Latency budget table; compensate; impulse test |
| CPU in AudioWorklet (24-band EQ + new modules, oversampling) | Benchmark in `characterize:chain`; budget per module; allow offline-only heavy modes only if documented |
| Alias/inter-sample overs from saturation before limiter | Oversample; limiter stays last; export ceiling test |
| Monitoring values drifting from offline analysis | Cross-test streaming vs offline on identical fixtures |
| Listen/audition mode leaking into export | Test: export render ignores `listen` |
| Legal/branding exposure from "inspired by" language | Descriptive names only; no logos, presets, or claims of emulation; document original algorithms |
| Scope creep ("everything in one PR") | One issue/PR per row in §4; do not merge without human review |
| Flaky wall-clock tests masking real failures | Track the `security.test.js` timing test; fix or quarantine separately |
| Native plugin hosting expectations | Feasibility study only; browsers cannot load AU/VST3 |
