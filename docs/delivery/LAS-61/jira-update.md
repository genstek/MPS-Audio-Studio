**POSTED to Jira** on 2026-11-03 as comment 10191; status QA Ready.

## Sprint 10 delivery update — LAS-61

Editor windows move by their title bar (pointer) or grip (arrow keys), stay inside the viewport, come to the front on click, keep their place when reopened and with the project; Escape closes the focused window; Reset window layout.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `ce72cd4`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: Drag while playing, z-order, reopen position; keyboard positioning, Escape, Reset window layout, resize recovery; phone-size reachability (tests/e2e/editor-windows.spec.js)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-61 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Windows are not resized by dragging an edge: their height is limited to the space below them and the content scrolls.
  - Positions persist across reloads only through a saved project (LAS-69).
  - Visual styling is provisional until LAS-44/45.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
