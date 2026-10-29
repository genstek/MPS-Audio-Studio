# LAS-9 — Real Play/Pause transport for an imported WAV

Jira: [LAS-9](https://genstek69.atlassian.net/browse/LAS-9) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-9.md` · Mode: VERIFY_AND_CLOSE_GAPS

Branch `feat/LAS-9-elapsed-position` · tested application commit `9e9d8174fc932269e8b6911754f4f2255da1af2e`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Kept as is (verified)
The engine owns the AudioContext and the one AudioBufferSourceNode; Play runs inside the click (user gesture) and resumes the context; Pause stores the offset from the audio clock; Stop resets it to 0; natural end disconnects the source and reports Stopped. Play is disabled until a track is Ready.

## Gap closed: observable position (Jira comment 10002)
The 2026-10-19 QA comment asked for an elapsed time so Pause (freeze) and Stop (back to 00:00) can be told apart and tested. Added:
- `src/audio-engine.js`: `position()` — seconds into the track from `AudioContext.currentTime` while playing, the stored offset otherwise, capped at the decoded duration; `pause()` reuses it.
- `src/main.jsx`, `src/styles.css`: a "Playback position" timer under the status, `mm:ss.t / mm:ss.t` (elapsed / decoded duration), refreshed ten times a second while Playing, frozen on Pause, reset on Stop, natural end and import. It is a read-out, not a seek bar or waveform.

## Tests
| Test | Kind | Covers |
| --- | --- | --- |
| position follows the audio clock, freezes on pause and resets on stop and natural end | Vitest (mocked clock) | AC-02/03/04 arithmetic and resume offset |
| LAS-9: elapsed time follows the engine through pause, resume, stop and natural end | Playwright + source probe | time advances, stays fixed for 400 ms while paused, the next source starts at the paused offset (±0.051 s of the display), Stop shows 00:00.0 and restarts at offset 0, a 2 s file ends by itself into Stopped at 00:00.0 |
| existing pause/stop/dispose, natural end, playback.spec, LAS-51 playback state | Vitest / Playwright | unchanged and passing |

The new Playwright test passed 8 of 8 repeated runs before the commit (`--repeat-each=8`).

## What this does not prove
The start offset proves which position the engine asked the browser to play from; it is not a recording of the sound. Nobody listened. LAS-9-QA-01..03 (recognizable music, audible resume) are Gennady's.

## Rapid actions (AC-05)
Play is disabled while a start is pending and Pause only works while Playing; the failed-decode path is covered by LAS-8 tests. A further engine guard against overlapping starts lands with LAS-11, which owns repeated toggling.

## Browsers (AC-07)
Chromium 141 on Linux only. Google Chrome on macOS, Safari and Firefox: **pending, not run**.
