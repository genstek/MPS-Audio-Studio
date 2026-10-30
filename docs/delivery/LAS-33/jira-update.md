**SYNC_PENDING — not posted to Jira.** No authorized Jira connection was available in the Claude Code session.

## Delivery candidate — LAS-33

Scope:
- Owner-private **presets**: complete `mps-chain` with origin and versions; save, rename, apply, export, import (LAS-28 settings files migrated; newer/invalid refused), delete.
- **Preferences**: two shelves and a starting strength, kept apart from reference targets; either can be switched off or reset.
- Opt-in **remembered decisions**, with a rating.
- Server schema v5, owner-filtered and validated, with account cascade.
- Settings only; no audio, nothing trained.
- Also fixes the Settings dialog at 360 px (LAS-28).

Branch / PR: feat/LAS-33-presets-preferences → delivery/LAS-40-all-sprints (link in docs/delivery/INDEX.md)
Tested application SHA: d490a50fad2e84629605a0cf5b35ca5f7fa5ccee (tooling follow-up 65f7278)
Material: docs/delivery/LAS-33/ on the delivery branch

| Criterion | Check | Actual result | Evidence |
| --- | --- | --- | --- |
| AC-01 save/rename/apply/export/delete with versions | server + browser (round trip after reload) | PASS | evidence/playwright-presets.txt |
| AC-02 decisions/ratings only with user control, owner isolation | server + browser | PASS | evidence/vitest-presets-verbose.log |
| AC-03 reference targets vs preferences, reset either | unit + browser | PASS | evidence/playwright-presets.txt |
| AC-04 no silent training/upload; serialization tested | traffic check; file tests | PASS | evidence/playwright-presets.txt |

Commands/environment: npm run check exit 0 (ESLint clean, Vitest 264/264, build OK, Playwright 76/76, Chromium 141, Linux, Node 22.22); an earlier run failed 1 test (LAS-32 locator regression, fixed); npm run scan:artifacts exit 0 (136 pieces, 0 findings after the PUT log allowlist follow-up).
Manual QA: docs/delivery/LAS-33/manual-qa.md — QA-01 save/reload/apply, QA-02 import migration and refusals, QA-03 preferences, decisions, second account; Gennady execution NOT_RUN.
Limitations/blockers: preferences are two shelves plus starting strength; remembered decisions are not used by proposals; presets need an account; preference shelves are not counted in the proposal's +6 dB curve guard (each bounded ±4 dB); provisional styling; Mac not run.
Disposition: READY_FOR_QA

No claim of manual sign-off, Jira closure or main merge is implied.
