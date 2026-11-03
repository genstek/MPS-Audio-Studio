# LAS-44 — Design system proposal (Fostex-inspired studio)

Status: **PROPOSAL — awaiting Gennady's selection.** Nothing here is approved. LAS-45 implements only what Gennady selects. Inputs reused (not restarted): LAS-42 audit and directions A/B, LAS-43 wireframes, LAS-65 processor proposals, Gennady's Fostex Model 820 reference (Jira LAS-44 attachment), Sprint 10 functional work (LAS-60/61/62/63/64/67/68/69/70/71).

Review pages (open locally in a browser):
- Whole studio, two concrete proposals, desktop and narrow, empty and loaded: [`studio-proposals.html`](studio-proposals.html)
- Processor cards and editors (LAS-65): [`../LAS-65/processor-proposals.html`](../LAS-65/processor-proposals.html)
- Tokens: [`tokens.css`](tokens.css)

## 1. Principles
1. **Functional hardware, not a photo.** The console is the organising idea (strips, faders, knobs, meter bridge), drawn as real controls. The Fostex photo is not embedded and no brand marks are reproduced.
2. **Readable before decorative.** Labels ≥ 10 px uppercase with 1.5 px tracking on hardware, ≥ 12 px elsewhere; every value has a unit; contrast ≥ 4.5:1 for text, ≥ 3:1 for meaningful graphics.
3. **Truthful signals.** Meters and spectra show measured audio only; configured shapes (EQ curve, transfer curve, ceiling, decay) are drawn from settings and labelled as such (LAS-63).
4. **One look per state.** Default, hover, focus, pressed/on, disabled, error and loading look the same on every control family.
5. **Responsive by design.** Desktop ≥ 761×450 keeps every essential control visible without page scrolling (LAS-48/51); ≤ 760 px stacks and scrolls.

## 2. Tokens
| Group | Token | Value | Use | Contrast on `--surface-1` |
| --- | --- | --- | --- | --- |
| Surface | `--surface-0` | #0c1013 | display glass (scopes, meters) | — |
| | `--surface-1` | #111519 | page | — |
| | `--surface-2` | #1c2329 | panels, windows | — |
| | `--surface-3` / `--faceplate` | #252e35 / graphite gradient | console modules | — |
| Text | `--ink` | #ecedf0 | primary | 15.7:1 (13.6:1 on surface-2) |
| | `--ink-2` | #c5ced6 | secondary | 11.5:1 (10.0:1) |
| | `--ink-3` | #a7b2bc | labels, units | 8.5:1 (7.4:1) |
| Accent | `--accent` | #d7af6c brass | primary action, EQ, selected | 8.9:1 (7.7:1); dark ink on brass 8.6:1 |
| | `--dyn` | #6fc3b2 teal | Dynamics | 8.8:1 (7.7:1) |
| | `--lim` | #e07b62 coral | Limiter | 6.3:1 (5.4:1) |
| | `--space` | #a58bd8 violet | Space | 6.4:1 (5.5:1) |
| | `--focus` | #80d1e0 | focus ring (3 px, 4 px offset) | 10.6:1 (9.2:1) |
| Meter | `--ok` / `--warn` / `--clip` | #4f9d69 / #d7af6c / #e5534b | below −6 dB / −6…−1 dB / clip | 5.6 / 8.9 / 5.0:1 (4.8 / 7.7 / 4.3:1) |
| Type | `--font-ui`, `--font-num` | system UI; system monospace for numbers | tabular values | — |
| Size | xs 10 · sm 12 · md 13 · lg 16 · xl 24 px | | | |
| Space | 4 · 8 · 12 · 16 · 24 · 32 px | 4 px grid | | |
| Shape | radius 4 / 6 / 10 px; module and window shadows | | | |
| Motion | `--t-fast` 120 ms, `--t-param` 180 ms, ease `cubic-bezier(.2,.7,.2,1)`; both 0 ms under `prefers-reduced-motion` | | | |

Contrast values were computed with the WCAG 2.x relative-luminance formula against `--surface-1` #111519 (in brackets: against `--surface-2` #1c2329).

## 3. Components and states
Every component lists its keyboard behaviour; all have a visible 3 px focus ring.

| Component | Default | Hover | Focus | Pressed / on | Disabled | Error | Loading | Keyboard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button (secondary) | #303a43, 1 px #52616c | #44525e | ring | inset shadow | 58 % opacity, `not-allowed` | — | label "…ing" + spinner dot | Enter/Space |
| Button (primary) | brass fill, dark ink | lighter brass | ring | darker brass | 58 % opacity | — | spinner dot | Enter/Space |
| Hardware key (bypass, transport) | raised cap | lighter cap | ring | LED lit + `aria-pressed` | LED dark, 58 % | — | — | Enter/Space toggles |
| Field (number) | glass #0c1013, mono | border #6c7c88 | ring | — | 58 % | red border + message below (`role=alert`) | — | type, Enter commits, Esc reverts, ↑/↓ steps |
| Fader (Master, stems) | long track, cap with centre line, dB scale | cap highlight | ring on cap | — | dimmed with reason text | — | — | ←/→ 0.5 dB, PgUp/PgDn 6 dB, Home mute, End 0 dB, double-click reset |
| Knob | cap with pointer, arc of value in module colour, numeric window under it | arc brightens | ring | — | 58 % | — | — | ↑/→ +step, ↓/← −step, Shift ×10, Home/End min/max; vertical drag |
| Meter (LED ladder / bar) | green → amber → red segments | — | — | peak hold 1.5 s; clip LED latches until clicked | "—" | — | — | clip LED is a button "Reset clip" |
| Needle meter (VU-style) | cream dial, scale −20…+3, black needle, "VU-style RMS 300 ms" label | — | — | — | needle at rest | — | — | value in `aria-valuetext` |
| Tabs / segmented | grouped keys | lighter | ring | brass fill | 58 % | — | — | ←/→ move, Enter selects |
| Dialog (modal) | surface-2, 10 px radius, backdrop #0009 | — | first field | — | — | error banner | progress bar | Esc closes, focus returns |
| Editor window (non-modal) | title bar with ⋮⋮ grip, Undo, presets, × | — | bright title bar = active | dragging: shadow grows | — | — | — | grip: arrows move 16 px (Shift 64 px), Esc closes active, Ctrl+` cycles windows |
| ⓘ help | 15 px circle | ring brightens | ring | popover open | hidden for unavailable controls? **No** — kept, text says unavailable | — | — | Enter/Space opens, Esc closes |
| Toast / status | status line in transport | — | — | — | — | red text + action | "Saving…" | announced politely |

## 4. Layout and responsive behaviour (LAS-48 handoff)
| Viewport | Layout | Essential controls (must be fully visible, no page scroll on desktop) |
| --- | --- | --- |
| ≥ 1280×720 | Meter bridge row · transport/player row · tracks + master · console strips | Play, Pause, Stop, RWD, FF, timeline, status, time, Import/Replace, Master Level, Export, each strip's Edit/Bypass, project name + New/Open/Save |
| 761–1279 × ≥ 450 | Meter bridge collapses into the transport row (needles become bars below 600 px height); strips compress (graph shrinks, captions drop) | same |
| ≤ 760 wide | Stacked; page scrolls; strips 2 per row; editors full width | reachable by scrolling, no sideways scroll |
| Zoom 200 % at 1280×720 | treated as 640×360 → stacked | same as narrow |

Many channels (stems): the stem strips scroll horizontally inside the console row with a sticky Master strip on the right; narrow layout lists stems vertically.

**QA viewport matrix proposed for confirmation with Gennady:** 1920×1080, 1440×900, 1280×720, 1024×768, 776×888, 761×450, 390×844 (phone), 1280×720 at 200 % zoom. Existing LAS-51 regression samples stay in the automated suite.

## 5. Screens covered by the hi-fi proposals
Studio shell (empty and loaded), transport/player (two player variants for LAS-67), console strips with EQ/Dynamics/Limiter/Space cards, Master section with Master Level and meters, multiple movable editors, Space editor, ⓘ hint popover, New project dialog, Save/Open project and unsaved-changes prompt, export dialog, narrow layout. Account forms, reference comparison and stems are shown as frames using the same components; their detailed hi-fi screens follow the selected direction.

## 6. Decision record
| Date | Decision | By |
| --- | --- | --- |
| — | **Pending**: choose Proposal 1 "Model 820 console", Proposal 2 "Hybrid console workstation", a mix, or changes; choose player A (tape deck) or B (compact hybrid); confirm the QA viewport matrix | Gennady |
