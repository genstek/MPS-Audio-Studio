# LAS-74 — help on the actual control, no i/ⓘ/? icons

Baseline `1b1d88efa7a582e0e03b42f46fe2b39e3430205c`. Supersedes the LAS-70 icon criteria. Help content (`src/help-content.js`) and its "More about …" links are unchanged.

## Behaviour
- No help buttons render anywhere. `HelpTip` now renders hidden markers and attaches to a target: the `WithHelp` wrapper, the element before an `inline` tip, or its parent. `ParamField` attaches to the whole field (label, slider and number box).
- Pointer: 3 s hover opens it; leaving earlier cancels it; the popover stays open while the pointer is on it, so the link is usable (250 ms grace).
- Press/drag: a pointer press on the target closes the popover and suppresses hover until release. Controls are never delayed.
- Keyboard: focus the control, press **F1** to open at once. Escape closes it and returns focus to the control. Escape also stops there and does not close the editor window.
- Screen readers: each target has `aria-describedby` pointing at a hidden "Name: short text".
- Touch: hover is ignored for `pointerType=touch` and long-press is not hijacked. The existing header **Help** button opens Studio help, which lists every function and now explains hover/F1. No new icons.
- Disabled controls: the wrapper owns the hover, so the reason is explainable.
- Placement: viewport-clamped, above editor windows (z-index 1000).

## Results (actual runs)
| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run test:unit` (vitest, 26 files / 314 tests) | Pass |
| `npx playwright test tests/e2e/help.spec.js` (9 tests) | Pass |
| `npx playwright test tests/e2e/LAS51-layout.spec.js tests/e2e/LAS48-coverage.spec.js` | Pass (27 incl. help spec) |

An earlier full-suite run had 14 layout failures. They were caused by my own `pointer-events: none` rule on disabled buttons, which hid them from `elementFromPoint`. I removed the rule and re-ran those specs: pass. I did not re-run the **entire** e2e suite after that fix. The first full run was 109 passed / 14 failed, and all 14 were those layout specs. The known LAS-72 timeout failure did not show up as a separate failure in the runs here.

## Not covered / limitations
- No test for touch emulation, or for hover on Firefox/WebKit. Only Chromium ran.
- Narrow-layout check is a viewport shrink while a popover is open (one test).
- Hovering a disabled control relies on Chromium delivering pointer events to the wrapper. Other browsers are unverified.
- Manual acceptance by Gennady: **Not Run / pending**. Jira: SYNC_PENDING.
