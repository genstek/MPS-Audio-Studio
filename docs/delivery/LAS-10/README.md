# LAS-10 — Playwright JS setup and browser smoke tests

Jira: [LAS-10](https://genstek69.atlassian.net/browse/LAS-10) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-10.md` (branch `docs/LAS-40-claude-code-handoff-2026-10-29`, commit 078c0a0) · Mode: VERIFY_AND_COMPLETE_TEST_COVERAGE

Branch `feat/LAS-10-playwright-ownership` · tested application commit `8b2068f5d64a74a48223eeb4d3b5c300b64809df`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What was already there (verified, kept)
JavaScript Playwright Test with `tests/e2e`, `tests/fixtures/wav.js` synthetic PCM16 tone, Vitest unit tests, role/label locators, no sleeps, HTML report, screenshot and trace on failure, beginner comments in TC-001. All existing tests and geometry assertions are unchanged.

## What this slice adds
- **Server ownership proof.** `vite.config.js` adds a dev/preview-only endpoint `/__mps-checkout` that answers with the served folder and PID. `tests/e2e/global-setup.js` asks the server on 5173 before any test and stops the run if it is another checkout or an older build that cannot identify itself. `reuseExistingServer: true` stays (owner's LAS-49 choice) but is no longer able to test a stale app silently. Every run prints `Testing the app served from <folder> (pid N)`.
- **One-command run without Chrome.** `PLAYWRIGHT_EXECUTABLE_PATH` selects another Chromium build; with it unset the config is exactly the previous installed-Chrome setup.
- **TC-003** (`tests/e2e/import-errors.spec.js`): wrong extension, empty file and text renamed to `.wav` each show the specific error, keep `No audio loaded` and disabled Play, then a valid WAV imports and the error clears.
- **README**: ports 5173 (tests) and 5174 (manual app) reconciled and explained, guard behaviour, report retention and the Chromium override.

## Run it
```sh
npm ci
npm run check                                   # Mac with Google Chrome
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium npm run check   # machines without Chrome
npm run test:e2e -- --grep TC-003               # one case
npm run test:e2e:report                         # HTML report of the last run
```

## Test-to-manual-case map
| Automated test | Manual case / Jira | What it asserts |
| --- | --- | --- |
| `mixer.spec.js` TC-001 | LAS-53 (TC-001) | title/heading, Transport region and status `No audio loaded`, disabled Play/Pause/Stop, Tracks heading/Import enabled/hint, four strips with disabled processing, Master slider and Export disabled |
| `TC-002` (added by LAS-57) | LAS-57 | valid WAV import expectations 1–9 |
| `import-errors.spec.js` TC-003 | LAS-10 scope "TC-003" (no separate Jira Test Case exists yet) | three rejected inputs, error text, nothing loaded, recovery with a valid WAV |
| `playback.spec.js` | LAS-8 / LAS-9 regression | load, play, pause, decode-failure recovery, replacement |
| `responsive.spec.js`, `LAS51-*.spec.js` | LAS-48 / LAS-50 / LAS-51 | responsive regression (see LAS-48/49 delivery) |

## CI (AC-05: proposal only)
No CI exists in the repository and none was added or run. Proposed follow-on: a GitHub Actions job on `ubuntu-latest` running `npm ci`, `npx playwright install --with-deps chromium`, `PLAYWRIGHT_EXECUTABLE_PATH=$(node -e "console.log(require('playwright-core').chromium.executablePath())") npm run check`, and uploading `playwright-report/` and `test-results/` as artifacts. It needs its own Jira issue and review before being enabled.

## Limitations
- Developer runs are Linux + Chromium 141 only (see `../ENVIRONMENT.md`). The Mac/Google Chrome run is Gennady's.
- The guard proves which folder serves the app, not which commit is checked out in that folder; uncommitted edits in the folder are served as-is.
- Other browsers (Firefox/WebKit) are not configured or run.
