# MPS Audio Studio — Web Mixer & QA Automation

Approved direction: **React + Vite + JavaScript + Web Audio API**, with JavaScript Playwright browser tests and Vitest logic/audio tests. Tracking: [SCRUM-6](https://genstek69.atlassian.net/browse/SCRUM-6), under [SCRUM-5](https://genstek69.atlassian.net/browse/SCRUM-5).

## Run on your Mac

Requires Node.js 22.13+ (verified with 22.17.0; the optional account server uses Node's built-in SQLite), npm and Google Chrome in Applications.

```sh
cd "/Users/g_lab/Documents/ChatGPT/LoVerse OS - Mastering/MPS-Audio-Studio"
npm ci
npm run dev -- --port 5174 --strictPort
```

Open <http://127.0.0.1:5174>. Keep the Terminal window open; Control-C stops the app. To use another checkout, change the `cd` path. Playing audio needs no account, server or upload.

Optional accounts ([ADR-003](docs/ADR-003-accounts-and-private-storage.md)): in a second Terminal run `npm run server` (account server on port 8787, data in `.data/dev`, ignored by Git). The **Account** button then lets you create an account, verify it and sign in. In development, emails are not sent: open `http://127.0.0.1:5174/api/dev/outbox?to=<your test email>` to read the verification link. Without the server the studio works as before and the Account dialog says accounts are unavailable.

The JavaScript React/Vite app has an empty session, transport, track area, planned processing strips and master section. Import a WAV (up to 100 MiB) for local decoding and single-track Play / Pause / Stop. Decoded sample rate may differ from the original because AudioContext may resample. Replacement decode errors preserve the previous track. EQ, dynamics, multitrack, waveform/seek, level controls, meters and export are visibly unavailable; no mastering processing is claimed.

## Playwright for beginners

```sh
npm run test:e2e                       # all browser tests; starts or reuses the app on 5173
npm run test:e2e -- --grep TC-001       # just the mixer UI smoke test
npm run test:e2e:headed                # watch Chrome run the tests
npm run test:e2e:ui                    # interactive test explorer
npm run test:e2e:report                # open the latest HTML results
npm run check                         # lint + unit tests + build + browser tests
```

Run these from the same repository directory. Test runs use port **5173** and start their own account server on **8788** with fresh data; the app you open manually uses **5174** (and 8787), so they can run together. If something already listens on 5173, the tests reuse it only after it proves it serves this same folder: the app's dev server answers `http://127.0.0.1:5173/__mps-checkout` with its folder, and `tests/e2e/global-setup.js` stops the run with a clear message when it is another checkout (or an older build without that answer). The first line of a run prints which folder and process served the app. UI mode opens an explorer: select a test and press Run. The HTML report contains the last completed run, not the current app state. Terminal output gives the pass/fail summary and exits nonzero on failure. Failure screenshots and traces are kept in `test-results/`; the report links to them. To keep a report, zip the `playwright-report/` folder before the next run. Generated results are ignored by Git.

This configuration uses installed Google Chrome (Chromium engine) via `channel: 'chrome'`. On this macOS 13.7.8 machine, the current Playwright managed Chromium download was unsupported; no `npx playwright install` is needed for the Chrome channel. If Chrome is missing, install it in Applications first. On a machine without Chrome, point the tests at another Chromium build: `PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium npm run check`.

Read [TC-001 and the executed results](docs/SPRINT-0.md). [The smoke test](tests/e2e/mixer.spec.js) introduces `test`, `page`, locators, `await` and `expect` in short comments. Each case gets a fresh page. Role/label locators use the names people and assistive technology see; assertions wait for actual UI state without sleeps. The separate playback regression imports an original generated PCM16 tone. Unit tests mock AudioContext and check lifecycle behavior; they do not measure sound quality.

Read [ADR-002](docs/ADR-002-web-first.md), [the repository audit](docs/SCRUM-6_AUDIT.md) and [AGENTS.md](AGENTS.md) for the approved architecture and historical context.

## Historical native handoff

This package contains the product and engineering documentation for a **new native-installable macOS application**. It also includes a legacy HTML prototype for behavioral reference, **not production code**.

## Start here
1. Read `AGENTS.md` and all `docs/` files.
2. Start with `docs/IMPLEMENTATION_PLAN.md` Milestone 0 and 1.
3. Follow `docs/QA_ACCEPTANCE.md` for release gates.
4. Use `schemas/preset.example.json` as a first version of preset interchange.
5. Use `reference/REFERENCE_BASELINE.md` to understand the approved Lia v6 sonic target.

## Recommended stack
**JUCE 8 / C++20 + CMake** for macOS standalone DSP app, real-time audio, AU/VST3 hosting later, and installer packaging. Create an original UI with custom JUCE components; keep audio DSP and UI independent. Optional future Rust/TypeScript service or UI is a separate architectural decision, not a default dependency. Validate JUCE licensing and third-party component licenses before distribution.

## Constraints
macOS first; Apple Silicon and Intel if toolchain supports both; offline/local by default; WAV 16/24/32-bit input; WAV 24-bit export; 44.1/48/96 kHz. Prefer non-destructive project saves. No external service required to play or master audio.

## Historical inputs
`legacy/` contains the old HTML; it had stack overflow and page hangs. It is not a certified reference implementation. `reference/` records prior listening conclusions; actual audio files must be supplied by the owner locally.
