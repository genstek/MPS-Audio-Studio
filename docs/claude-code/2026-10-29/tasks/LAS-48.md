# LAS-48 — Make the studio workspace responsive to window and screen resizing

Jira: https://genstek69.atlassian.net/browse/LAS-48  
Snapshot: 29 October 2026 (Asia/Jerusalem)  
Jira status: **In Progress** · Type: Story · Parent: LAS-41  
Sprint field: **SCRUM Sprint 0**  
Work mode: **VERIFY_AND_CLOSE_COVERAGE_GAPS** · Delivery: **NOT_STARTED** · Gennady manual QA: **NOT_RUN**

## Prerequisites and gate

Native Jira prerequisites: LAS-44.  
LAS-44 does not block the urgent current-layout verification; see the explicit waiver in the source issue. Final redesign remains subject to approved design.

## Claude Code implementation order

- Keep the accepted PR #8 layout. LAS-50/51 are Done; do not restart their rejected alternatives or broaden a spacing preference into a confirmed bug.
- Use 761×450 desktop lower boundary and ≤760 stacked scrolling behavior from closure evidence; expand tests for source LAS-48 criteria still uncovered: zoom/DPI, new waveform/EQ/meters/settings, additional browser/manual checks.
- The native LAS-44 Blocks link is stale for the urgent existing-layout fix: its description explicitly waives that dependency. Preserve and explain the distinction; no need to wait for a full redesign to verify the current patch.

Read `../MASTER_PROMPT.md`, `../BASELINE_AUDIT.md`, `../REQUIREMENT_RECONCILIATION.md` and repository `AGENTS.md`. Verify against the current source before editing. Existing code is inspected evidence, not a new runtime pass. Implement only this issue's slice; log a dependency/blocker and continue another ready task if necessary.

## Focused verification and later manual QA

| Case | Setup → action → expected behavior | Manual status |
| --- | --- | --- |
| LAS-48-QA-01 | Empty/loaded/error/long name → 817×598→785×520 without reload/scroll; essential controls visible, hit-testable and separated. | NOT_RUN |
| LAS-48-QA-02 | Continuous width/height and 760/761/762 breakpoint crossings → no forbidden desktop scrolling; stacked behavior remains deliberate. | NOT_RUN |
| LAS-48-QA-03 | Resize while playing and after future controls are added → actual audio/position/settings persist; record listening/DPI/browser limits. | NOT_RUN |

Automated development checks and Gennady's later manual execution are separate records. Do not fill a manual result from a source review, historical pass or new automation run.

## Acceptance trace to complete

The imported numbered/checklist lines are trace targets, including source scope/checklists where present; review the exact acceptance headings below before claiming closure.

| Trace ID | Source check | Result | Evidence / blocker |
| --- | --- | --- | --- |
| LAS-48-AC-01 | Resizing a running studio updates the layout automatically without a reload, manual zoom or a separate resizing action; maximizing/restoring and moving between screens are included in manual checks. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-02 | At the approved viewport sizes there is no page-level horizontal overflow, overlapping panels or clipped essential controls. Main transport, selected channel and primary editing controls remain reachable without scrolling across an oversized fixed workspace; optional panels reflow/collapse as specified. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-03 | When many tracks cannot fit, the agreed UX offers channel selection/paging or a clearly bounded local track area. Any local scrolling is deliberate and reviewed, rather than the whole application overflowing the screen. Vertical scrolling remains available for genuinely longer secondary content. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-04 | Labels, units, values and interaction targets stay readable and usable; keyboard focus remains visible. Validate browser zoom including 125% and 200% and the agreed narrow-layout behavior. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-05 | Resizing does not reload/re-import audio, stop/restart playback, reset the playhead, change gain/pan/mute/solo/EQ settings or lose project state. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-06 | Waveform, EQ and meters resize correctly, including high-DPI displays; pointer/drag coordinates still match the displayed fader/knob/EQ control positions. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-07 | Initial proposed QA matrix: 1920x1080, 1440x900, 1280x720, 1024x768, 768x1024 and 390x844 CSS pixels. Use this matrix as an initial validation target and record intentional narrow-screen adaptations; full LAS-44 design work must not block the urgent fix. Cover continuous resize across breakpoints and both width/height changes, not screenshots at only one fixed size. | NOT_RUN | Pending implementation/evidence |
| LAS-48-AC-08 | Playwright checks actual viewport resizing, overflow and accessible core controls at multiple sizes; visual snapshots handle dynamic meters/time intentionally. Manual checks cover real playback during resize and moving between different-DPI screens. Record evidence and limitations. | NOT_RUN | Pending implementation/evidence |

## Required deliverables

- Issue-linked branch/commit/PR; code and tests only where this work order needs them.
- `docs/delivery/LAS-48/README.md`: implemented scope, exact setup/demo, changed files, dependency/design decisions and remaining limitations.
- `docs/delivery/LAS-48/acceptance.md`: criterion → test/case → actual result → evidence path; separate developer validation and manual QA.
- `docs/delivery/LAS-48/results.json`: use `../templates/results.example.json` and the schema; exact commands, exit codes, tool/OS/browser versions, commit, URLs, viewport/DPR/zoom where applicable.
- `docs/delivery/LAS-48/manual-qa.md`: prepared steps/data/expected outcomes for Gennady; actual result remains Not Run until he tests.
- `docs/delivery/LAS-48/jira-update.md`: ready-to-post Jira comment containing commit/PR, evidence links, run commands, blockers and `Ready for QA` only when justified. Post only with available authorized Jira access; otherwise mark SYNC_PENDING.
- Logs, HTML report ZIP, traces/screenshots and numerical/audio reports as applicable. Attach suitable files to **this Jira key**, with a build manifest; never manufacture missing evidence or publish personal audio without consent.

## Imported Jira description (authoritative snapshot)

## User story

As a studio user, I want the workspace to adapt automatically when I resize the browser window, maximize/restore it or move it between screens, so that essential controls remain usable without manually scrolling around a fixed-size interface.

## Reported problem

Gennady reports that the current studio does not adapt to the available screen/window size and requires inconvenient scrolling. This is a user-reported limitation; the exact viewport and reproduction evidence still need to be captured. This ticket plans the feature; no fix or test run is claimed.

## Scope

Implement responsive workspace layout for navigation, transport, mixer/channel strips, meters, waveform/EQ and inspector panels. Reflow, resize or collapse secondary panels according to available width AND height. Do not use browser zoom or uniform CSS scaling that makes labels and controls unreadable as the primary solution.

## Delivery plan

URGENT — Highest priority. Deliver the current-workspace usability fix in the active sprint (ID 2) now. Do not wait for the full LAS-44/LAS-45 redesign. Preserve existing appearance where practical and make the smallest complete responsive layout change. Later design work will build on this fix.

## Dependencies

* LAS-44/LAS-45 are later design coordination items, not prerequisites for the urgent existing-layout fix. The former design-blocking link must be removed or changed to a non-blocking relationship.
* Coordinate implementation with LAS-45; preserve working audio/transport.
* LAS-47 final usability/accessibility review includes this feature.

## Acceptance criteria

- [ ] Resizing a running studio updates the layout automatically without a reload, manual zoom or a separate resizing action; maximizing/restoring and moving between screens are included in manual checks.
- [ ] At the approved viewport sizes there is no page-level horizontal overflow, overlapping panels or clipped essential controls. Main transport, selected channel and primary editing controls remain reachable without scrolling across an oversized fixed workspace; optional panels reflow/collapse as specified.
- [ ] When many tracks cannot fit, the agreed UX offers channel selection/paging or a clearly bounded local track area. Any local scrolling is deliberate and reviewed, rather than the whole application overflowing the screen. Vertical scrolling remains available for genuinely longer secondary content.
- [ ] Labels, units, values and interaction targets stay readable and usable; keyboard focus remains visible. Validate browser zoom including 125% and 200% and the agreed narrow-layout behavior.
- [ ] Resizing does not reload/re-import audio, stop/restart playback, reset the playhead, change gain/pan/mute/solo/EQ settings or lose project state.
- [ ] Waveform, EQ and meters resize correctly, including high-DPI displays; pointer/drag coordinates still match the displayed fader/knob/EQ control positions.
- [ ] Initial proposed QA matrix: 1920x1080, 1440x900, 1280x720, 1024x768, 768x1024 and 390x844 CSS pixels. Use this matrix as an initial validation target and record intentional narrow-screen adaptations; full LAS-44 design work must not block the urgent fix. Cover continuous resize across breakpoints and both width/height changes, not screenshots at only one fixed size.
- [ ] Playwright checks actual viewport resizing, overflow and accessible core controls at multiple sizes; visual snapshots handle dynamic meters/time intentionally. Manual checks cover real playback during resize and moving between different-DPI screens. Record evidence and limitations.

## Definition of done

The immediate responsive fix makes the existing studio usable without waiting for final redesign, a LAS-keyed GitHub PR is reviewed, relevant E2E/visual and manual playback checks pass, and known limitations are documented. No implementation changes are part of this backlog-creation action.

## Source

Gennady's responsive-layout feature request, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio    
Preserve LAS-10 learning and existing LAS-11/LAS-12 plans. Current branch stays codex/SCRUM-7-SCRUM-10-mixer.

## Immediate reproduction reported by Gennady

In Playwright UI Mode, select passed TC-001. Scroll the studio preview down to the mixer controls. Select the expect.toBeDisabled step. The displayed studio jumps back to the top, leaving Play/Pause/Stop out of view and interrupting the Trace Viewer lesson.  
This report does not establish whether scrolling comes from the application or the viewer switching recorded DOM snapshots. Diagnose those separately. Do not claim to fix Playwright itself with application CSS.

## Immediate completion checks

* Make the current studio shell fit the available viewport, with primary transport/mixer controls in view at 1280x720, 1440x900 and 1920x1080 without body scrolling; also inspect 1024x768 and a compact test viewport such as 800x600.
* Reflow/collapse secondary panels and oversized header content instead of clipping controls, shrinking all text with transforms or adding repeated scrollIntoView/waitForTimeout calls to tests.
* Keep WAV import and current Play/Pause/Stop behavior intact. Resize during playback without losing state.
* Re-run TC-001 and inspect a newly recorded UI Mode/trace snapshot. Keep assertions meaningful; never change disabled-state checks to clicks or remove checks to hide the problem. If viewer snapshot replacement explains the jump, document that separately and validate that the responsive app keeps controls visible in recorded snapshots.
* Do not implement LAS-11/LAS-12, authentication or the full visual redesign as part of this urgent patch.



## Imported test/custom fields

```json
{
  "Sprint": {
    "id": "customfield_10020",
    "value": [
      {
        "id": 2,
        "name": "SCRUM Sprint 0",
        "state": "active",
        "boardId": 1,
        "startDate": "2026-10-19T07:23:23.563Z",
        "endDate": "2026-11-02T07:23:23.563Z"
      }
    ]
  }
}
```
