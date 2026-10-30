# LAS-28 — Editable mastering controls, level-matched A/B and processed WAV export

Jira: [LAS-28](https://genstek69.atlassian.net/browse/LAS-28) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-28.md` · Mode: IMPLEMENT · Prerequisite: LAS-27 (READY_FOR_QA)

Branch `feat/LAS-28-controls-ab-export` · tested application commit `c43345d8c4e6369ece63817d1199fe5f14c08677`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
- **Mixer** strips in processing order. Each opens an editor; nothing is decorative.

  | Strip | Indicator | Editor |
  | --- | --- | --- |
  | EQ | real response thumbnail | EQ |
  | Dynamics | gain-reduction meter from the AudioWorklet | Dynamics |
  | Limiter | gain-reduction meter from the AudioWorklet | Limiter |
  | Space | — still a labelled "Coming soon" placeholder | none |

  The editors are non-modal panels, so the transport stays usable. Each carries its own **Undo/Redo** and **Processed/Original** switch, because the panel covers part of the page.
- **EQ editor:**
  - **Link / Left / Right**, with 24 bands per channel.
  - The curve is the **real transfer function** of the enabled bands at the playback rate. Behind it, the **live spectrum** is read from an `AnalyserNode` after the A/B switch, i.e. what you hear.
  - Drag a point (frequency and gain), or double-click to add a band.
  - Keyboard on a point: ←/→ moves frequency by 1/12 octave, ↑/↓ moves gain by 0.5 dB (Shift for ½ octave / 3 dB), Page Up/Down multiplies or divides Q by 1.25, Delete switches the band off.
  - A band picker (1–24) and numeric fields with sliders (frequency and Q sliders are logarithmic).
  - Typed values outside the range go to the nearest limit.
- **Dynamics and Limiter editors** expose every LAS-27 parameter (threshold, ratio, attack, release, knee, makeup, detector; ceiling, input gain, release) and live gain reduction. The limiter shows its latency.
- **Undo/Redo** keeps up to 100 steps. A drag or a held key is one step. Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z (or Ctrl+Y) work when focus is not in a field.
- **Settings…**: snapshots for this session (save, restore, delete). Settings files: download as versioned JSON (`mps-chain` v1), or load one. An invalid or newer file is refused with the reason, and nothing changes.
- **Master panel:** Processed/Original switch, **Match loudness** with a status line, and **Export WAV**.

## A/B semantics
Every source feeds two paths that always run:
- the chain (AudioWorklet);
- the original, delayed by the chain's latency (77/83/155 samples) so both line up.

The switch only ramps two gains over 20 ms, so the **playback position and the single source are kept**. The browser test switches at a running position, sees the timer continue, and finds exactly one source started.

**Loudness matching:**
- The ITU-R BS.1770 integrated loudness of the whole original and of the whole processed render is measured in a worker, from the file's own samples.
- The **louder version is turned down** by the difference while comparing; nothing is ever turned up, so nothing clips.
- It is re-measured 0.8 s after the settings stop changing. The status line says, for example, "Processed is 6.0 dB louder; the processed version plays 6.0 dB lower while comparing."
- With matching off, both play at their own level.

## Export semantics
- **Source:** the file's own samples at its own sample rate and channel count, decoded by the LAS-26 decoder. It is never resampled and only read.
- **Processing:** the same `createChain()` code as the preview, rendered in a worker with progress. **Cancel** terminates it.
- **Latency is compensated** and the look-ahead tail is rendered, so the export is exactly as long as the source (tested sample for sample).
- **Format:**
  - 24-bit PCM written without dither; rounding error is at −144 dBFS.
  - Optionally 16-bit PCM with seeded TPDF dither of ±1 LSB, so repeated exports are identical. Dither is applied only at this final bit-depth reduction.
  - Samples beyond full scale are clipped and counted in the report.
- **Report:** format, dither, length in seconds and samples, integrated loudness, true peak (4×), sample peak, clipped samples, compensated latency and sample-rate warnings. **Save <name>-master.wav** downloads the file.
- Files with more than two channels play as a stereo downmix. Export and analysis refuse them with a message.

## Preview vs export
Both run the same chain code. LAS-27 proved that the AudioWorklet and `renderChain` give identical samples, and here the export equals `renderChain` on the settings the preview received, within 24-bit rounding. Preview runs at the browser's playback rate (44.1 kHz in this container). When a file's rate differs, the preview hears the browser's resampled audio through equivalent filters, while the export renders at the file's rate: equivalent processing, but not sample-identical.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| EQ edit (band 11, 1 kHz, +6 dB) reaches the preview chain; undo/redo restore it; Escape closes and returns focus | PASS | `mastering-controls.spec.js` |
| Export of that edit: 24-bit, 44.1 kHz, stereo, 176,400 samples (= source); 1 kHz tone +6.00 dB; **equals the offline chain within 24-bit rounding**; source SHA-256 unchanged | PASS | `mastering-controls.spec.js`, annotations |
| A/B at a running position: timer continues, one source; gains 0.501/0 → 0/1 → 0.501/0 with matching (6.0 dB difference measured), 1/0 without | PASS | `mastering-controls.spec.js` |
| Export cancel; 16-bit TPDF mono export with exact length | PASS | `mastering-controls.spec.js` |
| EQ pointer drag (one undo step), double-click add, keyboard steps, Delete, Left/Right independence | PASS | `mastering-controls.spec.js` |
| Settings file round trip, invalid file refused, snapshots | PASS | `mastering-controls.spec.js` |
| Editors fit 360×780, 776×888, 1280×720; no horizontal page overflow | PASS | `mastering-controls.spec.js` |
| Live spectrum peak at a 2.5 kHz tone (±1 bin) | PASS | `mastering-controls.spec.js` |
| **Independent inspection** of a UI export (EQ + compressor + limiter): ffprobe `pcm_s24le`, 44.1 kHz, 2 channels, 12.000 s, 529,200 samples; FFmpeg ebur128 I −6.7 LUFS (app −6.65), TP −1.0 dBTP; decoder parity 6e-8; source hash unchanged | PASS | `evidence/export-inspection.json`, `evidence/screenshots/export-dialog-1440x900.png` |
| Engine unit tests: output stage reuse/disposal, settings/listening/match forwarding, meters, superseded import, stage failure, >2-channel downmix | PASS | `tests/unit/audio-engine.test.js` |
| Encoder unit tests: 24-bit round trip, clipping count, deterministic TPDF, export parity | PASS | `tests/unit/wav-encode.test.js` |
| All earlier tests, including the LAS-48/LAS-51 layout matrix (see test changes below) | PASS | `npm run check`: ESLint 0, Vitest 192/192 (11 files), build, Playwright 63/63; artifact scan 124 pieces, 0 findings |

A browser test only proves wiring and workflow. Measurement accuracy comes from the unit tests, the LAS-27 characterisation and FFmpeg. **No listening test has been run** (LAS-29).

## Defects found and fixed in this slice
1. **Limiter true peak read over the ceiling by finer meters (LAS-27 engine).** The independent FFmpeg inspection read −0.8 dBTP against a −1 dBTP ceiling. A 32× meter confirmed −0.77 dBTP: peaks between the 4× detector's points went unseen. The limiter now detects at 8×, and the same export reads FFmpeg −1.0 dBTP and 32× −0.995 dBTP. A new unit test with these settings fails with a 4× detector and passes with 8×. The characterisation report now includes a 32× column: worst +0.09 dB over the ceiling (spec +0.2). Throughput is 15× real time with all 48 bands (27× before).
2. **Undo was hidden** behind an open editor panel. Fixed: Undo/Redo now sit in each editor header.
3. **Escape did not close an editor** after a button inside became disabled and focus fell to the page. Fixed: Escape is handled while focus is inside the panel or on the page body.
4. **Development regression, caught by the existing LAS-26 test before commit:** 4-channel files could not play once the chain was in the path. Fixed: stereo downmix.

## Intentional test changes
Tests that described the old placeholders now describe the real controls. The layout guarantees did not change.
- `mixer.spec.js` (TC-001) and `shell-smoke.spec.js` (LAS-7): the EQ/Dynamics/Limiter edit buttons are enabled; Space and Master level stay unavailable; Export WAV is disabled until a track is loaded. The strip formerly named "Input" (no input stage exists) is now "Limiter".
- `helpers/layout.js` and `LAS51-layout.spec.js`:
  - Strip names and buttons now come from one table.
  - The export button is named "Export WAV".
  - The strip indicator locator accepts the knob or the real indicator.
  - The master-details last line is the loudness status.
  - The keyboard check's **Tab budget went from 4 to 12** because real controls now sit between Import WAV and the mixer. It still requires Tab to reach the scroller, a visible focus ring, and End/Home scrolling.
- New status lines use `aria-live` instead of `role="status"`, so the original page-level status assertions stay unchanged.

## Changed files
- New: `src/output-stage.js`, `src/render-client.js`, `src/dsp/render.worker.js`, `src/dsp/wav-encode.js`, `src/useChainSettings.js`, `src/MixerPanel.jsx`, `src/EditorDialog.jsx`, `src/EqEditor.jsx`, `src/ModuleEditors.jsx`, `src/ParamField.jsx`, `src/GainReductionMeter.jsx`, `src/ListeningControls.jsx`, `src/ExportDialog.jsx`, `src/SettingsDialog.jsx`.
- Changed: `src/audio-engine.js`, `src/main.jsx`, `src/styles.css`; `src/dsp/chain.js` (progress callback, 8× detector), `src/dsp/true-peak.js` (`interpolationBranches`), `scripts/characterize-chain.js`.
- Tests: `tests/unit/{audio-engine,wav-encode,chain}.test.js`, `tests/e2e/mastering-controls.spec.js`, `tests/e2e/helpers/chain-probe.js`, plus the updated specs listed above.

## Limitations
- The master level / output trim is not implemented and stays labelled unavailable. Space (reverb/width) is a placeholder.
- Snapshots last for the session only; there is no preset library yet (LAS-33). Settings files hold the chain only, not the project.
- Loudness matching renders the whole track for each measurement, so its time grows with track length (5.7 s for 2 minutes of stereo 44.1 kHz with the default chain, measured here on an idle machine). Until a new measurement lands after an edit, the previous matching gain applies.
- No waveform, seeking or loop yet.
- Styling is provisional until the LAS-44/45 design gates.
- Linux Chromium 141 only; not run on Mac/Chrome; no listening test.
