**POSTED to Jira** on 2026-11-03 as comment 10197; status QA Ready.

## Sprint 10 delivery update — LAS-69

Project files (mps-project v1) keep settings, layout and media identity (SHA-256), never audio; Save / Save As / Open with relink of missing audio; download fallback without the File System Access API; one-module section presets. Review fixes: duplicate stems relink as separate strips; a same-name, same-size replacement is an unsaved change.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `6793920`, `e42b2ff`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: Save, Save again, Save As isolation, reopen after restart with relink; duplicate stems; same-size replacement; cancelled/failed saves; download fallback; section presets; leave-page protection (tests/e2e/project.spec.js)
  - PASS: Round trip, migration, refusal of corrupt/newer/foreign files, unsaved-changes key incl. media identity (tests/unit/project.test.js, tests/unit/module-presets.test.js)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-69 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Native file pickers were exercised with an in-memory stand-in (headless); real Chrome on macOS NOT_RUN.
  - Reference associations are not stored yet (no session-level reference selection exists).
  - Apple wrapper native save (LAS-58, PR #43) NOT_RUN; PR #43 was inspected, not merged.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
