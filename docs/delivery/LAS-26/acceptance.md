# LAS-26 acceptance trace

Tested commit `a21e687624ae867b1b957256498552f9e2e0c430`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-26-AC-01 | Report includes integrated loudness, sample and true peaks, useful dynamics measures, spectral energy and stereo/mono indicators where applicable | Report sections loudness/peaks/dynamics/stereo/spectrum; mono files show "stereo measures do not apply"; browser test reads every section for the EBU tone | PASS | `README.md`, `evidence/ui-report-ebu-tone.txt`, `evidence/screenshots/`, `tests/e2e/analysis.spec.js` |
| LAS-26-AC-02 | Known tones, silence, mono/stereo and deliberately clipped fixtures produce validated results with documented tolerances | EBU Tech 3341 tests 1–4 (±0.1 LU), EBU Tech 3342 tests 1–4 (±1 LU), true-peak sweeps (±0.05 dB), silence/short/mono/clipped/inverted/uncorrelated/unbalanced fixtures; independent FFmpeg ebur128 cross-check, 24/24 within tolerance | PASS | `evidence/vitest-analysis-verbose.log`, `evidence/crosscheck-ffmpeg.md` |
| LAS-26-AC-03 | Measurement definitions and reference implementation recorded; sample peaks not mislabeled as true peaks | Definitions in README; separate rows "True peak (4× oversampled) … dBTP" and "Sample peak … dBFS"; intersample test shows them differ by 3 dB | PASS | `README.md` § Measurement definitions, `src/dsp/` |
| LAS-26-AC-04 | Unsupported/corrupt inputs fail clearly; original audio unchanged; UI responsive during analysis | 9 corrupt/unsupported decoder cases; 4-channel file → clear message, playback continues; disk SHA-256 unchanged and shown in the report; worker analysis with 0 main-thread long tasks, cancel/retry, dialog closable while running | PASS | `tests/unit/wav-decode.test.js`, `evidence/playwright-analysis-annotations.txt`, `evidence/html-report-a21e687624ae867b1b957256498552f9e2e0c430.zip` |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-26-QA-01 | unit fixtures + FFmpeg cross-check: PASS | NOT_RUN |
| LAS-26-QA-02 | long-file worker test, cancel/retry, 4-channel refusal: PASS | NOT_RUN |
| LAS-26-QA-03 | repeat analysis identical, SHA-256 unchanged: PASS | NOT_RUN |

## Developer checks on `a21e687624ae867b1b957256498552f9e2e0c430`
- `npm run check`: exit 0 — ESLint 0 problems, Vitest 135/135 (9 files), Vite build OK, Playwright 52/52 (`evidence/npm-run-check-a21e687624ae867b1b957256498552f9e2e0c430.log`, HTML report ZIP).
- `npm run scan:artifacts`: 116 pieces, 0 findings (`evidence/scan-artifacts-a21e687624ae867b1b957256498552f9e2e0c430.json`).
- `npm run crosscheck:analysis`: exit 0, 24/24 within tolerance (run on `d8143f0`, identical application code).
