# LAS-12 — Unload the imported track and return to the empty state

Jira: [LAS-12](https://genstek69.atlassian.net/browse/LAS-12) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-12.md` · Mode: IMPLEMENT

Branch `feat/LAS-12-unload-track` (on top of LAS-9 and LAS-11) · tested application commit `4e8a9038bb1393eeb1c6b4c1addb459b209a49d7`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Behaviour
- **Remove track** button in the Tracks heading, shown only while a track is loaded (visible text = accessible name). It works while Ready, Playing, Paused, Stopped, while a replacement is importing and while a start is pending.
- `engine.unload()` (distinct from `dispose()`): stops and disconnects the source, cancels a waiting start, invalidates any running import (a late decode cannot restore the track), drops the decoded buffer, resets the position to 0 and suspends the AudioContext; the context stays open for the next import.
- The UI returns to the TC-001 empty state: No audio loaded, "Your session starts here", 00 TRACKS, Import WAV, timer 00:00.0 / 00:00.0, Play/Pause/Stop disabled, any error cleared. Keyboard focus moves to the import control because the button disappears.
- The source file is only read by the browser; nothing writes to it.

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| unload stops playback, forgets the track and keeps the engine for the next import | Vitest | AC-02/03/06: source stopped/disconnected, position 0, Play does nothing, context suspended not closed, next import plays from 0 |
| unload cancels an import in progress and a start waiting for the context | Vitest | late decode rejected as superseded; pending start resolves false |
| LAS-12: Remove track empties the session from Playing, Paused and Stopped | Playwright + probe | AC-01..04: empty state, focus, no source playing or connected, context suspended, no late start after 300 ms |
| LAS-12: removing during a replacement import keeps the session empty | Playwright + probe (decode held) | QA-02: late decode cannot restore the removed track |
| LAS-12: the same and a different WAV import and play after removal; the file is unchanged | Playwright + probe | AC-05/06: same file from disk and another file play normally (start offset 0); SHA-256 of the file on disk unchanged |

The probe (`tests/e2e/helpers/audio-probe.js`) now also records the page's AudioContexts and can hold decoding back. It observes engine objects; it is not a sound measurement.

**Mutation check:** without `latestLoad++` in `unload()`, both the unit test and the held-decode Playwright test fail (the late decode brought back "Ready") — `evidence/mutation/`. Restored before the commit.

## Limitations
- "Release resources": the buffer reference is dropped and the context suspended; actual memory release depends on browser garbage collection and was not measured.
- Linux Chromium 141 only; nobody listened. Multitrack per-track removal is out of scope (story).
