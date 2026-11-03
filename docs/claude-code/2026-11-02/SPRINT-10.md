# Claude Code work package — LAS Sprint 10

Date: 2026-11-02 (Asia/Jerusalem)
Repository: genstek/MPS-Audio-Studio
Integration base: delivery/LAS-40-all-sprints (owner's last tested baseline 0296386; fetch and record actual HEAD before editing).
Jira sprint: LAS Sprint 10 - Pro Mixer, ID 36, board 1. Future/planned; dates and capacity not committed.
Scope: 14 issues. This package supersedes the old handoff only for these issues; do not rerun unrelated completed sprints.

## Start immediately
Read AGENTS.md, current source and docs/delivery for existing implementation. Report checkout SHA, loaded handoff path and first tasks, then proceed with all unblocked work. Do not stop after the first issue. Never overwrite uncommitted work. Use a fresh LAS-keyed delivery branch based on the integration branch, not main. Keep PR43 Apple wrapper changes separate; inspect compatibility under LAS-58 without silently merging it.

## Execution order and dependencies
1. LAS-65: research and show concrete processor/player proposals. Consult official product documentation and cite actual sources; never claim a screenshot or prototype is approved.
2. LAS-44: turn the Fostex Model 820 direction into reviewable whole-studio designs. The photo establishes direction, not final visual approval. Existing LAS-42/43 material is input; do not restart discovery unnecessarily.
3. Functional work can proceed while design review is pending: LAS-71 upload limit; LAS-68 real Master Level; LAS-60 create project; LAS-69 save/open; LAS-61 window movement; LAS-62 concurrent editors; LAS-63 configured-state previews; LAS-64 Space; LAS-67 transport.
4. LAS-45 integrates approved visual shell; it is gated by LAS-44 approval. LAS-70 applies contextual help across every existing/new control. LAS-66 prepares coverage from the start and performs final regression as features land.
Hard dependencies: LAS-65 -> LAS-44 -> LAS-45; LAS-60 -> LAS-69 for complete create/save/open acceptance; LAS-61 -> LAS-62 for shared window management. Other coordination links are not blanket blockers.

## Important corrections and implementation policies
- LAS-63: owner confirms live animation works during playback. Withdraw the original defect interpretation. Show enabled/configured state and animate parameter edits even while stopped/paused; keep the final shape visible. Actual signal meters remain truthful.
- LAS-45 is documented as no reskin started, blocked on approved designs. It is not a finished hidden redesign awaiting merge. Reuse working LAS-28 controls.
- Save/load settings and presets already exist under LAS-28/33; audit and reuse. Project save must include a reliable media restoration/relink policy. Distinguish project, preset and WAV export.
- Proposed Master Level policy is monitor volume, not rendered-master trim; document and expose the actual scope. Do not silently change WAV loudness.
- 250 MiB means 262144000 bytes, inclusive; the owner asked for 250 MB while the existing UI uses MiB. Keep visible units unambiguous and document this convention.
- Space first slice is proposed reverb. Do not add vocoder/delay or unrelated audio effects without a separate scope decision. Validate real DSP/export parity.
- FF/RWD +/-5-second clicks and hold-to-seek are proposals in LAS-67; present behavior clearly. Reverse audio is not assumed.
- ⓘ help: 3-second hover, immediate click/tap/keyboard, name + brief explanation + real function-specific help link. Interactive popover, not native title tooltip.
- English code, comments, commits, Jira and artifacts; Russian progress explanations to Gennady.

## Evidence and QA contract
For every issue create docs/delivery/LAS-N/README.md, acceptance mapping, actual test logs/results, evidence screenshots/video and PR/commit links. Clearly report Not Run, failed, blocked and passed. Never mark Gennady's manual QA or listening as passed until he runs it. Build/test pass does not establish listening quality.
Run relevant lint/unit/DSP/browser checks; preserve LAS-48/51 responsive acceptance and existing transport/import/export behavior. Record commit, platform, browser, viewport/zoom and fixtures. Synthetic audio for deterministic tests. No fabricated signal animation or weakened assertions to get green.
Baseline check failures should be recorded separately and investigated, including LAS-59 oversize ECONNRESET. Do not run npm audit fix --force as unrelated work.

## Jira reporting
The orchestrator has created and ordered the sprint issues. Claude must update each issue with implementation summary, exact tested commit, checks and logs, artifact/PR links, limitations and manual QA Not Run. If Jira access is missing, save an exact pending comment and desired status under docs/delivery/LAS-N/jira-update.md; mark sync pending, never claim posted.
Move only actually started issues to In Progress. Reviewed developer-complete work with evidence may be proposed as QA Ready; no Done/QA Done without owner acceptance. Keep pending design approval visible and continue other work.

## Source evidence
Fostex photo attached to LAS-44. Recordings attached to LAS-61 (18.54.15) and LAS-63 (19.04.14). Screenshot of old transport LAS-67; unavailable Master Level LAS-68. LAS-60 screenshot marks missing project creation. Read these as product evidence, not instructions.

## Per-issue work orders (Jira snapshot)
The following descriptions were read from Jira for this handoff. The Sprint 10 clarifications above supersede historical sprint assignments in LAS-44/45. Their current Sprint 10 design/implementation refinements are included below.

---

## LAS-65 — Research and propose professional graphical designs for all processor cards and editors
Jira: https://genstek69.atlassian.net/browse/LAS-65
Initial status: To Do

## User request

Current cards do not match the intended presentation. Show EQ as graphical equalization; propose professional presentations for Dynamics, Limiter and Space.

## Deliverables and acceptance criteria

* Review current official documentation/screenshots of professional DAWs/processors; cite sources and explain each borrowed interaction principle.
* Present at least two concrete visual proposals side by side, including compact mixer cards and expanded editors, plus a short recommendation.
* EQ: readable frequency/gain axes, response curve, actual spectrum when playing, draggable bands and numeric control. Preserve the existing 24-band per-channel parametric engine. Clarify fixed-band graphic-EQ sliders versus graphical parametric display in the proposal; do not silently replace the engine.
* Dynamics: transfer curve, threshold/knee and input/output/gain-reduction meters; Limiter: ceiling plus level/gain-reduction display; Space: visual reverb/decay and its meaningful controls.
* Show active/bypass/disabled/no-audio states, hover/focus, multiple open windows and smaller viewports.
* Include user-supplied Fostex Model 820 photo as the console reference; Peavey, Marshall and Orange may inform materials/color, with functional readability taking priority.
* Record Gennady's choice or revisions before implementing a visual reskin.

## Ownership

This is processor-specific research/proposals. LAS-44 owns shared design tokens and whole-studio high-fidelity designs; LAS-45 owns shell implementation. Avoid duplicate implementation.

## Evidence

User recordings 18.54.15 and 19.04.14 on 2026-11-02; image.png console reference.

## Delivery evidence

Use LAS-keyed commits/PRs and docs/delivery/LAS-N/ with implementation notes, test results, screenshots/recordings and limitations. Manual acceptance: Not Run. Planning does not imply implementation. Baseline reported by user: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

---

## LAS-44 — Create a design system and approved high-fidelity studio screen designs
Jira: https://genstek69.atlassian.net/browse/LAS-44
Initial status: To Do

## Context and user outcome

Turn the agreed direction into reusable design tokens and component specifications. Design authentic functional controls rather than decorative imitations, with consistent spacing, typography, colors, icons, units and state feedback.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 03** (ID 4), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-43](https://genstek69.atlassian.net/browse/LAS-43)

## Acceptance criteria

- [ ] Design system specifies color/contrast, typography, spacing, layout, icons and responsive behavior on agreed viewport sizes.
- [ ] Buttons, fields, faders, knobs, meters, dialogs and tabs include default/hover/focus/disabled/error/loading states and keyboard behavior.
- [ ] High-fidelity designs cover studio shell, account forms, mixer, analysis/EQ, reference comparison, stems and export; optional/future controls are labeled.
- [ ] Gennady's explicit design approval or requested changes are recorded; implementation is not considered approved by the mere existence of mockups.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio      
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

## Responsive design handoff

Specify width/height breakpoints, supported viewport sizes, panel collapse/reflow and access to essential controls for [LAS-48](https://genstek69.atlassian.net/browse/LAS-48). Include readable controls at browser zoom and a deliberate narrow-layout/many-channel strategy. Confirm the proposed QA viewport matrix with Gennady before implementation.

---

## LAS-71 — Increase supported audio file size from 100 MiB to 250 MiB
Jira: https://genstek69.atlassian.net/browse/LAS-71
Initial status: To Do

## User request

Increase the uploaded/imported audio file size limit from 100 MB to 250 MB.  
Current visible application wording uses MiB ("100 MiB"). Proposed implementation retains that existing unit convention: 250 MiB = 262,144,000 bytes. Display MiB consistently, including help and errors, so the limit is unambiguous.

## Acceptance criteria

* Supported valid audio files up to and including 262,144,000 bytes pass the size gate; larger files are rejected with a clear 250 MiB limit message.
* Apply consistently to applicable source WAV import/replacement, reference audio and individual stem files; document any distinct total-session/resource constraints. This is a per-file limit, not a blanket increase to every API payload.
* Audit browser validation, shared constants, server storage/upload validation and native-wrapper entry points. Align paths that currently enforce 100 MiB; retain existing ownership/type/format checks.
* Update empty-state text, file-picker guidance, error messages and contextual help (LAS-70). Remove stale 100 MiB promises for affected flows.
* Valid larger files decode, play and can be processed/exported without an unhandled error or frozen UI. Measure peak memory/load time on documented hardware; do not equate passing a size check with usable processing.
* Handle allocation/decode/resource failure with an actionable recoverable error. Failed import/replacement preserves prior usable session state.
* Preserve existing file format validation and cancellation behavior. Never silently truncate files.
* Server oversize refusal returns a clean documented error response; include the known LAS-59 ECONNRESET issue when checking this path.

## QA and delivery

Coordinate LAS-66, LAS-8/23, LAS-30, LAS-34 and LAS-58.  
Test exact limit -1 byte / limit / limit +1 byte at the validation layer; use structurally valid WAV fixtures where actual decoding is asserted. Include real valid files above 100 MiB and near 250 MiB, invalid/corrupt files, retry, replacement and browser/native paths separately.  
Record exact tested commit, file sizes, hardware/browser, load/processing times and resource limitations. Manual acceptance Not Run. Deliver LAS-keyed PR and docs/delivery/LAS-N/ evidence.

---

## LAS-68 — Enable a functional Master Level fader for the studio output
Jira: https://genstek69.atlassian.net/browse/LAS-68
Initial status: To Do

## User request / observed state

Master level must be available. The supplied screenshot shows a disabled slider and "Level control unavailable". Treat this as delivery of missing functionality; no previously working baseline is established.  
Source: Gennady, 2026-11-02. Reported checkout: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

## Acceptance criteria

* Enable the Master Level fader when playable audio is loaded; replace the placeholder message with the actual value and unit.
* The control changes the real stereo output gain equally for Left/Right, for both a single track and a stem mix. Preserve individual channel settings.
* Show a clear dB scale and numeric value, with unity at 0 dB and a true mute endpoint (-infinity). Proposed initial range: mute to 0 dB attenuation; review any requested positive gain alongside headroom/limiter policy before adding it.
* Support pointer dragging, keyboard adjustment and reset to unity; accessible name/value reflect the actual gain.
* Smooth gain changes to avoid audible clicks; moving the fader does not reset playback position or interrupt transport.
* Apply the same monitor gain to Original and Processed paths after A/B/loudness matching, preserving their comparison relationship.
* Define the processing tap explicitly: proposed default is a monitor/output volume control, excluded from rendered WAV so speaker-volume adjustments do not alter the master. Label/document this policy; a render-affecting master trim needs a separate explicit design decision and export parity tests.
* Player output meters (LAS-67) must reflect the documented output tap and mute behavior.
* Preserve the chosen level across pause/resume, Stop and editor open/close. Specify unload/new-project reset policy and ensure older settings remain compatible.
* Empty/loading/error states clearly explain why the fader is disabled and do not falsely report unavailable functionality after valid import.

## QA and delivery

Coordinate LAS-66. Verify gain numerically at unity, a known attenuation (e.g. -6 dB) and mute, with L-only/R-only/stereo/mono fixtures; test single track/stems, Original/Processed, keyboard, rapid drags, replacement/unload and playback-state preservation. Verify the documented export policy explicitly.  
Reuse LAS-28/34 audio paths; avoid a second disconnected gain control. Coordinate LAS-44/45 fader appearance and LAS-67 output meters.  
Deliver LAS-keyed PR, actual test results and screenshot evidence under docs/delivery/LAS-N/. Manual/listening acceptance: Not Run.

---

## LAS-60 — Cannot create a project — static 'Untitled project' heading has no New Project action
Jira: https://genstek69.atlassian.net/browse/LAS-60
Initial status: To Do

## Summary

The project area displays "SESSION 001 / Untitled project" as a static heading. There is no discoverable action to create and name a new project. Reported by Gennady during manual testing.

## Environment

* Application: MPS Audio Studio, http://127.0.0.1:5173
* Branch: delivery/LAS-40-all-sprints
* Reported local baseline: 0296386
* Platform: macOS, Google Chrome (exact OS/browser versions not captured for this execution)
* Date: 2026-11-02

## Preconditions

Application is open with an empty workspace and "Untitled project" displayed.

## Steps to reproduce

1. Open the application.
2. Locate the project area on the left side of the transport bar.
3. Try to create a new project from this area or find a New Project action.

## Actual result

"Untitled project" is displayed as static text. No New Project button or project creation dialog is available. The user cannot start the requested create-and-name-project workflow.

## Expected result

A visible New Project button in the project area opens the project creation flow.

## Proposed acceptance criteria

* New Project is visible and operable with mouse and keyboard.
* Clicking it opens a dialog with a project name field and Create/Cancel actions.
* Creating a project initializes a new project and displays its name in the project area.
* Empty or whitespace-only names show validation.
* Cancel preserves the current workspace.
* Creating a project from a nonempty session requires confirmation before discarding current work.

## Impact

Project creation is unavailable. Audio import is a separate available action and does not replace the requested project creation workflow.

## Evidence and verification

User-provided annotated screenshot: Screenshot 2026-11-02 at 18.49.49.png. The red rectangle/arrow identifies the project heading.  
The screenshot also contains a WAV size validation message and an open EQ panel; these are incidental and outside this bug's scope.  
This report is based on the user's observation and screenshot. Reproduction was not independently rerun by the assistant; frequency is not measured. No previously working baseline is established, so regression status is unknown.  
Manual retest: Not Run.

---

## LAS-69 — Add discoverable Save/Save As/Open project and section preset actions
Jira: https://genstek69.atlassian.net/browse/LAS-69
Initial status: To Do

## User problem

Gennady reports no discoverable Save function in any studio section. Users need to preserve their work and reopen it later without rebuilding settings.  
Source: user report, 2026-11-02. Missing discoverability is reported; absence of all persistence is not independently established.

## Existing work to reuse

LAS-28/PR31 describes chain settings-file download/load and session snapshots. LAS-33 describes reusable owner-private presets. Inspect and reuse those implementations rather than replacing or duplicating them. Neither alone establishes complete project save/open.  
Coordinate project creation LAS-60, storage/privacy LAS-23/24, UI LAS-44/45, Space LAS-64, player LAS-67, Master Level LAS-68 and Apple wrapper LAS-58.

## Project acceptance criteria

* A visible project menu/toolbar exposes Save, Save As and Open with clear accessible names; Cmd/Ctrl+S saves the project without triggering browser Save Page.
* First Save asks for name/destination as required. Save updates the current project; Save As creates an independent copy without overwriting the original.
* A versioned project format restores project identity, track/stem list and alignment, channel gain/pan/mute/solo, processor parameters/bypass/order, reference associations, relevant master/player settings and window layout.
* Playback never starts automatically when opening a project. Temporary analysis/proposal/playback states are distinguished from saved settings.
* Define media packaging explicitly before implementation: self-contained project bundle or manifest with a reliable relink flow. Do not promise that a browser can silently reopen arbitrary local file paths.
* Save/open works after application restart. Missing/moved audio is listed with a relink/recover action; never silently drop tracks or claim the project is complete.
* Show Unsaved changes, Saving, Saved and actionable failure states. Do not clear the dirty indicator until durable write succeeds. Changes made during saving remain marked unsaved if not included.
* Protect existing work on New/Open/close where the platform permits with Save / Discard / Cancel. Cancelled/failed saves preserve the current session and previous valid saved project.
* Validate schema/version/size and reject corrupt or unsupported files without mutating the current session; document migration for supported older versions.
* Local save must be available without mandatory cloud login. Cloud saving, if exposed, uses existing ownership/privacy rules and states its destination clearly.
* Use native save/share mechanisms for macOS/iOS where available; provide explicit browser download/import fallback without misleading overwrite claims.

## Section acceptance criteria

* Each relevant processor editor (EQ, Dynamics, Limiter, Space when delivered) exposes discoverable Save preset / Load preset actions with clear scope.
* Reuse existing LAS-28/33 settings/preset formats and migrations. Loading a preset changes only its stated scope and supports undo; it does not unexpectedly replace unrelated modules.
* Saving a project includes current section settings even when their editor windows are closed.
* Clearly distinguish Save project, Save preset and Export WAV in wording and behavior.

## QA / delivery

Under LAS-66, cover save → close/restart → reopen round trips for single-track and stems, all processors and layout; Save As isolation; dirty state/concurrent edits; missing-media relink; corrupt/newer formats; failed/cancelled writes; offline/signed-out local save; privacy for any cloud save; browser and native flows separately.  
Include value comparisons and media identity checks, not just a Saved toast. Record exact commit, PR and evidence in docs/delivery/LAS-N/. Manual acceptance is Not Run. This is a requested enhancement, not a confirmed regression.

---

## LAS-61 — Move processor windows freely within the studio workspace
Jira: https://genstek69.atlassian.net/browse/LAS-61
Initial status: To Do

## User request

EQ, Dynamics, Limiter and future Space editors cannot be repositioned. Allow each window to be placed anywhere within the application's visible workspace (web viewport / native app window).

## Acceptance criteria

* Drag each editor by its title bar using pointer/touch; controls inside the editor remain independently operable.
* Position changes do not alter processing parameters, interrupt playback or recreate the audio chain.
* Clicking a window brings it to the front; title and close controls remain reachable.
* Resize/orientation changes recover off-screen windows; provide Reset window layout.
* Retain each editor's position when closed/reopened during the session.
* Offer keyboard-accessible positioning/reset and visible focus; small screens retain reachable controls.

## Verification

Test independent windows, overlapping windows, drag while playing, close/reopen, resize and narrow layout. Recheck LAS-48/LAS-51. No OS-level floating windows or cross-monitor browser pop-outs are assumed.

## Delivery evidence

Use LAS-keyed commits/PRs and docs/delivery/LAS-N/ with implementation notes, test results, screenshots/recordings and limitations. Manual acceptance: Not Run. Planning does not imply implementation. Baseline reported by user: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

---

## LAS-62 — Open EQ, Dynamics, Limiter and Space editors independently at the same time
Jira: https://genstek69.atlassian.net/browse/LAS-62
Initial status: To Do

## User request

Opening another processor currently replaces the previous editor. Keep multiple editors open simultaneously.

## Acceptance criteria

* Opening EQ, Dynamics and Limiter leaves all three visible/open; include Space once implemented.
* Each editor has its own open/closed state; opening an already-open editor focuses it without duplication.
* Closing one editor leaves the others, their values and positions unchanged.
* Edits reach the correct processor; bypass, undo/redo and A/B retain documented existing scope without cross-window state leakage.
* Closing an editor never disables its audio processor.
* Focus/z-order and Escape target the active editor predictably; transport stays usable.

## Verification

Open all editors in different orders, edit each, close/reopen one, use undo and A/B while playing; verify audio and export retain current settings. User recording 19.04.14 shows the editor switching sequence. Coordinate with movable-window feature.

## Delivery evidence

Use LAS-keyed commits/PRs and docs/delivery/LAS-N/ with implementation notes, test results, screenshots/recordings and limitations. Manual acceptance: Not Run. Planning does not imply implementation. Baseline reported by user: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

---

## LAS-63 — Show active processor settings and animated previews even when playback is stopped
Jira: https://genstek69.atlassian.net/browse/LAS-63
Initial status: To Do

## Corrected user request — 2026-11-02

Gennady confirms that signal-driven animation DOES work while the track is playing. The earlier observation that only EQ animation works is withdrawn; do not treat it as a confirmed defect.  
Requested enhancement: once a processor is enabled and its settings are changed, show meaningful animated graphical feedback and the configured shape on its mixer card/editor even when playback is paused or stopped.

## Acceptance criteria

* Every processor card clearly shows enabled/bypassed state and whether its settings differ from defaults, independently of playback.
* Enabling a processor and changing its parameters immediately updates its graphical preview without requiring Play. Keep the resulting configured shape visible when interaction ends.
* EQ response curves/points animate to the new settings; Dynamics transfer/threshold/knee and Limiter ceiling/threshold previews react to edits; Space visualizes configured decay/dry-wet once implemented.
* Use short parameter-driven transitions during edits/activation. Continuous idle/demo animation is a design option for review, not assumed approval; any demo must be labelled and must not resemble measured live audio.
* Actual spectrum, level and gain-reduction meters follow the real signal. While stopped/paused/silent, show truthful idle/decay behavior rather than inventing signal activity.
* Shared hover, focus, pressed, open and disabled feedback is consistent across all card/Edit controls.
* Changes through pointer, keyboard, presets, undo/redo and settings load synchronize card previews and open editors.
* Respect reduced-motion preferences; retain immediate state/parameter feedback when decorative transitions are reduced.
* Visual updates do not modify audio parameters beyond the user's edit or disrupt playback.

## Verification

Test enable → edit while stopped, edit while paused, then Play; verify configured graphics remain visible and live meters follow actual audio. Cover reset/default, bypass, presets and undo/redo. Record before/after video.  
Source recordings: Screen Recording 2026-11-02 at 19.04.14.mov attached to this issue; 18.54.15 recording attached to LAS-61. They remain context; the user's clarification supersedes the initial animation-defect interpretation.

## Coordination and delivery

LAS-65/44: propose parameter-driven motion and persistent configured-state visuals. LAS-66: update acceptance coverage. LAS-28/PR31 already supplies signal-driven meters; reuse them.  
Use LAS-keyed PRs and docs/delivery/LAS-N/ for notes, test results and evidence. Manual acceptance: Not Run. Reported baseline: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

---

## LAS-64 — Implement Space audio processing with editable reverb and reliable WAV export
Jira: https://genstek69.atlassian.net/browse/LAS-64
Initial status: To Do

## User request

Space is currently an Unavailable/Coming soon placeholder. Deliver a working processor.

## Proposed first delivery

A stereo reverb module with bypass, dry/wet, pre-delay, decay and damping, with a small documented Room/Hall/Plate preset set. These are proposed initial controls; review alongside the processor design. Delay, vocoder and additional effects are separate scope unless explicitly agreed.

## Acceptance criteria

* Space opens a functional independent editor with visible units, ranges and presets.
* Processing audibly and measurably affects playback; defaults remain dry/bypassed to preserve existing projects.
* Document chain position, stereo/mono behavior, parameter smoothing and tail behavior for Pause, Stop, Unload and export.
* Preview and offline WAV export use equivalent processing; define and test tail inclusion/truncation explicitly.
* Settings/presets round-trip through save/load, undo/redo and older settings migration without breaking existing chains.
* No NaN/Infinity, runaway feedback or stale tail after unloading; parameter changes do not click.
* Demonstrate impulse response/decay, dry bypass identity, mono/stereo handling, sample-rate behavior and render parity with deterministic tests.
* Provide actual performance measurements and manual listening checklist. Manual listening remains Not Run until performed.

## Dependencies

Existing LAS-27/28 processing/settings/export chain; processor visual proposal. No unimplemented UI control may imply working audio.

## Delivery evidence

Use LAS-keyed commits/PRs and docs/delivery/LAS-N/ with implementation notes, test results, screenshots/recordings and limitations. Manual acceptance: Not Run. Planning does not imply implementation. Baseline reported by user: delivery/LAS-40-all-sprints @ 0296386, macOS Chrome, localhost:5173.

---

## LAS-67 — Build a classic tape-deck player with FF/RWD, timeline and stereo needle meters
Jira: https://genstek69.atlassian.net/browse/LAS-67
Initial status: To Do

## User outcome

Replace the current three-button transport presentation with a professional classic-player experience: Play/Pause/Stop, Fast Forward/Rewind, readable scales, electronic analyzers and separate old-school needle meters for Left and Right.  
Source: Gennady, 2026-11-02; screenshot of the current transport attached. Tape-recorder styling is a design direction to explore, not an approved final mockup.

## Functional acceptance criteria

* Preserve verified Play/Pause/Stop behavior and integrate new controls with the existing transport engine (LAS-9/LAS-11), without duplicate playback sources.
* Add explicitly labelled FF and RWD controls. Proposed behavior for design review: click skips +/-5 seconds; holding repeatedly seeks with a documented rate; clamp at start/end. This is navigation, not reverse audio playback. Confirm exact behavior in the proposal.
* Show elapsed/total time, a scaled seekable timeline/playhead and playback state; pointer and keyboard seeking work while playing or paused without losing the intended state.
* Empty/loading/error/end-of-track states disable or explain unavailable controls. Rapid seeking and replacement/unload remain safe.
* Provide separately labelled Left/Right analog-style needle meters and electronic stereo level/peak indicators, including clipping indication and readable units/scales.
* Drive meters from actual monitored audio, following Original/Processed A/B and current output settings. Document the measurement tap and calibration. Do not label an RMS/peak approximation as standards-compliant VU without verified ballistics/calibration.
* Include a real live spectrum analyzer with frequency/level scales, reusing existing analysis infrastructure where practical. Silence, pause, bypass and mono inputs have truthful states; no decorative fake signal.
* Use animation timing and CPU measurements that preserve stable playback. Respect reduced motion for decorative animation while retaining usable signal information.
* Support keyboard focus, accessible names/value readouts and responsive layout without reintroducing LAS-48/LAS-51 clipping.

## Design acceptance

LAS-44/65 must include at least two player proposals: classic tape-deck styling with dual needles and a compact professional hybrid with electronic meters. Show empty/loaded/playing states, FF/RWD, time scale, spectrum and integration with the Fostex-inspired console. Reel/cassette animation is optional and requires design selection; it is not a processing feature.  
Record Gennady's selection before visual implementation. This ticket owns transport/player behavior; LAS-45 integrates the approved shell.

## QA and delivery

Coordinate LAS-66. Test start/end boundaries, rapid FF/RWD, seeking while paused/playing, replacement/unload, A/B meter source, L-only/R-only/stereo/mono/silence fixtures, peak/clipping indication, resize and keyboard behavior. Record exact tested commit and measured performance; listening/manual acceptance remains Not Run.  
Use LAS-keyed PRs and docs/delivery/LAS-N/ for criteria mapping, screenshots, test results and limitations.

---

## LAS-45 — Implement the approved studio shell, mixer controls and shared account components
Jira: https://genstek69.atlassian.net/browse/LAS-45
Initial status: To Do

## Context and user outcome

Apply the approved design to navigation, layout, transport, channel strips and reusable account/input/dialog components. Preserve real audio behavior and testable accessible names while improving the working interface.

## Delivery plan

Assigned to native Jira sprint **LAS Sprint 04** (ID 5), currently future and not started. No dates or estimated capacity committed; refine before starting. Research/prototype work proceeds only when its prerequisite evidence supports it.

## Dependencies

* [LAS-44](https://genstek69.atlassian.net/browse/LAS-44)
* [LAS-21](https://genstek69.atlassian.net/browse/LAS-21)

## Acceptance criteria

- [ ] Implemented layout and shared components match approved designs at the agreed viewports without clipping critical controls.
- [ ] Faders/knobs support precise keyboard and pointer control, show units/values and distinguish visual state from actual audio state.
- [ ] Play/Pause/Stop, WAV import and applicable Pause/Resume/Unload behavior are preserved and checked; selectors prefer accessible roles/names.
- [ ] Visual comparisons and functional regression evidence are attached; errors, loading, disabled and focus states follow the design system.

## Definition of done

Design work: reviewable artifact and recorded user decisions. Implementation: reviewed GitHub PR, criteria verified and relevant UI/audio regressions checked. A planning ticket is not evidence that designs or tests exist.

## Source

Gennady's UI/UX backlog addition, 20 October 2026. Repository: https://github.com/genstek/MPS-Audio-Studio      
Preserve LAS-10 learning, LAS-11 Pause/Resume and LAS-12 Unload. Current branch name stays codex/SCRUM-7-SCRUM-10-mixer.

## Responsive implementation boundary

[LAS-48](https://genstek69.atlassian.net/browse/LAS-48) owns automatic workspace resizing, overflow/reflow, resize-safe audio state and its viewport regression checks. Coordinate the shell/component implementation here with that story; do not create a second independent responsive implementation or treat a fixed-width approved mockup as sufficient.

---

## LAS-70 — Add contextual info hints and linked help for every studio control
Jira: https://genstek69.atlassian.net/browse/LAS-70
Initial status: To Do

## User request

Provide an adjacent "i" info icon for every studio parameter and button. Hovering over the icon for 3 seconds reveals the function name, a short explanation and a link to detailed help for that exact function.  
Source: Gennady, 2026-11-02. This is a studio-wide requirement, including transport, track/channel controls, Master, EQ, Dynamics, Limiter, Space, project/save/import/export and relevant dialogs.

## Acceptance criteria

* Each user-facing parameter/button has an adjacent, consistent, discoverable info icon associated with that exact control. Audit all screens and record a coverage inventory.
* Hover over the info icon for 3 seconds to open its help popover; leaving before the delay cancels opening. Clicking/tapping the icon opens it immediately for touch and mouse users.
* The popover contains the exact control/function name, a short plain-language explanation of what it does and when to use it, plus a descriptive link to more detailed help for that function.
* For example, Limiter: "Limits peaks above the chosen ceiling. Use it to control output peaks; excessive limiting can reduce dynamics." Link to the Limiter help section. Parameter-specific hints explain the parameter rather than repeating generic module text.
* Explain units, direction/range and relevant consequences where useful (e.g. threshold, ratio, ceiling, attack/release, dry/wet). Describe actual implemented behavior; label unavailable functionality honestly.
* The detailed-help link resolves to a real relevant help article/anchor. Create missing help content rather than shipping dead links or generic home-page links. Help language follows the studio UI; keep content centrally maintained.
* Hovering the parent control alone does not change its value. Clicking its info icon does not activate the button, move a slider or toggle bypass.
* Because it contains an interactive help link, implement a focusable help popover rather than relying on a native title tooltip. Pointer can move from icon to popover/link without it disappearing.
* Keyboard users can focus and activate each info icon; use accessible names such as "Help for Limiter ceiling". Escape closes and restores focus appropriately; click outside closes without changing settings.
* Position within the viewport, remain readable at zoom/small widths and coexist with movable/concurrent editor windows. Do not cover the triggering control unnecessarily or steal focus during mere hover.
* Keep one contextual help popover active at a time; cancel pending timers on navigation/unmount.
* Proposed detailed help behavior: open an in-app help view while preserving project and playback state, with a clear return path. Review placement with LAS-44/45.

## Content and design delivery

LAS-44/45 own shared icon/popover styling and integration; LAS-65 covers processor presentations. Inventory control → hint text → help target and provide reviewed examples before applying the pattern everywhere.  
Include hints for new Sprint 10 controls (Space, player, Master Level and saving) as those controls ship.

## QA / definition of done

Under LAS-66 verify 3-second hover delay and early-leave cancellation, pointer movement to link, immediate click/tap, keyboard/focus/Escape, no accidental control activation, screen-reader naming, viewport boundaries, multiple editor z-order, help links and content coverage.  
Use deterministic timer tests where appropriate and browser interaction checks. Keep manual acceptance Not Run until executed. Deliver LAS-keyed PRs, content inventory, screenshots and actual test results in docs/delivery/LAS-N/.

---

## LAS-66 — Sprint 10 — QA acceptance and regression coverage
Jira: https://genstek69.atlassian.net/browse/LAS-66
Initial status: To Do

Cover LAS-61/62/63/64/65 and LAS-44/45 with acceptance-mapped tests and a manual checklist. Verify independent windows, drag/resize/focus, close/reopen, parameter/undo isolation, actual meters vs previews, bypass/silence, Space DSP/export parity and settings compatibility. Retain LAS-48/51 viewport regressions. Record exact build, OS/browser and audio fixtures. Web, macOS/iOS wrapper and listening results must be separate. Attach reports and defects per feature. Entry: reviewable build and approved relevant designs. Exit: executed acceptance/regression evidence and documented unresolved defects; Gennady's manual/design/listening acceptance must be recorded separately. All execution results currently Not Run.

## LAS-44/45 current refinement
LAS-44: include readable Fostex-inspired channel strips, faders/knobs/meters, transport/master, empty and loaded desktop/narrow states, multiple movable editors, Space, hints and project/save flows. Obtain explicit selection of concrete proposals. LAS-45 implements the selected design; preserve all real processing/state/accessibility/responsive behavior. The original LAS-44 Sprint03 and LAS-45 Sprint04 assignment text is historical; both now belong to Sprint10.

## Dispatch prompt
Load docs/claude-code/2026-11-02/SPRINT-10.md from origin/docs/LAS-40-sprint-10-handoff-2026-11-02. Execute all unblocked work orders in this package against delivery/LAS-40-all-sprints. First report the loaded handoff, actual baseline SHA and initial tasks, then proceed. Present design options for approval and continue independent functional work while awaiting the choice. Save delivery evidence per LAS issue, synchronize Jira honestly, and keep Gennady's manual QA Not Run. Do not merge to main or mark owner acceptance complete.
