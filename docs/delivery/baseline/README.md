# Baseline on origin/main before delivery work

Commit `364d863de109d1e474bff0635bc0b451224e8860` (merge of PR #8, LAS-51), checked out unchanged in the isolated worktree `MPS-Audio-Studio-delivery`. The owner's original folder was not touched.

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Lint | `npm run lint` | 0 | no findings (`lint.log`) |
| Unit | `npm run test:unit` | 0 | 4/4 (`unit.log`) |
| Build | `npm run build` | 0 | `build.log` |
| E2E | `npx playwright test -c <out-of-repo config>` that imports the repository config and only swaps `channel: 'chrome'` for the local Chromium 141 binary | 0 | 13/13 (`e2e.log`) |

`server-owner.txt` records the PID, working folder and command of the Vite server on port 5173 during the run (it was started by Playwright from this worktree). Timestamps are in `summary.txt`. Environment: `../ENVIRONMENT.md`.

Not run at baseline: Google Chrome channel (not installed in the container), macOS, manual QA.
