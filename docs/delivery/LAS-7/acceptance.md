# LAS-7 acceptance trace

Tested commit `655a959bc089a0d809caad0c73d8e74886bd8f41`. Developer results only; manual results are NOT_RUN in `manual-qa.md`.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-7-AC-01 | Documented command starts app locally with no console errors | Playwright starts `npm run dev -- --port 5173 --strictPort`; shell-smoke asserts no console error / page error / failed request / HTTP ≥ 400 at three sizes; negative control fails as expected | PASS | `evidence/npm-run-check-655a959bc089a0d809caad0c73d8e74886bd8f41.log`, `evidence/negative-control-console-error.log` |
| LAS-7-AC-02 | Renders in Chromium at baseline viewport and stays usable smaller | 1280×720, 1440×900, 761×450 regions visible; LAS-51 geometry suite also passes in the same run | PASS (Chromium 141) | `evidence/screenshots/`, HTML report |
| LAS-7-AC-03 | Empty state gives a clear way to import | "Your session starts here", visible enabled Import WAV | PASS | same |
| LAS-7-AC-04 | Placeholders cannot imply working DSP | four strip buttons, Master level and Export disabled; "Coming soon"/"unavailable" text visible | PASS | same |
| LAS-7-AC-05 | Code changes and screenshots in a PR linked to the story | branch `test/LAS-7-shell-smoke`, PR link in `docs/delivery/INDEX.md`, screenshots in `evidence/screenshots/` | PASS | this folder |
| LAS-7-AC-06 | UI smoke test feasible via Playwright | `shell-smoke.spec.js` and existing TC-001 run in `npm run check` | PASS | log |
