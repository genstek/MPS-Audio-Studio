# LAS-8 — Import WAV audio and display a track

Jira: [LAS-8](https://genstek69.atlassian.net/browse/LAS-8) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-8.md` · Mode: VERIFY_AND_CLOSE_GAPS

Branch `feat/LAS-8-import-lifecycle` · tested application commit `2325073ba12b29e2e4de00f6e36dcb17da5bfcda`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## Kept as is (verified)
Local file picker for `.wav` (case-insensitive), 100 MiB limit, RIFF/WAVE header check before decoding, browser decoding with the decoded (possibly resampled) rate labelled "decoded", the previous track kept when a replacement fails, picker cleared after every import. Files are read in the browser only; the source file is never written.

## Gap closed in code
**Overlapping imports.** Before this change a slow earlier import could finish after a newer one and silently replace it, and an import still running when the engine was disposed could create a new AudioContext after disposal. `src/audio-engine.js` now numbers each import; only the newest may replace the track, and `dispose()` cancels pending imports. Overtaken imports reject with `SupersededError`, which `src/main.jsx` does not show as an error. The UI already disables the picker while an import runs, so this guards the engine contract (needed by LAS-12 unload) rather than a click path users can reach today.

## Tests added
| Test | Kind | Covers |
| --- | --- | --- |
| a newer import wins over a slower earlier one | Vitest | overlapping lifecycle; mutation check below |
| disposing during an import discards it without creating an audio context | Vitest | dispose during load |
| replacing a playing track stops and disconnects its source before the next play | Vitest | AC-04 node cleanup |
| 100 MiB is the largest accepted file size | Vitest | size boundary (exactly 100 MiB accepted, +1 byte rejected) |
| files without a RIFF/WAVE header are rejected before decoding; the extension is case-insensitive | Vitest | `RIFF…AVI `, `RIFX…WAVE`, 3-byte and empty files; `TONE.WAV` accepted |
| a failed first import leaves nothing to play | Vitest | decode failure without a previous track |
| LAS-8: reimport, failed replacement and retry leave one audio source | Playwright | same-file reimport (picker value cleared), replacement while playing, valid-header/undecodable replacement keeps playing, retry; counted with `tests/e2e/helpers/audio-probe.js` |
| LAS-8: track information comes from the decoded file | Playwright | 1.5 s stereo 48 kHz file shows `1.5 seconds · 2 channel(s) · <context rate> Hz decoded` |

Existing `playback.spec.js`, TC-002 (LAS-57) and TC-003 (LAS-10) cover the valid import, decode-failure recovery and invalid files.

`tests/fixtures/wav.js` accepts `{ seconds, channels, sampleRate }`; `makeWav()` with no options is byte-identical to before (SHA-256 `2bfad102…f0e63c` before and after).

**Mutation check:** removing the post-decode guard made "a newer import wins over a slower earlier one" fail (`evidence/mutation/`); the guard was restored before the commit.

## What the probe proves and does not prove
The probe wraps `AudioBufferSourceNode` start/stop/connect/disconnect in the page and counts sources that are started and not stopped, and sources that are connected and not disconnected. It shows the engine leaves at most one live source. It does not measure sound output, so it is not audio-fidelity evidence.

## Not done / limitations
- Large-file responsiveness was not measured (no 100 MiB browser import was run). Decoding is asynchronous, but UI freeze under large files is unverified.
- Drag and drop is out of scope (work order).
- Accessibility follow-up from LAS-57: the Replace WAV button's accessible name stays "Import WAV".
- Linux Chromium 141 only.
