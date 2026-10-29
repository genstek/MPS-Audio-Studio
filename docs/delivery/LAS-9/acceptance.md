# LAS-9 acceptance trace

Tested commit `9e9d8174fc932269e8b6911754f4f2255da1af2e`. Developer results only; manual results are NOT_RUN in `manual-qa.md`.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-9-AC-01 | Play disabled until ready; click starts after a gesture | TC-001/TC-002 disabled→enabled; LAS-9 Playwright Play click → Playing, source started | PASS (Chromium) | `evidence/npm-run-check-9e9d8174fc932269e8b6911754f4f2255da1af2e.log` |
| LAS-9-AC-02 | Pause stops and resume continues from the expected position | unit offset test; Playwright resume offset within 0.051 s of the frozen display | PASS (engine start offset, not listened) | same, HTML report |
| LAS-9-AC-03 | Status and playhead reflect engine state | timer reads `engine.position()`; Playwright checks advance/freeze/reset | PASS | same |
| LAS-9-AC-04 | End of track → clear stopped state | Playwright natural end → Stopped, 00:00.0, Play enabled; unit natural-end tests | PASS | same |
| LAS-9-AC-05 | Rapid clicks and failed decode do not crash/freeze | disabled-while-pending UI; LAS-8 failed-decode tests | PASS (partial: engine double-start guard in LAS-11) | same |
| LAS-9-AC-06 | Deterministic unit tests + Playwright visible behaviour | Vitest 11/11, Playwright 21/21 | PASS | same |
| LAS-9-AC-07 | At least Chromium; others pending | Chromium 141 run; Chrome/macOS, Safari, Firefox not run | PASS for Chromium; others NOT_RUN | `../ENVIRONMENT.md` |
