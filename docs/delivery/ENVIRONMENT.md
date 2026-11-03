# Developer test environment for this delivery

All developer checks in `docs/delivery/` were run by Claude Code in a Linux cloud container unless a file says otherwise. They are **not** macOS, real-device, hardware-audio or listening results, and they are not Gennady's manual QA.

| Item | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS (Linux 6.18, x86_64) |
| Node / npm | v22.22.0 / 10.9.4 |
| Playwright | @playwright/test 1.64.1 |
| Browser | Chromium 141.0.7390.37, selected with `PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Google Chrome is not installed here; the repository default stays `channel: 'chrome'`) |
| Vitest / Vite / ESLint | 5.0.5 / 8.3.4 / 10.13.0 |
| Viewport / DPR / zoom | Playwright `Desktop Chrome` (1280×720, DPR 1) unless a test sets the viewport; zoom 100 % |
| Audio output | None. Headless Chromium decodes and schedules audio, but nobody listened and no audio device output was measured |
| Test server | `npm run dev -- --port 5173 --strictPort` started by Playwright from the tested checkout; since LAS-10 the run log prints the folder and PID that served the app |
| Baseline | `origin/main` 364d863de109d1e474bff0635bc0b451224e8860: lint exit 0, unit 4/4, build exit 0, E2E 13/13 (Chromium 141, out-of-repo override; logs in `docs/delivery/baseline/`) |

Captured text logs under `docs/delivery/**/evidence/` and `docs/delivery/baseline/` are verbatim except that trailing spaces and blank lines at the end of a file are removed (so `git diff --check` stays clean) and private temporary folders are shown as `<scratch>`.
