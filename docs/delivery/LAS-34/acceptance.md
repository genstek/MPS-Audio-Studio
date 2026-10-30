# LAS-34 acceptance trace

Tested commit `98bf1c68e36edc70fa053cb71d41d6c19211e160`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-34-AC-01 | Aligned stems start, pause, resume, seek and stop together without accumulating timing drift | One scheduled start on the shared audio clock per play/seek/resume. Rendered with real Web Audio through 6 transport operations: left and right clicks at identical samples; exact 11,025-sample spacing within runs. Dialog: 3 sources start together; seek restarts them; pause leaves none | PASS | `tests/e2e/stems.spec.js` |
| LAS-34-AC-02 | Gain/pan/mute/solo alter the correct channel; individual and master meters represent real signals | Rendered samples: gain, pan, mute, solo and offset each change only their stem; equal-power values exact. Meters read each strip's own analyser and the master analyser after the switch (−15 dBFS for a centred −12 dBFS mono stem; −60 when muted) | PASS | `tests/e2e/stems.spec.js` |
| LAS-34-AC-03 | Mismatched sample rates, offsets or lengths follow an explicit policy and are explained | Policy table (README); the dialog names the 48 kHz stem's resampling and the different end times; offsets are whole samples; the session lasts as long as the longest stem; more than 2 channels play as a downmix (noted) | PASS | dialog test, README |
| LAS-34-AC-04 | Known aligned fixtures verify summing and timing; single-track flows and LAS-11/LAS-12 behaviour checked | Click and impulse fixtures (timing, summing); stems and single track take turns (unit + browser); the LAS-9/10/11/12 and LAS-51 suites rerun with the stem tests; full check green | PASS | `evidence/playwright-stems.txt`, full check |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-34-QA-01 | aligned clicks through pause/resume/seek; measured alignment: PASS | NOT_RUN |
| LAS-34-QA-02 | gain/pan/mute/solo routing and summing; mono law: PASS | NOT_RUN |
| LAS-34-QA-03 | 48 kHz and shorter stems explained; remove; single-track flows unchanged: PASS | NOT_RUN |

## Developer checks on `98bf1c68e36edc70fa053cb71d41d6c19211e160`
- `npm run check`: exit 0 — ESLint clean, Vitest 266/266 (18 files), build, Playwright 79/79. An earlier run failed 6 layout tests because of a masthead button, fixed before this run.
- `npm run scan:artifacts`: 139 pieces, 0 findings.
