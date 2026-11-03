**SYNC_PENDING — not yet posted to Jira.** Desired status: To Do.

## Sprint 10 delivery update — LAS-45

Not started: gated on an approved LAS-44 design. No reskin code exists; the studio keeps its provisional styling. Everything a reskin must preserve is covered by the Sprint 10 regression.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): none (no code)
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - NOT_RUN: Implementation of the approved shell
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-45 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Waiting for: LAS-44 selection by Gennady
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **To Do**. No Done / QA Done without owner acceptance; nothing is merged to main.
