# LAS-31 acceptance trace

Tested commit `5ff67e91d5fe0282d880ee7a182714fe1ecef217`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-31-AC-01 | Tonal balance, loudness/dynamics and stereo measures with consistent units and explanatory labels | Four groups (loudness and level, dynamics, stereo, tonal balance); every row has a unit and a one-line explanation; differences of LUFS in LU, of dBTP in dB; displayed loudness equals an independent Node analysis of the same sections | PASS | `tests/unit/reference-comparison.test.js`, `tests/e2e/compare.spec.js` (first test), `evidence/screenshots/` |
| LAS-31-AC-02 | A/B uses level matching and comparable selected sections; raw loudness differences not presented as quality scores | Monitor loops exactly the measured sections; louder versions turned down to the quietest by their section loudness (reference gain 10^(Δ/20) checked within 0.01); loudness row labelled "Level difference (not a quality measure)" plus a standing note; no interpretation of loudness or quality words | PASS | `tests/e2e/compare.spec.js`, `tests/unit/audio-engine.test.js`, `tests/unit/reference-comparison.test.js` |
| LAS-31-AC-03 | Measured differences distinguished from subjective interpretations; unsupported or uncertain conclusions flagged | Measured table separate from "Interpretation (not a measurement)", worded "may"/"likely"; limits labelled Not compared / Uncertain / Note (mono, unequal or short sections, sample rates); interpretations marked uncertain when any uncertain limit applies; silent, too-short and different-version reports refused | PASS | unit and browser tests |
| LAS-31-AC-04 | Tests cover different durations, mono/stereo, silence and segment selection; selecting a reference applies no processing | Unit: lengths, short section, mono both ways, silence, zero-energy band, sample rates, section selection. Browser: mono/unequal/short/silent/out-of-range. **No processing:** the engine never calls `setParams`; browser probes show no settings messages reach the chain while choosing, switching saved references, comparing and monitoring | PASS | `evidence/vitest-comparison-verbose.log`, `evidence/playwright-compare.txt` |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-31-QA-01 | compare sections, results table, level-matched monitor switching: PASS | NOT_RUN |
| LAS-31-QA-02 | mono, unequal, short, silent, out-of-range sections: PASS | NOT_RUN |
| LAS-31-QA-03 | no settings messages while choosing/switching/comparing/monitoring: PASS | NOT_RUN |

## Developer checks on `5ff67e91d5fe0282d880ee7a182714fe1ecef217`
- `npm run check`: exit 0 — ESLint 0, Vitest 239/239 (15 files), build, Playwright 72/72 (run on the staged tree committed unchanged).
- `npm run scan:artifacts`: 128 pieces, 0 findings.
- Section render accuracy and its no-pre-roll negative control: `evidence/section-render-accuracy.md`.
- Listening review: NOT_RUN.
