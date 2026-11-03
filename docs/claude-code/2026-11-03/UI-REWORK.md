# Claude Code — owner feedback implementation package LAS-73–76
Date: 2026-11-03, Asia/Jerusalem
Repository: genstek/MPS-Audio-Studio
Base: origin/main; owner tested cb4262a. Fetch and record actual baseline SHA; preserve unrelated local work.
Sprint: LAS Sprint 10 - Pro Mixer (36).

## Start work
Read AGENTS.md and this whole package, then execute all unblocked work. English code/commits/Jira; Russian explanations to Gennady. Use LAS-keyed implementation branch(es) from current main, with reviewable PRs. Do not merge or deploy automatically.

## Correction
The earlier "Approve button" interpretation is withdrawn. It was the assistant's misunderstanding. There is no confirmed Approve defect and no task to change a button with that name. The user wants easier EQ interaction without repeated per-band setup.

## Sequence
1. LAS-73: fix duplicate tooltip activation across concurrently mounted editor instances. Inspect shared help identity/state; exactly one active anchored popover. Cover duplicate Move window, Undo/Redo and Section presets triggers. Fix independently of visual design selection.
2. LAS-74: remove contextual i/ⓘ/? icons. Trigger on actual controls/labels after 3 seconds of hover, preserve interactive help link, keyboard/focus access and a usable touch help path. Do not wholesale revert content, unrelated help fixes or accessibility. This supersedes LAS-70 icon criteria.
3. LAS-75 and LAS-76: prepare concrete graphical EQ/parametric EQ and hardware-inspired Dynamics/Limiter proposals. Reuse LAS-65/44 design system and research, but reflect the user's rejection of the current processor appearance. Preserve actual audio processing. Implement only the selected visual direction; continue bug/help fixes while awaiting selection. Current message authorizes preparation and code handoff, not selection of an unseen mockup.

## Evidence
Recording attached to LAS-73: Screen Recording 2026-11-03 at 10.30.23.mov. Shows multiple Move window / Undo / Section presets tooltips in different windows. Reported browser URL127.0.0.1:5175, macOS Chrome, main cb4262a. Do not infer audio listening or complete manual pass from this video.

## Integration/QA requirements
Preserve independent movable windows, existing transport/import/save/export/Space functionality, LAS-48/51 viewport acceptance and LAS-63 parameter previews while stopped. Use actual configured-state graphics and signal-driven meters accurately.
Add regression tests that demonstrate the tooltip defect on old behavior, then pass with the fix. Test hover timer cancellation, moving into help links, focus/Escape, multiple editor z-order, disabled control labels, drag suppression and narrow layouts. For EQ preserve project/settings migration, Link/L/R, undo, mode-switch semantics, presets validation and DSP/export parity.
Run relevant lint/unit/DSP/browser checks and record real results. Existing LAS-72 timeout CI failure is separate; document inherited failures instead of silently changing unrelated tests. Do not claim all checks pass unless actually run.
Per issue: docs/delivery/LAS-N/ with implementation summary, criteria/results, logs/screenshots, tested SHA and PR link. Gennady manual/design/listening status stays Not Run/pending. Update Jira comments/status honestly; if unavailable save jira-update.md marked SYNC_PENDING. No Done/QA Done without manual acceptance.

## Full Jira work orders

---
## LAS-73: A tooltip opens simultaneously in multiple processor windows for a single hovered control
https://genstek69.atlassian.net/browse/LAS-73

## Environment / evidence

Owner's manual test, 2026-11-03, macOS Chrome, http://127.0.0.1:5175, reported fresh main cb4262a166f0e6a68284d18df290e28d6a10a9b0.  
Screen Recording 2026-11-03 at 10.30.23.mov was inspected. Around 4 seconds, Move window appears across editors; around 8 seconds, Undo / Redo appears across editors and Mixer; around 16 seconds, Section presets appears across editors. Frame times are approximate.

## Steps

1. Open EQ, Dynamics and Limiter simultaneously.
2. Trigger a help tooltip on one window, e.g. Move window, Undo/Redo or Section presets.
3. Observe other windows and the Mixer.

## Actual

Multiple instances of the same help text appear in separate windows even though the user targets one control.

## Expected

Exactly one tooltip opens, anchored to the actual hovered/focused element. Identical function names/help IDs in other mounted components must not open their popovers.

## Impact / fix acceptance

Clutter and obscured controls during normal editing. Audit shared help state and instance identity; root cause not yet established. Ensure timer cancellation and ownership are per trigger instance, only one tooltip visible studio-wide, correct z-order, and transition between duplicate controls closes/reanchors without duplication.  
Test multiple windows and repeated controls via pointer and keyboard. Coordinate the new direct-hover interaction task; removing icons alone must not hide this underlying defect.  
Manual retest Not Run. Video is evidence, not an assistant live reproduction.

---
## LAS-74: Replace info/question-mark help icons with 3-second hover on the actual controls
https://genstek69.atlassian.net/browse/LAS-74

## Changed requirement — supersedes LAS-70 icon requirement

Gennady explicitly requests removing adjacent i/ⓘ and contextual question-mark help buttons throughout the studio because they clutter the UI. Keep contextual help, function names, short explanations and detailed-help links.  
Do not perform a wholesale code revert that also removes useful help content or unrelated fixes.

## Acceptance criteria

* Remove dedicated contextual i/ⓘ and ? icons from buttons, fields, faders, parameter labels, cards and editor title bars.
* Hover over the actual control/function or its associated label for 3 seconds to reveal the relevant tooltip. Leaving before the delay cancels it; moving between controls resets ownership/timer.
* Exactly one tooltip is visible studio-wide, anchored to the target instance even when several editors contain identical controls.
* Ordinary clicking/dragging/typing still operates the control immediately. Suppress/dismiss tooltips during active drag; never require a 3-second hold to activate a control.
* Preserve interactive access to the detailed-help link; moving the pointer into the popover must not dismiss it before the link can be used.
* Keep name + concise explanation + actual function-specific help target. Reuse central help content and in-app help.
* Define keyboard equivalent on the real control (e.g. focus + F1) and a touch path through Studio help without new cluttering help icons or hijacking normal long-press/edit gestures.
* Escape/click-outside closes; no playback/state changes; readable viewport-safe placement and screen-reader descriptions.
* Disabled controls need a hoverable associated label/wrapper so the reason can be explained.
* Test duplicate windows, hover timers, keyboard, pointer-to-link, disabled controls, drag and narrow layouts.  
  Historical LAS-70 icon acceptance is withdrawn for future builds. Current icon implementation followed the earlier requirement; this task is a product change, not a regression allegation.  
  Manual acceptance Not Run.



---
## LAS-75: Redesign EQ with a graphic equalizer mode, retained parametric mode and reusable presets
https://genstek69.atlassian.net/browse/LAS-75

## User feedback

Current EQ workflow is rejected as inconvenient. User reports repeatedly enabling/selecting among 24 bands and having to press Approve. The attached recording shows the band selector and current editor; it does not establish a distinct Approve button flow. Investigate the exact action before claiming a confirmed approval-loop defect.  
24 EQ bands are not 24 audio channels. Keep Left/Right stereo channels and band controls distinct in terminology.

## Requested behavior

* Provide a true graphic equalizer view with simultaneous fixed-frequency band faders, readable Hz/dB scales, direct gain changes, grouped stereo/Link control and reset. Propose and document band count/frequencies; no unapproved count is assumed.
* Retain an interactive parametric EQ mode with response graph, draggable points, frequency/gain/Q/type, existing up-to-24-band per-channel capability and precise numeric control.
* Editing should preview directly, without repetitive per-band confirmation for ordinary adjustments. Investigate/remove unnecessary Approve steps where actually present. Preserve undo/redo and intentional confirmation for destructive actions.
* A single clear module enable/bypass and stereo Link workflow; do not require repeatedly enabling every band merely to use a preset.
* Define switching semantics between graphic and parametric modes: preserve or explicitly warn about transformations. Never silently lose curves/parameters or apply both twice.
* Provide save/load/user presets and proposed factory starting points; show preset name and modified state, audition/reset and undo.
* Research freely available preset formats and datasets, document license/provenance/attribution and supported units/filter mappings before importing. Public accessibility is not permission to redistribute; do not promise compatibility with arbitrary plugin presets.
* Reject unsupported/malformed presets without changing settings; validate ranges and schema.
* Match playback/export DSP and settings/project persistence; migrate existing projects safely.
* Present hardware-inspired proposals under LAS-65/LAS-44 for owner review, then implement the selected design.

## QA

Test graphic fader changes, parametric curve editing, Link/L/R, direct preview, bypass, mode switching, preset load/undo/save/reopen and render parity. Record the reported Approve/enable friction separately with actual reproduction details when established. Manual/design/listening acceptance Not Run.

---
## LAS-76: Rework processor UI as professional hardware-style EQ, Dynamics and Limiter panels
https://genstek69.atlassian.net/browse/LAS-76

## User direction / rejected current appearance

The current software-form/sliders presentation of EQ, Dynamics and Limiter is not the intended product UI. Gennady wants opening a processor to feel like opening professional hardware: a recognizable front panel, clear meters, scales, knobs/faders and controls.  
This is refinement of LAS-65/44/45, not evidence the approved redesign already shipped.

## Deliverables

* Research real hardware EQ, compressor/Dynamics and limiter front panels from official manufacturer sources; present exact referenced models/links and explain which functional interactions will be adapted.
* Present at least two concrete original front-panel proposals for expanded editors plus their compact cards, including a dedicated Limiter proposal.
* Use the Fostex Model 820 reference for coherent studio styling; include readable control grouping, meters, scales, units, on/bypass and configured-state graphics.
* Match every visual control to actual supported DSP parameters. Avoid decorative controls that imply nonexistent audio features.
* Coordinate the graphic/parametric EQ redesign and remove cluttering contextual i/? icons per the new help requirement.
* Preserve multiple movable windows, keyboard precision, tooltip access, responsive use and all verified audio behavior.
* Use reference photos for design research. Do not ship manufacturer logos, copied commercial UI artwork or an unlicensed product photo as the application interface.
* Show empty/stopped/playing/bypassed/edited states and narrow layout. Record Gennady's choice before reskin implementation.

## Scope ownership

LAS-65 owns research/proposals, LAS-44 shared tokens and studio design, LAS-45 integrated shell; this task owns the processor front-panel redesign and coordination. No duplicate processing engine.  
Manual/design acceptance Not Run.
