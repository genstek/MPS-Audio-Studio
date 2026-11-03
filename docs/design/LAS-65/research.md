# LAS-65 — Processor presentation research and proposals

Status: **proposals for Gennady's review; nothing here is approved.** Implementation of a visual reskin waits for his choice (LAS-44 → LAS-45). Functional work that does not depend on the look (LAS-61/62/63/64/67/68) continues in the current provisional styling.

Audited application: `delivery/LAS-40-all-sprints` @ `0296386` (same UI Gennady reported on, macOS Chrome, localhost:5173). Research date: 2026-11-02.

## 1. What the studio shows today
| Card | Indicator on the mixer card | Editor |
| --- | --- | --- |
| EQ | Real response thumbnail (46 px), caption "Flat · Link" / "n bands" | 24-band parametric per channel (Link/Left/Right), draggable points, numeric fields, live spectrum behind the curve |
| Dynamics | Gain-reduction bar from the AudioWorklet (0 when silent) | Numeric fields (threshold, ratio, attack, release, knee, makeup, detector), GR bar |
| Limiter | Gain-reduction bar | Numeric fields (ceiling, input gain, release), GR bar, latency note |
| Space | "Coming soon" placeholder | none |

Gaps Gennady reported (recordings 18.54.15 and 19.04.14): cards look generic, only one editor at a time, editors cannot be moved, Dynamics/Limiter/Space have no graphical presentation of their settings. LAS-63 clarifies that live meters already animate during playback; the request is configured-state graphics that stay visible while stopped.

## 2. Sources and the interaction principles borrowed
Only documentation published by the vendors (or, where noted, a secondary source) was used. The fabfilter.com pages could not be opened directly from this session (the network policy blocks the host); the quoted text comes from the search index of those official pages and should be re-checked in a normal browser.

| # | Source | What it says (short quote or paraphrase) | Principle we borrow | Where it applies |
| --- | --- | --- | --- | --- |
| S1 | FabFilter Pro-Q 4 help, EQ display — <https://www.fabfilter.com/help/pro-q/using/eqdisplay> | Click the curve to add a band and drag it; exact values appear beside each band's dot; double-click a value to edit it. | Direct manipulation on the response curve **plus** exact numeric entry on the same object. | EQ editor (already partly implemented in LAS-28: drag + fields). Proposal adds the value label beside the selected dot. |
| S2 | FabFilter Pro-Q 4 help, analyzer / spectrum grab — <https://fabfilter.com/help/pro-q/using/analyzer>, <https://www.fabfilter.com/help/pro-q/using/spectrumgrab> | Post-EQ analysis is recommended "since this relates best to what you are actually hearing". | The spectrum shows what is heard, never a decoration. Ours is tapped after the A/B switch (LAS-28) — keep and label it. | EQ editor, EQ card, player spectrum (LAS-67). |
| S3 | Apple Logic Pro Channel EQ (iPad guide <https://support.apple.com/guide/logicpro-ipad/lpip1816dc6e/ipados>; Mac guide <https://help.apple.com/logicpro/mac/10.4.5/en.lproj/lgcef1edc1d7.html>) | Drag the control point to change frequency and gain; drag the horizontal line to change gain only; drag the vertical lines around a band to change Q only; Analyzer button turns the analyzer on/off; the analyzer range can be offset. | Separate handles for "gain only" and "Q only" reduce accidental changes; analyzer can be switched off. | EQ editor (Q handles = proposal), analyzer toggle (proposal). |
| S4 | FabFilter Pro-C 2 help, overview — <https://www.fabfilter.com/help/pro-c/using/overview> | The animated level display "shows you the incoming and processed audio signals together with the gain reduction"; the knee display visualizes the input/output transform including Threshold, Ratio, Knee and Range and "uses the same scale as the level display". | The **transfer curve shares its dB scale with the level meters**, so the user sees where the signal sits relative to the threshold. | Dynamics card (mini transfer curve + GR), Dynamics editor (large curve with live input dot, in/out/GR meters). |
| S5 | FabFilter Pro-L 2 help — overview <https://www.fabfilter.com/help/pro-l/using/overview>, output options <https://www.fabfilter.com/help/pro-l/using/outputoptions>, recommended workflow <https://fabfilter.com/help/pro-l/using/recommendedworkflow> | Real-time display of input, output and gain-reduction levels; with True Peak Limiting the output does not exceed the set level in dBTP; suggested −1.0 dBTP for EBU R128. | A **scrolling level history with the ceiling drawn as a line** and gain reduction as a shaded band from the top; ceiling shown in dBTP. | Limiter card (ceiling marker + GR), Limiter editor (history display, in/out/GR meters). |
| S6 | FabFilter Pro-R 2 help, decay rate EQ — <https://www.fabfilter.com/help/pro-r/using/decayrateEQ> | Decay per frequency shown as a waterfall; drag a dot to change frequency and decay rate; double-click for numeric entry. | Reverb settings are **shown as decay over time (and frequency)**, computed from the parameters, editable directly. | Space card (decay envelope), Space editor (envelope + damping view). |
| S7 | Apple Logic Pro ChromaVerb (Mac article <https://support.apple.com/HT208923>; iPad guide <https://support.apple.com/guide/logicpro-ipad/lpipdc1fd692/ipados>) | The graphic display shows the reverb output during playback; predelay is the time between the original signal and the early reflections; damping changes how long each frequency band rings. | Distinguish **configured shape** (always visible) from **live output** (only while audio plays). Matches LAS-63's correction. | All cards (LAS-63), Space. |
| S8 | Graphic vs parametric EQ (secondary: <https://www.masteringbox.com/learn/graphic-eq>, <https://audiosolace.com/parametric-eq-vs-graphic-eq/>) | Graphic EQ: fixed centre frequencies, only level adjustable (7–31 bands, 1/3-octave). Parametric: choose frequency, bandwidth (Q) and gain. | Our engine is a **24-band parametric EQ per channel** (LAS-27). "Graphical EQ" in Gennady's request is read as a *graphical display* of that parametric EQ. A fixed-band slider view would be a different interaction; it is listed as an option only and would map onto the same engine, never replace it. | EQ proposal note. |
| S9 | VU meter (secondary: <https://en.wikipedia.org/wiki/VU_meter>, <https://www.proav.de/audio/meters.html>, <https://www.globalspec.com/learnmore/test_measurement_equipment/multimeters_electrical_test_meters/vu_meters>) | VU ballistics integrate over about 300 ms (IEC 60268-17 / ANSI C16.5); many products labelled "VU" do not conform. | Needle meters are labelled **"VU-style (RMS, 300 ms)"** and are not claimed as standards-compliant VU (LAS-67). | Player meters, Master. |
| S10 | W3C APG tooltip discussion (secondary: <https://github.com/w3c/aria-practices/issues/811>) and WCAG 2.x SC 1.4.13 summaries | `role=tooltip` may not contain interactive elements; content with a link should be a non-modal dialog; hover content must be dismissible, hoverable and persistent. | ⓘ help is a **focusable non-modal popover**, not a native title tooltip (LAS-70). | Every card and editor. |
| S11 | Fostex 820 owner's manual listing (<https://www.manualslib.com/manual/53245/Fostex-820.html>) and Fostex 812 manual (<https://www.manualslib.com/manual/53280/Fostex-812.html>) | An 8-channel recording mixer family with per-channel EQ, effect sends, pan and long faders. | Vertical **channel-strip grammar**: input at top, EQ knobs, sends, pan, long fader at the bottom, metering on a bridge. | Console proposal A, LAS-44 shell. |

**Fostex Model 820 photo (LAS-44 attachment `image.png`).** The session could not download it: `api.media.atlassian.com` is outside the session's allowed network hosts (HTTP 403 from the proxy). The proposals use the documented strip grammar of the 820/812 family and the direction text in LAS-44; **Gennady should compare them with his photo** and say which details (colour of the faceplate, knob caps, fader caps, meter bridge) to follow more closely. The photo itself is not copied into the repository and no Fostex logo or trade dress is reproduced.

## 3. Two concrete proposals
Static mockups, side by side: [`processor-proposals.html`](processor-proposals.html) (open locally in a browser). Screenshots: `docs/delivery/LAS-65/evidence/`. All numbers in the mockups are illustrative placeholders; nothing in them works.

### Proposal A — "Console module" (hardware-first)
- **Cards** are vertical console modules on a brushed graphite faceplate with a coloured cap stripe per module type (EQ amber, Dynamics teal, Limiter red, Space violet).
- Each card has a small **scope window** at the top (EQ curve / transfer curve / ceiling history / decay envelope), two or three **rotary knobs** for the most used parameters (EQ: selected band gain/frequency; Dynamics: threshold, ratio; Limiter: ceiling, input; Space: mix, decay), a **bypass key with LED**, and a 10-segment **LED ladder** for the real gain reduction or output level.
- **Expanded editor**: the same faceplate enlarged, knobs for every parameter with numeric value windows, plus a larger scope.
- Strengths: strong console identity, matches the Fostex direction, tactile. Risks: knobs are slower and less precise than fields for 24 EQ bands; small-viewport density; more custom drawing and keyboard handling.

### Proposal B — "Graph-first pro" (display-first)
- **Cards** are dark display tiles: a large live/configured graph fills the card, 2–3 key readouts sit under it (EQ: bands on and largest boost/cut; Dynamics: threshold and ratio plus GR; Limiter: ceiling and GR; Space: mix and decay), and a bypass toggle sits in the title row.
- **Expanded editors** follow S1–S7: EQ large curve with spectrum, Q handles and value label beside the selected band; Dynamics transfer curve sharing its dB scale with input/output/GR meters; Limiter scrolling level history with ceiling line and GR band; Space decay envelope with pre-delay marker and damping (high-frequency decay) curve. A parameter rail on the right has numeric fields with units.
- Strengths: accurate, fits 24 bands and numeric precision, cheaper to implement on top of the existing LAS-28 editors. Risks: less "hardware" character.

### Recommendation (developer note, not a decision)
**Hybrid "B inside A":** B's graph-first editors and card graphs, framed in A's console module (faceplate, cap colours, bypass key with LED, LED ladder). Knobs only where they add speed (Space mix/decay, Limiter ceiling, Dynamics threshold/ratio on the card); every knob has a numeric value window and keyboard steps. This keeps the 24-band engine readable and the Fostex identity visible. **Gennady decides: A, B, the hybrid, or changes.**

## 4. Per-processor detail (applies to both proposals)
| Processor | Configured shape (always visible, from parameters) | Live signal (only while audio plays; truthful idle otherwise) | Main controls |
| --- | --- | --- | --- |
| EQ | Response curve of the enabled bands at the playback rate; dots per band; Link shows one curve, independent shows L solid / R dashed | Post-A/B spectrum behind the curve | Band dots (drag freq/gain), Q handles, band list 1–24, type, numeric freq/gain/Q, EQ on/off, Link/L/R |
| Dynamics | Transfer curve (input dB → output dB) with threshold marker and knee region; makeup shifts the curve | Moving input-level dot on the curve, input/output/GR meters | Threshold, ratio, knee, attack, release, makeup, detector, on/off |
| Limiter | Ceiling line (dBTP) and input-gain offset | Scrolling input/output level and GR band; GR meter | Ceiling, input gain, release, on/off; latency note |
| Space | Decay envelope: pre-delay gap, then −60 dB over the decay time; damping drawn as faster high-frequency decay; dry/wet balance bar | Output level meter only (no invented reverb animation) | Mix, pre-delay, decay, damping, preset (Room/Hall/Plate), on/off |

## 5. States every card and editor must show
| State | Card | Editor |
| --- | --- | --- |
| Active (on, audio loaded) | Cap LED lit, graph in full colour | Same |
| Bypassed | LED off, "BYPASS" label, graph drawn in grey but still visible (configured shape is kept) | Same, controls stay editable |
| Modified from defaults | Small "edited" dot next to the title | "Reset to default" enabled |
| No audio loaded | Graph visible, meters show "—"/idle, editor still opens (settings can be prepared) | Live areas say "No audio" |
| Silent / paused / stopped | Meters fall to idle (no invented signal) | Same |
| Hover / focus | 2 px focus ring (#80d1e0), raised faceplate on hover | Focus ring on every control |
| Multiple windows | Each editor is its own window; the active one has the bright title bar | Drag by title bar, Reset layout (LAS-61/62) |
| Small viewport (≤ 760 px) | Cards in a 2-column grid, graph above readouts | Editor fills the width, scrolls inside |

## 6. Decision record
| Date | Decision | By |
| --- | --- | --- |
| — | **Pending**: choose A, B, hybrid, or request changes | Gennady |
