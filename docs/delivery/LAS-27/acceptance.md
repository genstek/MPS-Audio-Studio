# LAS-27 acceptance trace

Tested commit `23865e4a7e465a50b2f39f31782adb39f512c3f3`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-27-AC-01 | Every enabled processor demonstrably changes a known signal as expected; bypass returns the defined unprocessed signal | EQ +6 dB at 1 kHz on the left only; compressor −7.5 dB at 10 dB over a 4:1 threshold; limiter to the ceiling; all processors off → output equals input sample for sample; neutral enabled settings bit-transparent | PASS | `evidence/vitest-chain-verbose.log`, `evidence/chain-report.md` |
| LAS-27-AC-02 | Serialization includes filter frequency/gain/Q, compressor controls, chain order and version for repeatable rendering | schema `mps-chain` v1 with order, 2 × 24 bands (type/frequency/gain/Q/enabled), compressor and limiter fields; stable text; reload renders identical output; 14 invalid inputs refused | PASS | `src/dsp/chain-params.js`, unit tests |
| LAS-27-AC-03 | Numerical checks cover filter response, compression behavior, peak limiting, latency and non-finite output | 900-design stability sweep; FFT response vs transfer function (< 0.00001 dB); compressor curve (≤ 0.017 dB) and timing (±0.2 ms); limiter ceiling 36 cases (≤ +0.026 dB); latency 77/83/155 samples; NaN/Inf guard | PASS | `evidence/chain-report.md`, `evidence/chain-report.json` |
| LAS-27-AC-04 | Original inputs preserved; unsupported settings fail safely; preview/export share documented processing semantics | input arrays unchanged; invalid settings refused (also by the worklet, which keeps the previous ones); worklet preview equals offline render with 0 difference at 3 rates; production build checked | PASS | `evidence/playwright-chain-parity.txt`, `evidence/production-build-worklet.md`, README § Processing semantics |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-27-QA-01 | left/right/Link unit tests: PASS | NOT_RUN |
| LAS-27-QA-02 | characterisation report and unit tests at 44.1/48/96 kHz: PASS | NOT_RUN |
| LAS-27-QA-03 | reload determinism, block-size independence, worklet parity: PASS | NOT_RUN |

## Developer checks on `23865e4a7e465a50b2f39f31782adb39f512c3f3`
- `npm run check`: exit 0 — ESLint 0 problems, Vitest 181/181 (10 files), Vite build OK, Playwright 56/56 (`evidence/npm-run-check-23865e4a7e465a50b2f39f31782adb39f512c3f3.log`, HTML report ZIP).
- `npm run scan:artifacts`: 117 pieces, 0 findings.
- `npm run characterize:chain`: exit 0.
- Listening test: NOT_RUN (LAS-29 protocol; controls arrive in LAS-28).
