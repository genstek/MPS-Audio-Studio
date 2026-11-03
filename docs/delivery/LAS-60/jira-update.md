**SYNC_PENDING — not yet posted to Jira.** Desired status: QA Ready.

## Sprint 10 delivery update — LAS-60

"+ New" asks for a name, validates it, protects unsaved work with Save / Discard / Cancel and starts a clean session; Cancel keeps everything.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `6793920`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: New project dialog, validation, Cancel, unsaved-work protection (tests/e2e/project.spec.js)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-60 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Visual styling is provisional until LAS-44/45.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
