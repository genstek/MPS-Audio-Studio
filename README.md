# MPS Audio Studio

[![tests](https://github.com/genstek/MPS-Audio-Studio/actions/workflows/tests.yml/badge.svg)](https://github.com/genstek/MPS-Audio-Studio/actions/workflows/tests.yml)

A small web app for mixing and mastering audio in the browser (React, Vite, Web Audio API).
I use it as my QA practice project: test plans, manual and exploratory testing, bug reports and automated tests.
The code was written with AI coding tools. Test design, review and bug finding are my part.

**Tests in this repo**

- 123 Playwright browser tests (35 spec files) in `tests/e2e`
- 314 Vitest unit and server tests (26 files) in `tests/unit` and `tests/server`
- Lint, unit tests and browser tests run in GitHub Actions on every push and pull request. The HTML report is saved as a build artifact.

My QA work on this project (test plans, bug reports, test runs) is described in **[QA_PORTFOLIO.md](QA_PORTFOLIO.md)**.

## Quick start

You need Node.js 22.13 or newer and npm.

```sh
git clone https://github.com/genstek/MPS-Audio-Studio.git
cd MPS-Audio-Studio
npm ci
npm run dev -- --port 5174 --strictPort
```

Open <http://127.0.0.1:5174>. Ctrl+C stops the app.

You can import a WAV file (up to 100 MiB) and play it. Everything runs locally. No account or upload is needed.

## Run the tests

```sh
npm run lint          # code style
npm run test:unit     # Vitest unit and server tests
npm run test:e2e      # Playwright browser tests
npm run check         # all of the above plus a build
```

## Sample-rate conversion and Hi-Res export (LAS-127, Phase 1)

**Export WAV** can write 44.1, 48, 88.2 or 96 kHz (default: Keep original) at 16- or 24-bit, and has a **Hi-Res WAV (96 kHz / 24-bit)** preset. "Convert only" skips the mastering chain. The conversion is a polyphase windowed-sinc (Kaiser β 10, ≈ 100 dB stop-band) filter on the exact rate ratio, run in the render worker before the chain: pitch and duration are unchanged, output length is `round(frames × ratio)`, the pass-band is flat to ≈ 0.9 × the lower Nyquist, and nothing is relabelled, dropped or repeated. Upsampling adds no detail and the dialog says so. Exports over 1 GiB of WAV data are refused. The source file is only read.

QA: `tests/unit/resample.test.js` (synthetic fixtures: lengths, pitch, anti-alias, continuity, channel order, 96/24 bytes, clipping) and `tests/e2e/hires-export.spec.js` (real worker, files read back with an independent header parser). These do not validate listening quality. Not in this phase: stem-mixer resampling (stems must still share one rate) and non-WAV codecs.

## Playwright for beginners

```sh
npm run test:e2e                     # all browser tests
npm run test:e2e -- --grep TC-001    # one test by name
npm run test:e2e:headed              # watch the browser run the tests
npm run test:e2e:ui                  # interactive test explorer
npm run test:e2e:report              # open the last HTML report
```

- The tests start the app on port 5173 and their own account server on port 8788 with fresh data. The app you open by hand uses 5174 and 8787, so both can run at the same time.
- If something already runs on 5173, the tests check that it is this same project. If not, they stop with a clear message.
- On your own computer the tests use installed Google Chrome. In CI they use Playwright's bundled Chromium (`npx playwright install chromium`). To use another Chromium build, set `PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium`.
- Failed tests keep screenshots and traces in `test-results/`. The HTML report links to them.
- A good first test to read is [tests/e2e/mixer.spec.js](tests/e2e/mixer.spec.js). It has short comments on `test`, `page`, locators, `await` and `expect`. Tests use role and label locators and wait for real UI state, with no fixed sleeps.

## Optional: accounts

In a second terminal run `npm run server`. It starts the account server on port 8787 and keeps data in `.data/dev` (not in Git). The **Account** button then lets you sign up, verify and sign in. In development no email is sent. Open `http://127.0.0.1:5174/api/dev/outbox?to=<your test email>` to get the verification link. Without the server the studio still works. See [ADR-003](docs/ADR-003-accounts-and-private-storage.md).

## More docs

- [Processor design preview — LAS-75/76](docs/delivery/LAS-75-76/PREVIEW.md): two opt-in panel layouts and a working graphic EQ proposal.

- [ADR-002: web first](docs/ADR-002-web-first.md)
- [QA acceptance gates](docs/QA_ACCEPTANCE.md)
- [Sprint 0 test results (TC-001)](docs/SPRINT-0.md)
- Older native macOS plans are kept in `docs/` and `legacy/` for history only.
