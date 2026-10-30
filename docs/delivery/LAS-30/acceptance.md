# LAS-30 acceptance trace

Tested commit `ad800eaef0c53355c2c75b00241fa5d4abf85db4`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-30-AC-01 | A profile records track/source version, selected segment, analysis version and measurement definitions | Stored record: asset, source SHA-256 (server-checked), name, style, source version, segment, `mps-analysis-1`, full report and `measurements` definitions | PASS | `tests/server/references.test.js` (first test), README |
| LAS-30-AC-02 | Silence and unsuitable segments handled explicitly; different source versions and styles stay separate | Silent → "This segment is silent; choose one with music."; < 5 s, outside the file and mismatched segments refused (server and dialog); separate profiles per file/version/style | PASS | server tests, `tests/e2e/references.spec.js` |
| LAS-30-AC-03 | Profiles owner-private; original reference audio follows security, consent and deletion policy | Owner-filtered routes (404 for others, 401 signed out), reference-only assets, cascade deletion from profile/asset/project/account (0 rows left); LAS-23/24 storage unchanged | PASS | server tests, second-account browser test |
| LAS-30-AC-04 | Reanalysis reproducible within documented tolerance; UI does not claim model training | Identical profiles for the same file/segment (server test); Reanalyse shows "Reproducible: the same measurements." (tolerance 0.01 dB / 0.0001); dialog text: "Nothing is trained or learned from it." | PASS | server test, browser test |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-30-QA-01 | measure → save → grouped list: PASS | NOT_RUN |
| LAS-30-QA-02 | reanalyse reproducible; second account sees nothing: PASS | NOT_RUN |
| LAS-30-QA-03 | deletion cascades (profile, asset, account): PASS | NOT_RUN |

## Developer checks on `ad800eaef0c53355c2c75b00241fa5d4abf85db4`
- `npm run check`: exit 0 — ESLint 0, Vitest 221/221 (14 files), build, Playwright 67/67.
- `npm run scan:artifacts`: 125 pieces, 0 findings.
