**POSTED to Jira** on 2026-11-03 as comment 10189; status QA Ready.

## Sprint 10 delivery update — LAS-71

One shared per-file limit of 250 MiB = 262,144,000 bytes (inclusive) for import/replacement, stems, local references and the server library; clear messages with MiB and bytes; actionable read/memory errors. Large-file load, play and export were measured.

- Branch / PR: `delivery/LAS-40-sprint-10` → https://github.com/genstek/MPS-Audio-Studio/pull/45 (base `delivery/LAS-40-all-sprints`; not main)
- Implementation commit(s): `aa8251d`
- Tested application commit: `2c5d0ceda20e5cb2ffe527386420f1e35f675f3c`
- Environment: Ubuntu 24.04.5 (Linux 6.18, x86_64) · Node 22.23.4 · Chromium 153.0.8010.12 headless via PLAYWRIGHT_EXECUTABLE_PATH · Playwright 1.64.1 · Vitest 5.0.5 · Vite 8.3.4 · default viewport 1280×720 (DPR 1, zoom 100 %) unless a test sets one · synthetic WAV fixtures only
- Checks:
  - PASS: Server gate at limit − 2, limit, limit + 1; clean 413 before the body (tests/server/upload-limit.test.js)
  - PASS: Browser: exactly 262,144,000 bytes imports and plays; +1 byte refused and the track kept; stems and references use the same limit (tests/e2e/upload-limit.spec.js)
  - MEASURED: Large-file measurement: 120.2 MiB: import 1.5 s, export 53 s, peak browser RSS 3,829 MiB; 250 MiB: import 2.8 s, export 123 s, peak RSS 6,810 MiB
  - NOT_RUN: Gennady's manual QA
  - PASS: Full regression on 2c5d0ce: ESLint clean, Vitest 313/313 (26 files), Vite build, Playwright 119/119
- Evidence: https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/LAS-71 · full logs https://github.com/genstek/MPS-Audio-Studio/tree/delivery/LAS-40-sprint-10/docs/delivery/sprints/10/final
- Limitations:
  - Memory: a 250 MiB WAV used up to 6,810 MiB of browser memory (RSS, all processes) during export in this container; there is no streaming decode, so machines with less memory may fail and the studio then shows an actionable message.
  - Browser-only results; Safari, Firefox and the macOS/iOS wrapper (LAS-58) not run.
  - LAS-59 (macOS ECONNRESET on the streamed oversize test) not reproduced: no macOS here; the Linux assertion passes unchanged.
- Gennady's manual QA: **NOT RUN**.
- Proposed status: **QA Ready**. No Done / QA Done without owner acceptance; nothing is merged to main.
