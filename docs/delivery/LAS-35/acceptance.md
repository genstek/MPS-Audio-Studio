# LAS-35 acceptance trace

Tested commit `7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82`. Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-35-AC-01 | Each stem has its own chain/bypass and saved parameters without altering other channels | Per-strip chain (bypass / master copy / file) on its own worklet node; recall through the session file (checksum-matched). Unit test: another stem's strip is bit-identical with and without the first stem's chain. Browser: chain labels and recall | PASS | `tests/unit/stem-render.test.js`, `tests/e2e/stem-render.spec.js` |
| LAS-35-AC-02 | Latency measured and compensated; alignment survives preview and export | Constant 77-sample chain latency, the same bypassed or processing. Offline: impulse positions equal for processed and bypassed stems and through the master. Live vs offline: identical mix to 1.19e-7 after the documented delay | PASS | same |
| LAS-35-AC-03 | Combined and per-stem exports have correct duration, channels and rate; headroom/clipping documented | Session-long files (4.000 s / 176,400 samples), 2 channels, the files' own rate, 24- or 16-bit; peaks, true peak and clipped counts reported; no normalisation; policy table in the README | PASS | browser test, README |
| LAS-35-AC-04 | Tests use known mixtures; cover mute/solo routing, chain recall, failure handling and original-file preservation | Known impulse and tone mixtures; mute/solo (unit + browser); recall; refusals (mixed rates, 3 channels, no stems, bad session files); session checksums equal the uploaded bytes (sources read unchanged) | PASS | unit and browser tests |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-35-QA-01 | different chains per stem change only their stems; bypass and recall repeatable: PASS | NOT_RUN |
| LAS-35-QA-02 | latency-inducing chains keep sample alignment live and offline: PASS | NOT_RUN |
| LAS-35-QA-03 | combined and per-stem WAVs: duration, rate, channels, routing; sources unchanged: PASS | NOT_RUN |

## Developer checks on `7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82`
- `npm run check`: exit 0 — ESLint clean, Vitest 275/275 (20 files), build, Playwright 81/81.
- `npm run scan:artifacts`: 145 pieces, 0 findings.
