# LAS-73 — one tooltip for one hovered control

Baseline: `origin/main` = `1b1d88efa7a582e0e03b42f46fe2b39e3430205c` (the owner tested `cb4262a`). Handoff package `e7a5b9076e8b57928931051400f5a7eb70bc618f` (PR #48) read in full via `git show`.
Tested SHA: the implementation commit on branch `las-73-74-tooltip-hover-help` (see the PR). PR: see the draft PR from this branch.

## Root cause (from code reading; not reproduced live)
`src/HelpTip.jsx` stored the open popover as the help **id** (`open: id`) and every mounted instance compared `state.open === id`. All mounted `Move window`, `Undo / Redo` and `Section presets` instances in EQ, Dynamics, Limiter and the Mixer therefore saw "open" at once.

## Fix
- Ownership is a per-instance token (`useId()`), not the help id. One store slot ⇒ one popover studio-wide.
- Hover timers, leave grace and the pressed/drag flag are per instance.
- The popover is positioned from the instance's own target element.
- Entering another control closes the current popover and restarts the timer.
- A nested help target owns the hover over its ancestor's.
- Removing the icons alone would not have hidden this: the state model itself changed.

## Criteria / results (actual runs, Chromium, headless)
| Criterion | Test | Result |
|---|---|---|
| EQ + Dynamics + Limiter open: hovering each window's Move window grip opens exactly 1 popover, anchored under that grip | `LAS-73: identical controls in several editors…` | Pass |
| Undo/Redo repeated across windows and Mixer: 1 popover | same test | Pass |
| Moving between controls resets owner and timer | `LAS-74: hovering the real control…` | Pass |
| Pending hover cancelled when its editor closes | `LAS-74: a pending hover is cancelled…` | Pass |

Limitation: the regression was **not** run against the old code, so "fails before, passes after" is not demonstrated here. The old icon-based tests were replaced, so the old behaviour cannot be exercised without checking out `main`.
Manual retest by Gennady: **Not Run / pending.** The video is evidence only.
Jira: SYNC_PENDING (see `jira-update.md`).
