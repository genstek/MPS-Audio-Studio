# LAS-49 — LAS-48 test plan reconciliation (24 cases)

Jira: [LAS-49](https://genstek69.atlassian.net/browse/LAS-49) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-49.md` · Mode: TEST_PLAN_RECONCILIATION

Branch `docs/LAS-49-test-plan-reconciliation` (documentation only) · automated results reconciled against `b06590ba02bf5209d67cbf6a5b0e5c83345ec5cd` (LAS-48 run, Linux, Chromium 141; `../LAS-48/evidence/`)

Developer status: **READY_FOR_QA** (reconciliation complete) · Gennady manual execution: **NOT_RUN** for all 24 · Jira sync: **SYNC_PENDING**

The 24 original cases are kept with their IDs and wording in Jira. This file adds, per case: the automated test that covers it, the developer's automated result on the stated build, the historical evidence and its exact build, the manual status (always Not Run here) and what still blocks it. The old plan header said only Epic/Story/Task/Subtask existed; native Test Plan / Test Case / Test Execution types now exist in LAS (e.g. LAS-52/53/55/56), so the 24 cases can become native Test Cases when Gennady chooses — this session does not create Jira issues.

Rules applied: an automated pass is a developer record, not a manual Pass; historical passes are tied to their build and are not re-used as runs of the new build; cases for controls that do not exist stay Blocked.

## Case reconciliation

| Case | P | AC | Automated coverage (file › test) | Dev automated @ `b06590b` | Historical evidence | Manual | Gap / owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LAS48-TC-001 Initial empty workspace fits desktop | P0 | 2,7 | responsive.spec › LAS48-TC-001 (original, unchanged); LAS51-layout › empty layout + sweeps; LAS48-coverage › matrix, empty | PASS | LAS-50 closure: automated pass on PR #8 candidate = main 364d863 (no post-merge manual screenshot for this exact case) | Not Run | Manual Chrome/Mac run |
| LAS48-TC-002 Imported track fits | P0 | 2,5,7 | LAS48-coverage › matrix, WAV-loaded (WAV-A 90 s stereo 48 kHz); LAS51-layout › WAV-loaded | PASS (waveform/meters subchecks Blocked) | LAS-51 loaded-state manual checks at 817×598 and 785×520 on 364d863 | Not Run | Waveform/meters: LAS-34/LAS-28 |
| LAS48-TC-003 Width-only resize | P0 | 1,2,5 | LAS48-coverage › TC-003 exact sequence at height 900 | PASS | — | Not Run | Manual window drag |
| LAS48-TC-004 Height-only and compact | P0 | 1,2,7 | LAS48-coverage › TC-004 exact sequence; LAS51 height sweeps | PASS (no inspector exists) | — | Not Run | Inspector panel does not exist |
| LAS48-TC-005 Maximize/restore real window | P1 | 1,5 | none (OS window controls) | NOT_RUN | — | Not Run | Manual only |
| LAS48-TC-006 Breakpoints both directions | P0 | 1,2,7 | LAS51-layout › 760/761/762 and 759/762 crossings, 450-px height, both directions | PASS | LAS-51 closure on 364d863 (automated + manual original scenarios) | Not Run | Manual slow/fast drag |
| LAS48-TC-007 Narrow and portrait | P1 | 2,7 | LAS48-coverage › matrix 768×1024 (desktop layout) and 390×844 (stacked); LAS51 600×650 | PASS (no collapsible panels exist) | — | Not Run | Compact navigation/inspector: LAS-44/45 design |
| LAS48-TC-008 Many tracks bounded | P1 | 3 | none | BLOCKED | — | Not Run | Single-track product; LAS-34/35 |
| LAS48-TC-009 Long secondary content scrolls locally | P1 | 2,3 | LAS51-layout › Master details scroller ends and keyboard Home/End | PASS (Master details is the only secondary scroller) | LAS-51 closure 364d863 | Not Run | Future inspector/settings |
| LAS48-TC-010 Real browser zoom 125/200 % | P1 | 2,4 | LAS48-coverage › zoom-equivalent viewports at DPR 1.25/2 (**emulated**) | PASS (emulation only) | — | Not Run | Real zoom is manual; emulation is not accepted as zoom evidence |
| LAS48-TC-011 Keyboard focus survives resize | P1 | 4 | LAS48-coverage › TC-011; LAS51 keyboard scroller checks | PASS | — | Not Run | Manual keyboard pass |
| LAS48-TC-012 Playback continues during resize | P0 | 1,5 | LAS48-coverage › TC-012/013/014 (position advancing, one source); LAS51 › playback state | PASS (state only) | — | Not Run | Listening for audible glitches is manual |
| LAS48-TC-013 Paused position preserved | P0 | 5 | LAS48-coverage › TC-012/013/014 (position unchanged, resume offset) | PASS | — | Not Run | — |
| LAS48-TC-014 Stopped state and transport regression | P0 | 5 | LAS48-coverage › TC-012/013/014; LAS-9/11 transport tests | PASS | — | Not Run | — |
| LAS48-TC-015 Channel/project settings persist | P0 | 5 | none | BLOCKED | — | Not Run | Gain/pan/mute/solo/EQ not implemented: LAS-28 |
| LAS48-TC-016 Waveform geometry and seeking | P1 | 6 | none | BLOCKED | — | Not Run | No waveform/seek: LAS-34/35 |
| LAS48-TC-017 EQ graph resizes | P1 | 6 | none | BLOCKED | — | Not Run | LAS-27/28 |
| LAS48-TC-018 Meters aligned and live | P1 | 6 | none | BLOCKED | — | Not Run | LAS-26/28 |
| LAS48-TC-019 Fader/pan pointer coordinates | P0 | 6 | none | BLOCKED | — | Not Run | LAS-28 |
| LAS48-TC-020 EQ drag coordinates | P1 | 6 | none | BLOCKED | — | Not Run | LAS-28 |
| LAS48-TC-021 High-DPI rendering | P1 | 6,8 | LAS48-coverage › DPR 1.25 and 2 layout (**emulated**, no canvases exist) | PASS (layout only, emulated) | — | Not Run | Real high-DPI display; canvases later |
| LAS48-TC-022 Move between different-DPI displays | P1 | 1,5,6,8 | none | NOT_RUN | — | Not Run | Needs two real displays |
| LAS48-TC-023 TC-001 UI Mode / trace | P0 | 8 | mixer.spec › TC-001 unchanged; fresh traces 1280×720 and 1440×900 in `../LAS-48/evidence/tc001-traces/` | PASS (TC-001); trace inspection NOT_RUN | Original report on PR #2 build (viewer vs app not separated) | Not Run | Gennady inspects snapshots; viewer scroll documented separately |
| LAS48-TC-024 Cross-browser regression | P1 | 2,6,7,8 | none outside Chromium | BLOCKED | LAS-56: Chromium on macOS, 364d863 (TC-001 only) | Not Run | Firefox/WebKit not installable in this container; Safari manual |

Counts for the developer column: PASS 14 (TC-010 and TC-021 emulation only, TC-012 state only), BLOCKED 8, NOT_RUN 2 (TC-005, TC-022) = 24. TC-023's trace inspection is a separate manual step. Manual: 24 Not Run.

## Acceptance matrix (LAS-48 AC → cases → current state)
| AC | Cases | Developer automated state |
| --- | --- | --- |
| AC1 resize/maximize/display | 03–06, 12, 22 | automated parts PASS; 05, 22 manual |
| AC2 no overflow, usable core | 01–07, 09–10, 24 | PASS in Chromium; 24 Blocked |
| AC3 bounded many tracks | 08–09 | 09 PASS (Master details); 08 Blocked |
| AC4 readable, focus, zoom | 10–11 | PASS (10 emulated) |
| AC5 state preserved | 02–05, 12–15, 22 | transport/track PASS; 15 Blocked |
| AC6 waveform/EQ/meters/DPI/pointer | 16–22, 24 | Blocked except 21 layout (emulated) |
| AC7 matrix + continuous resize | 01–07, 24 | PASS (Chromium) |
| AC8 Playwright + manual evidence | 01–04, 06–07, 11–21, 23–24 | automated parts PASS; manual Not Run |

No duplicate test cases were created: each automated test names the LAS48-TC IDs it serves, and the original `responsive.spec.js` LAS48-TC-001 stays as written.
