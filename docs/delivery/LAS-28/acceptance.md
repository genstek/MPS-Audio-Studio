# LAS-28 acceptance trace

Tested commit `c43345d8c4e6369ece63817d1199fe5f14c08677`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-28-AC-01 | Controls update audio behaviour and display units; bypass and undo restore the expected sound/state without overwriting the original | EQ edit reaches the running chain and the export (+6.00 dB at 1 kHz); every field shows its unit; undo/redo (also for a whole drag) restore settings and what the chain receives; per-module on/off; source SHA-256 unchanged | PASS | `evidence/playwright-mastering-controls.txt`, `tests/e2e/mastering-controls.spec.js` |
| LAS-28-AC-02 | A/B retains playback position and uses a documented loudness-matching method | Original/Processed switches gains on two always-running, latency-aligned paths: one source, timer continues; BS.1770 integrated loudness of full original vs full processed render, louder one turned down (6.0 dB case tested) | PASS | README § A/B semantics, `mastering-controls.spec.js` |
| LAS-28-AC-03 | WAV export records sample rate, channel count and bit depth; conversion/dither policy explicit | Export report and dialog: rate/channels of the source, 24-bit (no dither) or 16-bit (seeded TPDF ±1 LSB); no resampling; clipping counted | PASS | README § Export semantics, `evidence/screenshots/export-dialog-1440x900.png` |
| LAS-28-AC-04 | Playwright checks the user workflow; audio inspection confirms exported duration, format and processing with tolerances | 7 Playwright workflows; decoded exports compared sample by sample with the offline chain (≤ 0.5 LSB of 24-bit); independent ffprobe/FFmpeg inspection: pcm_s24le 44.1 kHz stereo, 529,200 samples = source, I −6.7 LUFS (app −6.65), TP −1.0 dBTP | PASS | `evidence/export-inspection.json` |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-28-QA-01 | pointer/keyboard EQ, Left/Right/Link, undo, small screens: PASS | NOT_RUN |
| LAS-28-QA-02 | A/B position and matching gains: PASS | NOT_RUN |
| LAS-28-QA-03 | export format/length/parity, cancel, 16-bit, FFmpeg inspection: PASS | NOT_RUN |

## Developer checks on `c43345d8c4e6369ece63817d1199fe5f14c08677`
- `npm run check`: exit 0 — ESLint 0 problems, Vitest 192/192 (11 files), Vite build OK, Playwright 63/63.
- `npm run scan:artifacts`: 124 pieces, 0 findings.
- `npm run characterize:chain`: exit 0 (4× meter worst +0.026 dB, 32× meter worst +0.09 dB over the ceiling; 16× real time).
- Listening test: NOT_RUN (LAS-29).
