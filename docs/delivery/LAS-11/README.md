# LAS-11 — Resume paused audio with either Pause or Play

Jira: [LAS-11](https://genstek69.atlassian.net/browse/LAS-11) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-11.md` · Mode: IMPLEMENT

Branch `feat/LAS-11-pause-toggle` (on top of LAS-9) · tested application commit `760dc13b749ded8f5344d1e98dd9e09bb7fd3c9e`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Behaviour
- **Pause is a toggle button** (`aria-pressed`): while Playing it pauses and stays pressed; pressing it again resumes from the paused position. Play also resumes. Stop resets to 00:00.0 and un-presses Pause. Pause is disabled with no track, in Ready and Stopped, and while the app is busy.
- **One start at a time** (`src/audio-engine.js`): `play()` keeps a single pending start while the AudioContext resumes. Pause, Stop, a new track or dispose cancels it. `play()` resolves `true` only when a source really started, and the UI sets Playing only then.
- **Honest busy text**: while a start is pending the status says "Starting playback…" (it used to say "Loading audio…").

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| a second Play while the first is starting does not add a source | Vitest | AC-05 engine guard |
| stop, pause or a new track while the context resumes cancels the start | Vitest | AC-05 cancellation; Play works afterwards from 0 |
| a failed resume can be retried | Vitest | pending start released on failure |
| LAS-11: Pause toggles, and Play also resumes from the paused position | Playwright + probe | AC-01..04: aria-pressed, both resume paths start the new source at the shown position (±0.051 s), Stop resets, at most one source ever playing |
| LAS-11: bursts of transport clicks never play two sources at once | Playwright + probe | AC-05 visible outcome: one source, status matches the engine |

Mutation checks (temporary, restored before commit):
- Removing the engine's pending-start check fails "a second Play while the first is starting…" (`evidence/mutation-start-guard/`).
- Removing the cancellation in `disconnect()` fails "stop, pause or a new track…" (`evidence/mutation-cancel/`).
- With both the engine guard and an earlier UI-level guard removed, the Playwright burst test still **passed** (`evidence/burst-without-guards-playwright.log`): React re-renders after each click, so disabled buttons absorb repeated clicks. The UI-level guard was therefore dropped as unreachable, and the engine guard is proven by the unit tests, not by the burst test.

Both new Playwright tests passed 4 of 4 and 3 of 3 repeated runs before the commit.

## Limitations
Start offsets show where the engine asked the browser to play; they are not a recording, and nobody listened. Linux Chromium 141 only. The pressed style is a gold border and text (see `evidence/screenshots/transport-paused.png`, taken with `shot-transport.mjs.txt` against this commit on a temporary port).
