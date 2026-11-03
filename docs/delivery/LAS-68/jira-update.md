**SYNC_PENDING — not yet posted to Jira.** Desired status: QA Ready.

## Sprint 10 delivery update — LAS-68

Master Level is a monitor volume (mute … 0 dB) after the Original/Processed switch, for the single track and the stem mix, kept per browser; it is not applied to exported WAVs. Gain is measured at the speakers.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `8e74cc1`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: 0 dB, −6 dB and mute measured at the speakers in both A/B paths without interrupting playback; L-only, R-only and mono; kept through pause/stop/editors/replacement/unload/reload; export unchanged; stem mix (tests/e2e/master-level.spec.js)
  - PASS: Gain law and routing (tests/unit/monitor-bus.test.js)
  - NOT_RUN: Gennady's manual QA
  - NOT_RUN: Gennady's listening check
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-68 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Hardware output was not measured (no audio device); levels are the samples sent to the destination.
  - Visual styling is provisional until LAS-44/45.
- Gennady's manual QA: **NOT RUN**; listening: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
