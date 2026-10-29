# Sprint group 00 — Foundation and current sprint recovery

Native sprint: SCRUM Sprint 0 (ID 2, active, 2026-10-19 → 2026-11-02). This is an execution boundary, not a sprint close; the sprint was not started, closed or re-dated, and Jira sprint fields were not changed.

**Tested integration commit:** `3c8a84f47ab3a21d3e7d6bc0cd0fae3130953b7f` on `delivery/LAS-40-all-sprints` (merge of LAS-49 on top of LAS-7, 8, 9, 10, 11, 12, 48, 57).
`PLAYWRIGHT_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run check` → exit 0 (2026-10-29 17:53–17:56 UTC): ESLint clean, Vitest 16/16, Vite build, Playwright 34/34 on Linux Chromium 141 — `evidence/`.
Baseline before the work: `origin/main` 364d863, 4 unit / 13 E2E passing (`../../baseline/`).

## Per-issue outcome
| Issue | Mode | Branch → PR | Tested SHA | Developer outcome | Gennady manual |
| --- | --- | --- | --- | --- | --- |
| LAS-7 shell | VERIFY_EXISTING | `test/LAS-7-shell-smoke` → [#11](https://github.com/genstek/MPS-Audio-Studio/pull/11) | 655a959 | READY_FOR_QA — console-error smoke at 3 sizes; no app change | NOT_RUN |
| LAS-8 import | VERIFY_AND_CLOSE_GAPS | `feat/LAS-8-import-lifecycle` → [#13](https://github.com/genstek/MPS-Audio-Studio/pull/13) | 2325073 | READY_FOR_QA — newest import wins; lifecycle, boundary, header tests | NOT_RUN |
| LAS-9 transport | VERIFY_AND_CLOSE_GAPS | `feat/LAS-9-elapsed-position` → [#14](https://github.com/genstek/MPS-Audio-Studio/pull/14) | 9e9d817 | READY_FOR_QA — engine-driven elapsed time; resume/restart offsets tested | NOT_RUN |
| LAS-10 Playwright | VERIFY_AND_COMPLETE_TEST_COVERAGE | `feat/LAS-10-playwright-ownership` → [#10](https://github.com/genstek/MPS-Audio-Studio/pull/10) | 8b2068f | READY_FOR_QA — server guard, TC-003, Chromium override | NOT_RUN |
| LAS-11 Pause toggle | IMPLEMENT | `feat/LAS-11-pause-toggle` → [#15](https://github.com/genstek/MPS-Audio-Studio/pull/15) | 760dc13 | READY_FOR_QA — toggle + single pending start | NOT_RUN |
| LAS-12 unload | IMPLEMENT | `feat/LAS-12-unload-track` → [#16](https://github.com/genstek/MPS-Audio-Studio/pull/16) | 4e8a903 | READY_FOR_QA — Remove track, engine unload | NOT_RUN |
| LAS-48 responsive | VERIFY_AND_CLOSE_COVERAGE_GAPS | `test/LAS-48-coverage-gaps` → [#17](https://github.com/genstek/MPS-Audio-Studio/pull/17) | b06590b | READY_FOR_QA for current shell; AC-03/06 and cross-browser BLOCKED | NOT_RUN |
| LAS-49 test plan | TEST_PLAN_RECONCILIATION | `docs/LAS-49-test-plan-reconciliation` → [#18](https://github.com/genstek/MPS-Audio-Studio/pull/18) | b06590b (results reused) | READY_FOR_QA — 24 cases: 14 automated pass, 8 blocked, 2 manual-only | NOT_RUN (24) |
| LAS-57 TC-002 | AUTOMATION_AND_QA_HANDOFF | `test/LAS-57-tc002-valid-wav` → [#12](https://github.com/genstek/MPS-Audio-Studio/pull/12) | f90adfc | READY_FOR_QA — automated; Automation Status proposed "Automated" | NOT_RUN |

Each issue's notes, acceptance trace, evidence and Jira text are in `docs/delivery/LAS-N/`. All Jira updates are **SYNC_PENDING** (no authorized Jira connection in the session).

## Run it locally
```sh
git fetch origin delivery/LAS-40-all-sprints
git switch --detach 3c8a84f47ab3a21d3e7d6bc0cd0fae3130953b7f          # or the branch tip
npm ci
npm run dev -- --port 5174         # manual app at http://127.0.0.1:5174/
npm run check                      # Mac with Google Chrome: lint, unit, build, E2E on port 5173
```
Test WAV files for manual QA are generated from `tests/fixtures/wav.js` (commands in `LAS-8/manual-qa.md` and `LAS-57/README.md`). No accounts, secrets, migrations or backend are involved in this group.

## Regressions
None found: every pre-existing test (TC-001, LAS48-TC-001, playback, all LAS-51 geometry) passes unchanged on the integration commit. User-visible changes to review: time read-out under the status (LAS-9), "Starting playback…" while a start is pending and pressed-looking Pause (LAS-11), Remove track button in the Tracks heading (LAS-12).

## Blockers and open findings
- Firefox / WebKit / Safari not available here (LAS-48 TC-024) — BLOCKED.
- Waveform, EQ, meters, faders, multitrack do not exist yet (LAS-48 AC-03/06; LAS-49 8 cases) — BLOCKED until LAS-27/28/34/35.
- No developer run on macOS / Google Chrome; nobody listened to audio output.
- Accessibility finding (LAS-57): Replace WAV keeps the accessible name "Import WAV"; follow-up proposed, not changed (would alter accepted LAS-51 locators).
- Observation (LAS-7): disabled Play keeps its gold colour at reduced opacity.
- Large-file import responsiveness not measured (LAS-8).
- Handoff package `coverage.csv` failed its own checksum in `CHECKSUMS.sha256` (recorded in `docs/delivery/INDEX.md`).

## Suggested manual QA order for Gennady
1. LAS-10-QA-01 (one-command run on the Mac) and LAS-7-QA-01/02 (clean console, placeholders).
2. LAS-57 TC-002 manual execution, then LAS-8-QA-01..04.
3. Transport: LAS-9-QA-01..03 → LAS-11-QA-01..03 → LAS-12-QA-01..04 (use your own long WAV; listen).
4. Responsive: LAS-48-QA-01..03, LAS48-TC-010 (real zoom), TC-022 if two displays, TC-023 trace review; then LAS-49 review.
Record each as a new Test Execution; all are **Not Run** until you test.
