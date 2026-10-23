# LAS-51 Claude Code attempt — evidence index

Everything here was produced by this attempt in a Linux cloud container (Ubuntu 24.04.5, Node 22.22.0,
Playwright 1.64.1, preinstalled Chromium 141.0.7390.37). **None of it is macOS evidence.** The owner's supplied
Mac log and Trace Viewer screenshots stay in the handoff package. `<scratch>` in logs is the session scratch
directory outside the repository.

The code went through four states:
- **baseline**: unmodified `a154430`;
- **attempt 1**: rejected (Mixer buttons hidden at 785×520, footer lost at 804×471);
- **revision 2**: rejected (knobs hidden on short screens, Master level inside the scroller);
- **final**: revision 3, described in `../RESULT.md`.

## Top level

| Path | What it shows |
|---|---|
| `776x888-baseline-revision2-final.jpg` | The owner's comfortable viewport: baseline, revision 2 and final side by side |
| `four-versions-804x471-785x520-761x450.jpg` | Empty state at three short sizes for all four versions, each rendered from its own read-only copy |

## `final/` — revision 3

| Path | What it shows | Limits |
|---|---|---|
| `e2e-console.txt` | Full E2E suite: **13 passed** (9 LAS-51 layout, state, sweep and playback tests; the original reproduction; 3 older tests) | Linux Chromium 141 through an out-of-repo override |
| `e2e-repeat-each-2-workers-4.txt` | LAS-51 specs twice each on 4 workers: **20 passed** | Stability sample |
| `npm-run-check-as-configured.txt` | `npm run check` as configured: lint, 4 unit tests and build pass; E2E cannot start (no Google Chrome here) | Environment blocker |
| `acceptance-probe-all-states.md` | Before-scrolling probe for empty, loaded, long-name and load-error states at 22 sizes: 0 failing desktop sizes; also shows which arrangement each panel chose | Probe script, not a test |
| `measurements-*.md/.json` | Region heights, Mixer and Master details scroll state, End/Home keyboard results per size | — |
| `detection/` | The final test at 804×471, 761×450 and 776×888 against the baseline, attempt 1, revision 2 and five CSS mutations | One mutation (Tracks reserve 2rem) changes nothing on screen at these sizes and passes |
| `screenshots/` | 15 sizes × 4 states (`final-<state>-<size>.jpg`) | JPEG quality 72 |
| `server-owner.txt` | PID, cwd and command of the server on 5173 during the full run | — |

## Other folders
- `baseline/` — baseline run (4 passed, 2 failed at 1280×720), failure screenshots, traces, measurements and screenshots.
- `diagnostics/` — the baseline sub-pixel replay (ratio 0.9665) and the macOS editing-command emulation.
- `attempt-1/`, `revision-2/` — the rejected submissions' runs, screenshots, detection logs and comparison sheets, kept unchanged.
