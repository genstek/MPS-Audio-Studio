# LAS-29 acceptance trace

Tested commit `0c961b92d61c45cdda40c3bf505d1ac63721243c`. Developer results; Gennady's manual QA and listening review are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-29-AC-01 | Versioned fixtures cover silence, impulses, tones, stereo phase, transient-rich audio and representative music | `mps-fixtures-1`: silence, impulse, 3 tones, sweep, inverted/quadrature/left-only stereo, transients, synthetic programme and a hot version, at 44.1 and 48 kHz, with PCM hashes in the golden file | PASS for the synthetic set; **authorized music clips not available** (synthetic programme only; real songs only through the local listening-set tool) | `tests/fixtures/dsp-fixtures.js`, `tests/golden/dsp-golden.json` |
| LAS-29-AC-02 | Checks detect unintended clipping, NaN/Inf, timing/channel changes and regressions in bypass/processing | Independent render checks plus golden comparison; negative tests prove each detection on deliberately broken renders | PASS | `tests/unit/dsp-regression.test.js`, `evidence/dsp-regression.md` |
| LAS-29-AC-03 | Listening review records punch, bass balance, vocal clarity, harshness, pumping and mono compatibility without presenting taste as objective truth | Protocol and blind-set tool with a review sheet for exactly these attributes plus preference, worded as impressions; loudness-matched, aligned, blind | Prepared (tooling PASS); **review NOT_RUN** | `listening-protocol.md`, `evidence/listening-demo/` |
| LAS-29-AC-04 | Supported browsers/devices and performance documented; results reproducible; limitations visible | Browser/device table (tested vs not run), performance with the host and its variance, golden versioning policy, limitations and blockers | PASS (documentation; Mac/other browsers not run) | README |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-29-QA-01 | Full regression 96/96 clean, FFmpeg PASS, negative tests PASS | NOT_RUN |
| LAS-29-QA-02 | Blind-set tooling verified on synthetic files | NOT_RUN (no listening yet; Lia v6 reference blocked on the authorized file and checksum) |

## Developer checks on `0c961b92d61c45cdda40c3bf505d1ac63721243c`
- `npm run check`: exit 0 — ESLint 0, Vitest 208/208 (13 files), build, Playwright 63/63.
- `npm run dsp:regression -- --ffmpeg`: exit 0 — 96 renders, 0 findings, 0 golden differences, FFmpeg PASS.
- `npm run scan:artifacts`: 124 pieces, 0 findings.
