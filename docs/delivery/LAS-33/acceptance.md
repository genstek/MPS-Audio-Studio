# LAS-33 acceptance trace

Tested application commit `d490a50fad2e84629605a0cf5b35ca5f7fa5ccee` (tooling follow-up `65f7278`). Developer results; Gennady's manual QA is NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-33-AC-01 | Save, rename, apply, export where appropriate and delete a preset with its processing/analysis versions | Settings → My presets: save, rename, apply (one undo step), export (`mps-preset` v1), import, delete. Each preset carries chain version, origin, analysis and proposal versions and strength. Server and browser tests prove the complete chain round trip after a page reload | PASS | `tests/server/presets.test.js`, `tests/e2e/presets.spec.js` |
| LAS-33-AC-02 | Accepted/rejected variants and explicit ratings stored only with clear user control and owner isolation | "Remember my decision" is off by default, with an optional rating 1–5. Decisions are stored only when it is ticked; listed and forgettable one by one or all; owner-filtered (404 for others, 401 signed out); removed with the account; links to deleted profiles are forgotten | PASS | server tests, browser test |
| LAS-33-AC-03 | A new proposal distinguishes reference-derived targets from user preference adjustments and allows resetting either | "Your preferences" card separate from the reference modules, on its own EQ bands (23–24). "Use reference targets" / "Use my preferences" switches apply to preview, check and apply. "Reset my preferences" keeps the reference targets (browser test checks the bells stay and the shelf goes) | PASS | `tests/unit/presets.test.js`, browser test |
| LAS-33-AC-04 | Preferences do not silently fine-tune an external model or upload music; serialization/recall is tested | Only settings JSON is stored (no audio, no model, nothing trained). The browser traffic check shows every presets/preferences/decisions request went to this studio as JSON under 64 KiB. Serialization: stable `mps-preset` text, round trip, migration, refusals; recall after reload equals the saved chain | PASS | unit, server and browser tests |

## Focused verification cases (prepared for manual QA)
| Case | Developer automation | Manual status |
| --- | --- | --- |
| LAS-33-QA-01 | customised chain (independent L/R, compressor, limiter) saved → reload → applied → identical: PASS | NOT_RUN |
| LAS-33-QA-02 | old file migrated; invalid/newer refused; current settings untouched: PASS | NOT_RUN |
| LAS-33-QA-03 | preferences reset keeps reference targets; other account sees nothing: PASS | NOT_RUN |

## Developer checks
- `npm run check` on `d490a50`: exit 0 — ESLint clean, Vitest 264/264 (18 files), build, Playwright 76/76. An earlier full run failed 1 test because of my LAS-32 locator regression, fixed before this run; see the README.
- `npm run scan:artifacts` with the tooling follow-up: 136 pieces, 0 findings. The first scan warned about a PUT log line outside the old allowlist.
