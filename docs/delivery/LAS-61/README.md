# LAS-61 — Move processor windows freely within the studio workspace

Jira: [LAS-61](https://genstek69.atlassian.net/browse/LAS-61) · Sprint 10 package · Mode: IMPLEMENT · shared window management with [LAS-62](../LAS-62/README.md)

Branch `delivery/LAS-40-sprint-10` · implementation commit `ce72cd4` · tested application commit `TESTED_COMMIT`

Developer status: **READY_FOR_QA** (proposed) · Gennady manual QA: **NOT_RUN**

## What the user gets
- Every processor editor (EQ, Dynamics, Limiter, Space) is a window that can be **dragged by its title bar** with mouse, pen or touch. Buttons, fields and sliders inside the title bar and the window keep working (a drag never starts from a control).
- **Click or focus a window → it comes to the front**; the front window has a light-blue frame and brighter title bar.
- Windows open **below the transport**, cascaded 36 px apart, so Play/Pause/Stop are not covered.
- A window always stays inside the visible workspace: fully across, and with at least its title bar and first controls visible vertically; its height is limited to the space below its top and the rest scrolls inside it. After a **browser resize or rotation**, windows are moved back inside.
- **Keyboard:** the ⋮⋮ grip in each title bar is a button ("Move EQ window"): arrow keys move 16 px (Shift: 64 px), **Home** puts that window back to its first place. Visible focus ring.
- **Reset window layout** (Mixer heading) puts every window back to its first place.
- Positions are kept when a window is closed and reopened during the session (not across reloads; project files keep them since LAS-69).
- Moving or stacking windows is **view state only**: no settings are sent to the audio chain, playback is not interrupted, the chain is not recreated (tested by counting chain messages and sources).
- No OS-level windows or pop-outs (as the issue states).

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Drag by title bar; controls inside still operable | pointer drag −500/+300 px exact; checkbox in the moved window works without moving it | PASS | `tests/e2e/editor-windows.spec.js` |
| No parameter change, no playback interruption, no chain recreation | chain message count unchanged during drag; status Playing; one source | PASS | same |
| Click brings to front; title and close reachable | z-index and `is-active`; drag far off-screen stops at 8 px from the edge, Close fully in viewport | PASS | same |
| Resize recovery; Reset window layout | window dragged right then viewport 800×600 → back inside; reset restores first places | PASS | same |
| Position kept on close/reopen | same box after reopen | PASS | same |
| Keyboard positioning and reset, visible focus | grip: ←←, Shift+↓ = −32/+64 px; Home resets; `:focus-visible` | PASS | same |
| Small screens | 390×844: all open windows inside horizontally, close and grip in viewport, no horizontal page scroll | PASS | same |
| LAS-48/51 responsive regressions | full layout matrix | PASS | final check |

## Known behaviour to review
- Floating windows can **cover the mixer strips and the Mixer heading** (including Reset window layout) on smaller desktops, as any floating window does. Users can move windows, use the grip's Home key, or reach every covered button with Tab. The tests open covered editors from the keyboard for this reason. The LAS-44 proposal puts a window menu in each title bar; that is a design decision.
- Window positions are not remembered across reloads except through a saved project (LAS-69).

Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.
