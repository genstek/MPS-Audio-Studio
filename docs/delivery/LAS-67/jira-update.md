**SYNC_PENDING — not yet posted to Jira.** Desired status: QA Ready.

## Sprint 10 delivery update — LAS-67

FF/RWD skip 5 s (hold repeats every 200 ms after 400 ms and now stops at the track ends), a seekable timeline with a ruler, L/R needles (VU-style RMS), bars with peak hold and a clip latch, and an output spectrum, all read from what reaches the speakers. Playback position no longer re-renders the whole studio (fixes main-thread long tasks found by the LAS-26 test).

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `a915a54`, `2c5d0ce`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: FF/RWD, hold-to-seek incl. holding through the end while playing, timeline, needles/bars/clip/spectrum from real output, rapid seeking with replacement/unload, 360 px phone (tests/e2e/player.spec.js)
  - PASS: No main-thread task ≥ 200 ms during a 2-minute analysis while playing (tests/e2e/analysis.spec.js, LAS-26)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-67 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - The look (tape deck vs compact hybrid) waits for the LAS-44 selection.
  - Needles are an RMS approximation with VU-like timing, not calibrated VU/PPM.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
