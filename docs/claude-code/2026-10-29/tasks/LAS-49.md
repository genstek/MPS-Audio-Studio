# LAS-49 — Test plan — LAS-48 responsive workspace (24 test cases)

Jira: https://genstek69.atlassian.net/browse/LAS-49  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **In Progress** · Type: Task · Parent: LAS-41  
Sprint field: **Unscheduled foundation work; do not assign a sprint silently.**  
Work mode: **TEST_PLAN_RECONCILIATION** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: None recorded.  
None beyond prerequisites and successful development validation.

## Claude Code implementation order

- Preserve the original 24 manual cases and trace them to current implementations/automated tests. Treat the old header saying only four issue types exist as historical: native Test Plan/Case/Execution types now exist.
- Map historical passing coverage from LAS-50/51 to exact builds; do not automatically mark the 24 cases Pass. Future EQ/stem/hardware cases remain Blocked/Not Run until executable.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-49-QA-01 | Reconcile all 24 source case IDs → each has build/environment/status/evidence or explicit blocker. | NOT_RUN |
| LAS-49-QA-02 | Compare source acceptance matrix to current tests → remaining gaps and planned test owners visible, without duplicate test cases. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| Source criteria | See source below and custom fields | NOT_RUN | Pending evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-49/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-49/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-49/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-49/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-49/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## Test plan — LAS-48 responsive studio workspace

**Source:** [LAS-48](https://genstek69.atlassian.net/browse/LAS-48), reviewed 20 October 2026. Related epic: LAS-41. Automation learning context: LAS-10.
**Status:** Ready for review; all 24 cases Not Run. No implementation or execution result is claimed.
**Record type:** Jira Task containing the plan and manual test cases. LAS currently exposes only Epic, Story, Task and Subtask; this is not a native Xray Test Plan or Test Execution.

## Objective and scope

Verify that the existing studio adapts to available width AND height while essential controls stay usable and audio/project state survives resizing. Cover navigation/header, transport, mixer/selected channel, secondary panels and available waveform/EQ/meters. Include the original TC-001 UI Mode snapshot scenario.

Out of scope: full LAS-44/LAS-45 visual redesign, authentication, LAS-11/LAS-12 implementation, new audio effects and changes to established Play/Pause/Stop semantics. Unimplemented controls named in LAS-48 are explicit coverage limitations, not fabricated test results.

## Entry criteria and test data

* Responsive implementation available; record repository commit, branch, build URL and PR. Do not assume the implementation has been merged.
* Record OS/browser/Playwright versions, actual CSS viewport, zoom and DPR. Use browser viewport dimensions, not monitor resolution alone.
* WAV-A: deterministic synthetic stereo PCM WAV, 48 kHz/16-bit, 90 seconds, known non-silent content with headroom; duration/track identity recorded. It is test data to prepare, not an existing attached fixture claim.
* WAV-B and additional named copies: deterministic fixtures for supported multi-track testing. Record track count and any product limit.
* Capture existing empty/imported/playing/paused/stopped button rules from current TC-001 and documented behavior before regression checks. For ambiguous product behavior, record the question instead of inventing an expected result.
* Identify actual breakpoints and compact panel behavior. Pending narrow-layout decisions do not block the immediate desktop fix. Unavailable EQ/multi-track/display hardware subchecks remain Blocked/Not Run with a reason.

## Environment matrix

| Viewport (CSS px) | Purpose | Expected layout |
| --- | --- | --- |
| 1920×1080, 1440×900, 1280×720 | Immediate release checks | Core transport and mixer visible without body scrolling |
| 1024×768, 800×600 | Compact/height stress | Reflow/collapse secondary content; keep core controls usable; record adaptations |
| 768×1024, 390×844 | Proposed portrait/narrow targets | No horizontal page overflow; compact controls/panels accessible; behavior documented |
| Actual breakpoint B−1/B/B+1 | Boundary checks | Both resize directions; width and height |
| Real zoom 100%, 125%, 200% | Readability and access | Record actual resulting CSS viewport |
| DPR 1/2 plus real different-DPI screens | Canvas/input checks | Emulated and real evidence separated |

Baseline browser: user's Chrome on macOS, exact version recorded at execution. Chromium automation plus Firefox/WebKit regression; real Safari where available. Record any unsupported browser rather than claiming it passed. Full layout matrix in Chromium; representative desktop/compact/narrow coverage in other engines, with failures expanded where needed.

## Coverage and priorities

P0 = release gate for the urgent fix; P1 = additional functional, accessibility and compatibility coverage. Case priority is separate from Jira issue priority.

| Requirement reference | LAS-48 acceptance criterion (numbered in source order) | Cases |
| --- | --- | --- |
| AC1 | Automatic resize/maximize/restore/display change | 03–06, 12, 22 |
| AC2 | No page horizontal overflow; usable core workspace | 01–07, 09–10, 24 |
| AC3 | Deliberate bounded many-track overflow; long secondary content | 08–09 |
| AC4 | Readable labels/targets; visible focus; zoom | 10–11 |
| AC5 | Preserve audio, playhead, settings and project state | 02–05, 12–15, 22 |
| AC6 | Responsive waveform/EQ/meters; DPI and pointer mapping | 16–22, 24 |
| AC7 | Proposed viewport matrix; continuous width/height resize | 01–07, 24 |
| AC8 | Playwright resize/overflow/core control checks; manual evidence | 01–04, 06–07, 11–21, 23–24 |

## Test cases

Each case below starts as **Not Run**. Record actual result and evidence per environment/iteration; one passing viewport does not imply the entire matrix passed. Steps are ordered; expected results apply to the completed sequence and each relevant transition.

### LAS48-TC-001 — Initial empty workspace fits desktop viewports

**Priority:** P0 | **Coverage:** AC2, AC7; immediate shell check | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Fresh studio session; no audio imported.

**Steps:** Open at 1920×1080, 1440×900 and 1280×720 CSS px at 100% zoom. Inspect navigation, header, transport and mixer. Check document overflow and each core control's bounding box.

**Expected result:** No page horizontal or vertical scrolling is needed for primary transport/mixer controls. Panels do not overlap; controls are visible and unobstructed. An absent track does not break layout; existing empty-state disabled states remain correct.

### LAS48-TC-002 — Imported track fits the viewport

**Priority:** P0 | **Coverage:** AC2, AC5, AC7 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Deterministic WAV fixture available.

**Steps:** Import WAV-A at 1440×900. Repeat in fresh sessions at 1280×720 and 1920×1080. Inspect selected track, waveform, meters and available primary editing controls; use Play, Pause and Stop.

**Expected result:** Import finishes once; track and duration appear. Primary controls remain visible without body scrolling and retain their established behavior. No clipping, overlap or document horizontal overflow.

### LAS48-TC-003 — Width-only resize reflows without reload

**Priority:** P0 | **Coverage:** AC1, AC2, AC5 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** One imported track; viewport 1920×900.

**Steps:** Keep height 900. Change width to 1440, 1280, 1024, 800, 768, 390 and back to 1920. After layout settles at each width, inspect and use transport and selected-channel controls.

**Expected result:** Layout updates automatically with no reload, manual zoom or resize button. No horizontal page overflow. Narrow layouts expose primary controls through the documented compact design. Track identity and settings survive round trip.

### LAS48-TC-004 — Height-only resize and compact desktop

**Priority:** P0 | **Coverage:** AC1, AC2, AC7; immediate shell check | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** One imported track; zoom 100%.

**Steps:** At width 1280, change height 900→720→600→900. Also inspect 1024×768 and 800×600. Open any available inspector while repeating.

**Expected result:** At 1280×720 primary transport/mixer controls need no body scroll. Smaller heights reflow/collapse secondary content without hiding primary controls. Document compact adaptations; no overlapping or inaccessible controls.

### LAS48-TC-005 — Maximize and restore a real browser window

**Priority:** P1 | **Coverage:** AC1, AC5 | **Method:** Manual | **Status:** Not Run

**Preconditions:** Real browser; imported track; note selected channel and settings.

**Steps:** Resize the browser to a smaller window. Maximize and restore it three times using OS/window controls. Check actual CSS viewport dimensions and controls after each transition.

**Expected result:** Studio follows actual viewport automatically; no stale canvas dimensions or displaced controls. No reload, duplicate import or state loss.

### LAS48-TC-006 — Cross layout breakpoints in both directions

**Priority:** P0 | **Coverage:** AC1, AC2, AC7 | **Method:** Playwright boundary checks + manual continuous resize | **Status:** Not Run

**Preconditions:** Determine actual CSS breakpoints from the implementation; imported track.

**Steps:** For each actual width/height breakpoint B, inspect B−1, B and B+1 CSS px in both directions. Slowly drag the real window across boundaries, then repeat several faster resize cycles.

**Expected result:** No clipped intermediate layout, persistent flicker, overlap or horizontal document overflow. Compact panels consistently enter/leave their intended state. No broken controls or state reset after resizing stops.

### LAS48-TC-007 — Narrow and portrait panel access

**Priority:** P1 | **Coverage:** AC2, AC7 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Imported track; proposed sizes pending recorded compact behavior.

**Steps:** Inspect 768×1024 and 390×844; rotate by switching width/height. Open and close each available collapsed navigation/inspector panel, select a channel and return to transport.

**Expected result:** No document horizontal overflow. Compact navigation and primary controls are discoverable and operable. Panels do not permanently cover transport or trap the user; closing restores workspace access. Record design-dependent expectations as pending until agreed.

### LAS48-TC-008 — Many tracks stay inside the mixer area

**Priority:** P1 | **Coverage:** AC3 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Build supports multiple tracks. Prepare enough deterministic tracks to exceed visible capacity; record count.

**Steps:** Fill mixer beyond visible capacity at 1440×900 and 1280×720. Reach first, middle and last channels using implemented selection/paging/local scroll. Resize and change selection.

**Expected result:** Every channel is reachable; selected-channel controls remain usable. Overflow is confined to the intended bounded mixer area. Main transport stays accessible; the whole page does not widen. If multi-track capacity is unavailable, mark Blocked with reason.

### LAS48-TC-009 — Long secondary content scrolls locally

**Priority:** P1 | **Coverage:** AC2, AC3 | **Method:** Manual; Playwright where panel exists | **Status:** Not Run

**Preconditions:** Available secondary panel containing content longer than its container.

**Steps:** Open long inspector/settings content at 1280×720 and 800×600. Scroll it to the end, use its final control, then return to transport and resize.

**Expected result:** Long secondary content remains reachable; intended local scrolling works. Primary transport remains accessible. No overflow:hidden workaround silently removes content, and local scroll does not unexpectedly move the whole workspace.

### LAS48-TC-010 — Real browser zoom at 125% and 200%

**Priority:** P1 | **Coverage:** AC2, AC4 | **Method:** Manual | **Status:** Not Run

**Preconditions:** Real desktop browser; imported track; zoom initially 100%.

**Steps:** At a fixed browser window, apply real browser zoom 125%, then 200%, then 100%. Record resulting CSS viewport and inspect labels, units, values, dialogs and primary controls.

**Expected result:** Layout adapts to the reduced CSS viewport. Labels/values remain readable, controls remain accessible via the intended compact layout, and focus is visible. No text overlap or horizontal page overflow. Device scale factor alone is not accepted as browser-zoom evidence.

### LAS48-TC-011 — Keyboard focus survives resize

**Priority:** P1 | **Coverage:** AC4 | **Method:** Manual + Playwright focus assertions | **Status:** Not Run

**Preconditions:** Imported track; keyboard-only input.

**Steps:** Tab/Shift+Tab through navigation, transport, channel and available editor controls. Resize while a core control has focus. Open/close compact panels and activate buttons with supported Enter/Space input.

**Expected result:** Focus indicator stays visible; order remains usable. Resizing does not leave focus on a hidden or detached element. No keyboard trap; hidden panels are not tab stops. Activated controls perform their documented action.

### LAS48-TC-012 — Playback continues during resize

**Priority:** P0 | **Coverage:** AC1, AC5 | **Method:** Manual audio check + Playwright state checks | **Status:** Not Run

**Preconditions:** WAV-A longer than 60 s; playhead away from start/end; no looping unless documented.

**Steps:** Start playback. Resize width and height repeatedly between desktop and compact sizes. Observe/listen continuously and compare playhead progression before/after; then Pause and Stop.

**Expected result:** Playback does not stop, restart, duplicate or audibly interrupt because of resize. Playhead advances normally without resetting or jumping. Pause/Stop remain reachable and work afterward; audio is not re-imported.

### LAS48-TC-013 — Paused playback position is preserved

**Priority:** P0 | **Coverage:** AC5 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** WAV-A playing at a known nonzero position.

**Steps:** Pause and record playhead. Resize to 1280×720, compact size and back. Wait briefly while paused, then resume.

**Expected result:** Paused state and playhead are preserved within display precision. Resume continues from the paused position and does not create duplicate audio. Established button enabled/disabled states remain correct.

### LAS48-TC-014 — Stopped state and transport regression

**Priority:** P0 | **Coverage:** AC5; immediate transport check | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Imported WAV; establish current documented Stop behavior as baseline.

**Steps:** Play then Stop; record playhead/button state. Resize several times and invoke Play, Pause and Stop in their valid sequence.

**Expected result:** Resize preserves the baseline stopped state. Play/Pause/Stop keep established behavior and enabled/disabled rules. No spontaneous playback or duplicate source starts. Do not redefine Stop semantics in this layout change.

### LAS48-TC-015 — Channel and project settings persist

**Priority:** P0 | **Coverage:** AC5 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Imported track; available gain/pan/mute/solo/EQ controls identified.

**Steps:** Set gain and pan to non-default values; capture selected channel, track count, mute/solo and EQ settings. Resize small and back. Repeat mute and solo separately, then toggle each off.

**Expected result:** Values, selection, track count and audio identity are unchanged by resize; each control remains usable. No reset or accidental change. Record unsupported controls as Blocked for their subcheck, rather than claiming coverage.

### LAS48-TC-016 — Waveform geometry and seeking after resize

**Priority:** P1 | **Coverage:** AC6 | **Method:** Manual + Playwright geometry/state assertions | **Status:** Not Run

**Preconditions:** Seekable imported WAV; waveform displayed; duration known.

**Steps:** At large, small and restored viewports inspect waveform bounds. Seek to 25%, 50% and 75% of its displayed width where seeking is supported.

**Expected result:** Waveform fits its container, remains legible and is not stretched/clipped incorrectly. Pointer positions map to corresponding time within the documented seek precision; playhead stays aligned with waveform.

### LAS48-TC-017 — EQ graph resizes correctly

**Priority:** P1 | **Coverage:** AC6 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** EQ graph implemented; known non-flat settings.

**Steps:** Inspect graph at desktop, compact and restored sizes. Check frequency/gain labels, points, axes and curve at each size.

**Expected result:** Graph fits intended container; labels/points remain readable and curve corresponds to unchanged stored settings. No blank/stale canvas or displaced overlay. Mark Blocked if EQ graph is not implemented.

### LAS48-TC-018 — Meters remain aligned and live

**Priority:** P1 | **Coverage:** AC6 | **Method:** Manual + non-pixel Playwright assertions | **Status:** Not Run

**Preconditions:** Known non-silent WAV playing; meters implemented.

**Steps:** Observe meters while resizing width and height, then pause/resume. Compare meter alignment, labels and available numeric levels at each size.

**Expected result:** Meters follow their container without clipping or stale positions, continue updating during playback and follow established paused behavior. No frozen/duplicated meters introduced by resize. Dynamic samples need not be pixel-identical.

### LAS48-TC-019 — Fader and pan pointer coordinates

**Priority:** P0 | **Coverage:** AC6 | **Method:** Manual + Playwright pointer tests | **Status:** Not Run

**Preconditions:** Available gain/pan controls; known baseline values.

**Steps:** At desktop, compact and restored viewports drag fader to known points and use pan center/end positions. Compare pointer position, displayed value and state; repeat after a second resize.

**Expected result:** Displayed controls and hit areas align. Inputs change the intended channel/control only; values follow documented range, endpoints and precision. No pointer offset or unexpected jump. Restore baseline afterward.

### LAS48-TC-020 — EQ drag coordinates after resize

**Priority:** P1 | **Coverage:** AC6 | **Method:** Manual + Playwright where supported | **Status:** Not Run

**Preconditions:** Draggable EQ points implemented; capture baseline settings.

**Steps:** Resize before dragging. Drag a point to known frequency/gain coordinates, including near graph edges, at small and large sizes. Restore original point.

**Expected result:** Pointer/point coordinates agree with displayed axes and supported tolerance; changes stay in valid range and affect the intended band. No stale hit area or unintended neighboring-band changes. Mark Blocked if draggable EQ is unavailable.

### LAS48-TC-021 — High-DPI rendering

**Priority:** P1 | **Coverage:** AC6, AC8 | **Method:** Playwright emulation + manual | **Status:** Not Run

**Preconditions:** Real high-DPI display available; deterministic graph state.

**Steps:** Inspect at device scale factor 1 and 2 in automation, then on a real high-DPI display. Resize while waveform/EQ/meters are visible and interact with their controls.

**Expected result:** Graphics remain sharp enough to read, fit CSS bounds and keep correct pointer mapping. No double-sized, blurry or clipped canvases caused by CSS/backing-store mismatch. Real-display evidence and emulation are recorded separately.

### LAS48-TC-022 — Move between displays with different DPI

**Priority:** P1 | **Coverage:** AC1, AC5, AC6, AC8 | **Method:** Manual | **Status:** Not Run

**Preconditions:** Two real displays with different scaling/DPI; WAV playing.

**Steps:** Move browser fully between displays and back; maximize/restore on each. Record CSS viewport, screen scaling and devicePixelRatio; inspect and use controls.

**Expected result:** Layout/canvas updates automatically; audio/playhead/settings persist. No stale scale, blank graph or pointer offset. If only one display is available, record Blocked/Not Run with limitation; do not substitute emulation as a completed real-display check.

### LAS48-TC-023 — Original TC-001 UI Mode / trace scenario

**Priority:** P0 | **Coverage:** AC8; immediate reported reproduction | **Method:** Playwright rerun + manual trace inspection | **Status:** Not Run

**Preconditions:** New trace recorded from unchanged meaningful TC-001 assertions; Playwright version and trace path recorded.

**Steps:** Run TC-001 against the responsive build at 1280×720 and 1440×900. In UI Mode/Trace Viewer select successive snapshots, including the actual expect.toBeDisabled step. Inspect transport/mixer visibility in each snapshot and compare live app separately.

**Expected result:** TC-001 retains meaningful disabled-state assertions and passes only if actual behavior matches. Core controls are visible in relevant recorded snapshots without manual body scrolling. Any viewer scroll reset is documented separately from app overflow; no claim that app CSS fixes viewer snapshot replacement.

### LAS48-TC-024 — Cross-browser visual and overflow regression

**Priority:** P1 | **Coverage:** AC2, AC6, AC7, AC8 | **Method:** Playwright + manual | **Status:** Not Run

**Preconditions:** Record commit/build and installed browser versions; deterministic imported fixture.

**Steps:** Run representative core flows in Chromium/Chrome, Firefox and WebKit; inspect real Safari where available. Cover full proposed matrix for layout, desktop matrices for no-body-scroll, and representative sizes for interactions. Capture stable empty/imported screenshots with dynamic time/meters handled intentionally.

**Expected result:** No browser-specific clipped controls, overlap, horizontal page overflow or broken input. Visual baselines are reviewed instead of blindly updated. Browser failures/unsupported coverage are explicit; WebKit automation is not labeled a real Safari run.

## Automation approach

* Use actual page.setViewportSize transitions on the same loaded page, including a large→small→large sequence; setting only the initial viewport is insufficient.
* Check document scrollWidth against clientWidth (allow at most 1 CSS px rounding); on the three immediate desktop targets also check page vertical overflow and core control visibility in both empty/imported states.
* Check core control bounding boxes inside the viewport, unobstructed hit targets and correct enabled/disabled state. Locator visibility alone does not prove an element is in view or unobstructed. Query overflow/geometry before actions that may auto-scroll.
* Prefer role/label locators and web-first assertions. No fixed waitForTimeout delays, repeated scrollIntoView workarounds, removed assertions or blanket CSS scaling to hide layout defects.
* Assert state before/after resize. Automated progression/state checks complement manual listening; they do not establish absence of audible glitches.
* For screenshots use deterministic audio/paused state where possible. Mask or freeze only dynamic meter/time regions intentionally; keep transport, geometry and labels covered. Review every changed visual baseline.
* Preserve the original TC-001 meaning. Record newly generated traces/screenshots/report paths; do not reuse stale traces as evidence of this build.

## Execution record and defects

One row per case × environment/iteration:

| Case ID | Commit/build | Browser/OS | CSS viewport → viewport | Zoom/DPR | State/data | Actual result | Status | Evidence / defect |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending execution | TBD | TBD | TBD | TBD | TBD | Not executed | Not Run | None |

Allowed results: Not Run, Pass, Fail, Blocked. Use N/A only for a reviewed scope decision with rationale; unavailable implementation/hardware is not automatically N/A. Log failures with reproducible resize sequence, expected/actual behavior, commit, viewport/zoom/DPR, screenshot/video or trace and audio-state evidence. Link defects to LAS-48 and this plan. Separate live application overflow from Playwright viewer snapshot scroll behavior.

## Exit criteria

* All P0 cases pass on the immediate desktop targets where applicable; no unresolved blocker/critical defect or failure hiding essential controls, corrupting state or breaking transport.
* Execute relevant P1 coverage and record every failed/blocked/not-run configuration. Obtain an explicit scope decision for any release exception; do not mark the whole plan Passed with unresolved mandatory coverage.
* Required Playwright regression and newly recorded TC-001 evidence available; meaningful assertions retained. Manual playback-resize checks completed. Real different-DPI display check completed or explicitly recorded as an unresolved limitation/approved exception.
* Proposed narrow/compact behavior and known limitations documented; final LAS-47 usability review can consume this evidence without delaying the urgent fix for unrelated design work.
