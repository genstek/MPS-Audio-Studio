# LAS-27 manual QA for Gennady

Actual results stay **Not Run** until you test. LAS-27 is the processing engine; the knobs, A/B and export buttons come in LAS-28, so these checks use the project's scripts and tests on your Mac (Node 22.13+, Chrome installed for Playwright or `PLAYWRIGHT_EXECUTABLE_PATH` set).

| Case | Steps | Expected | Actual | Outcome |
| --- | --- | --- | --- | --- |
| LAS-27-QA-01 | `npx vitest run tests/unit/chain.test.js -t "left-channel band"` and `-t "Link edits"`; then open `docs/delivery/LAS-27/README.md` § Link semantics. | Both pass. In independent mode a left band changes only the left channel (right output equals the input sample for sample); in Link mode the same edit changes both. | Not Run | NOT_RUN |
| LAS-27-QA-02 | `npm run characterize:chain -- ./chain-report` and open `chain-report/chain-report.md`. | EQ deviation from the transfer function ≤ 0.01 dB; compressor curve within 0.1 dB of the expected gain; measured attack/release within ±5 % of the set times; limiter output true peak ≤ ceiling + 0.2 dB at 44.1/48/96 kHz; latency 77/83/155 samples; no script error. | Not Run | NOT_RUN |
| LAS-27-QA-03 | `npx vitest run tests/unit/chain.test.js -t "block size"` and `-t "round trip"`; `npx playwright test tests/e2e/chain-parity.spec.js`. | Reloaded settings render identical output; the browser's AudioWorklet preview equals the offline render within 1e-6 at 44.1/48/96 kHz. | Not Run | NOT_RUN |

Listening checks (does it sound right, no clicks while adjusting) belong to LAS-28 once the controls exist.
