# LAS-57 — TC-002: a valid WAV file is imported successfully

Jira: [LAS-57](https://genstek69.atlassian.net/browse/LAS-57) (Test Case under LAS-10 / test plan LAS-52) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-57.md` · Mode: AUTOMATION_AND_QA_HANDOFF

Branch `test/LAS-57-tc002-valid-wav` · tested application commit `f90adfc9bd3531125ec914d8f950b3b2013fe75a`

Developer status: **READY_FOR_QA** (automation added and passing) · Gennady manual execution: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Automation
`tests/e2e/import-valid-wav.spec.js` — test `TC-002 (LAS-57): a valid WAV file is imported successfully`.
Command: `npx playwright test tests/e2e/import-valid-wav.spec.js --grep "TC-002"`.
Test data: `LAS-TC002-tone.wav`, built in memory by `tests/fixtures/wav.js` (3 s, mono, PCM 16-bit, 44,100 Hz, 440 Hz synthetic tone). To get the file on disk for the manual run:
```sh
node -e "import('./tests/fixtures/wav.js').then(m => require('fs').writeFileSync('LAS-TC002-tone.wav', m.makeWav()))"
```

| Expected result (Jira) | Automated assertion |
| --- | --- |
| 1 empty workspace, status No audio loaded | status `No audio loaded`, badge `00 TRACKS` |
| 2 file picker opens | clicking the visible Import WAV button raises a `filechooser` event; the file is chosen there |
| 3 accepted without error | no `alert` after the import |
| 4 status Ready | status `Ready` |
| 5 badge 01 TRACK | `01 TRACK` visible |
| 6 file name, WAV, decoded information | heading `LAS-TC002-tone.wav`; line `3.0 seconds · 1 channel(s) · <rate> Hz decoded` where \<rate\> is the rate of a default AudioContext on the test machine (browsers may resample; it was 44,100 Hz in the developer run) |
| 7 Import WAV becomes Replace WAV | `Replace WAV` visible, `Import WAV` text gone |
| 8 Play and Stop enabled | both enabled |
| 9 Pause disabled until playback | Pause disabled in Ready; after Play it is enabled (then Stop) |

## Notes for the test case owner
- "WAV" in expected result 6 is shown by the file name extension and the Replace WAV button; the track line has no separate format label. If a format label is wanted, that is a UI change for a story, not this test case.
- On a Mac whose output runs at 48 kHz the line may read `48,000 Hz decoded`; that is resampling by the browser, not a failure.
- Accessibility finding (not changed): after a track loads the button text says **Replace WAV** but the file input's accessible name stays **Import WAV** (`aria-label`). Screen-reader and voice-control users hear a different name from the one on screen. Fixing it changes locators used by the accepted LAS-51 tests, so it is proposed as a follow-up rather than changed here.

## Limitations
Linux Chromium 141 only; manual execution, Mac/Chrome and Jira Test Execution records are Gennady's.
