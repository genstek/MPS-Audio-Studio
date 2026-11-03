**POSTED to Jira** on 2026-11-03 as comment 10198; status QA Ready.

## Sprint 10 delivery update — LAS-70

An ⓘ beside each covered control: 3 s hover or immediate click/tap/keyboard opens a non-modal popover with the name, a short explanation and a link to that function in the in-app Studio help (62 entries). Escape/outside click close it; one at a time; never activates the control.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `1146068`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: Hover delay with a fake clock, early leave, click, keyboard/focus/Escape, no accidental activation, help links and anchors, inventory icons, viewport and z-order, timer cancellation, playback continues (tests/e2e/help.spec.js)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-70 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Parameter-level icons inside the older dialogs (Stems, Compare, References, Account, Settings, Analyze) are not added yet; those dialogs have one ⓘ each (see coverage-inventory.md).
  - Real touch devices and VoiceOver NOT_RUN.
  - Styling provisional until LAS-44/45.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
