**SYNC_PENDING — not yet posted to Jira.** Desired status: QA Ready.

## Sprint 10 delivery update — LAS-63

Cards show on/bypassed/edited state and the configured shape without playback; edits move the shape with a short parameter-driven transition (none with reduced motion); the curves equal the DSP gain computers; real meters stay idle when nothing plays.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `569eb45`, `f9d5ccb`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: Configured shape follows edits, undo and presets without playback; no settings sent by animation; reduced motion; idle meters; 360 px phone (tests/e2e/previews.spec.js)
  - PASS: Compressor and limiter curves equal the chain at steady levels; "edited" marks exactly the changed modules (tests/unit/previews.test.js)
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-63 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Card graphics are small (46 px) in the provisional layout; LAS-65/44 propose larger card graphs.
  - The EQ card shows the left/linked curve only; independent right-channel curves are in the editor.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
