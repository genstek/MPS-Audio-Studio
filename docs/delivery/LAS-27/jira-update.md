**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-27

Scope: Processing engine and settings model — versioned schema mps-chain v1 (24 parametric bands per L and per R with Link/independent, compressor, true-peak limiter, fixed order EQ → compressor → limiter, declared bounds); one implementation for AudioWorklet preview and offline export with constant, compensated latency; smoothed live changes; bypass identity; non-finite guards. Controls/A-B/export UI follow in LAS-28.
Branch / PR: feat/LAS-27-processing-chain → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: 23865e4a7e465a50b2f39f31782adb39f512c3f3
Material: docs/delivery/LAS-27/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 processors change signal; bypass identity | EQ/compressor/limiter on known signals; all-off and neutral settings bit-identical | PASS | evidence/vitest-chain-verbose.log, evidence/chain-report.md |
| AC-02 serialization | schema with order, version, all band and dynamics fields; stable text; reload renders identically | PASS | src/dsp/chain-params.js, unit tests |
| AC-03 numerical checks | filter stability/response, compressor curve/timing, limiter ceiling (≤ +0.026 dB over), latency, NaN/Inf | PASS | evidence/chain-report.md |
| AC-04 safe failure, preview/export semantics | invalid settings refused; worklet = offline render (difference 0); production build checked | PASS | evidence/playwright-chain-parity.txt, evidence/production-build-worklet.md |

Commands/environment: npm run check exit 0 (ESLint 0, Vitest 181/181, build OK, Playwright 56/56, Chromium 141, Linux, Node 22.22); npm run scan:artifacts exit 0 (117 pieces, 0 findings); npm run characterize:chain exit 0.
Manual QA: docs/delivery/LAS-27/manual-qa.md — QA-01 left/right/Link, QA-02 characterisation report, QA-03 reload and preview/export parity; Gennady execution NOT_RUN.
Limitations/blockers: no UI yet (LAS-28); no listening test (LAS-29); compressor always stereo-linked; fixed 1.5 ms look-ahead; Mac/Chrome not run. Defect found and fixed: worklet node creation could hang on invalid settings.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
