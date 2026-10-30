# LAS-34 — Import original stems and play them through synchronized mixer channels

Jira: [LAS-34](https://genstek69.atlassian.net/browse/LAS-34) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-34.md` · Mode: IMPLEMENT · Prerequisite: LAS-27 (READY_FOR_QA)

Branch `feat/LAS-34-stems` · tested application commit `98bf1c68e36edc70fa053cb71d41d6c19211e160`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
**Stems…** (mixer heading) opens the *Stem session*:
- **Add stem WAVs:** several at once, up to 16; each is decoded on this device and the files are never changed.
- **One strip per stem:**
  - its name and the file's own rate, channels and length;
  - **Gain** (−24…+12 dB), **Pan** (left…right), **Offset (ms)** (whole samples), **Mute**, **Solo**, **Remove**;
  - a **meter** of what that strip sends to the mix (peak dBFS, from its own analyser).
- **Stem transport:** Play, Pause, Stop and **Position** (seek), with the time readout, the Processed/Original switch and the **Master** meter (after the switch).
- **Alignment notes** state the policy wherever it applies: another sample rate, more than two channels, different lengths.

The stems play through the same master chain as the single track (LAS-27/28), so the mixer's EQ, dynamics and limiter process their sum.

## Timing model
- Every play schedules **all stem sources at one start time on the audio context's clock**, with the same session offset. They share one sample clock and play at rate 1, so they cannot drift.
- Pause, seek and resume stop every source and start new ones the same way. Each restart is therefore sample-aligned; nothing is nudged or corrected afterwards.
- A stem with an offset starts at the shared time plus its offset. A running stem joins at the matching point in its own file.

## Alignment policy (explained in the dialog)
| Case | Policy |
| --- | --- |
| Start | Every stem starts at the first sample of the session (as stems exported from one DAW session do). **Offset** delays a stem by whole samples of the playback rate |
| Different lengths | The session lasts until the last stem ends; shorter stems are silent after their end. Nothing is stretched or trimmed |
| Different sample rate | The browser resamples the stem to the playback rate for listening, and the note names both rates. Offline rendering at a common rate is LAS-35 |
| More than two channels | Plays as a stereo downmix (note shown) |
| Mono / stereo | Equal-power panning (Web Audio `StereoPannerNode`): a centred mono stem plays −3 dB in each channel; a centred stereo stem is unchanged; hard left/right keeps full level on one side |
| Mute / Solo | A strip is audible when it is not muted and either no strip is soloed or it is soloed (muting a soloed strip silences it). Changes ramp over 10 ms, without clicks |

**Single track and stems take turns:**
- Playing the stems stops the single track, whose transport then shows *Stopped*.
- Playing the single track pauses the stems.
- Closing the dialog pauses the stems; the session stays loaded for the page's lifetime.

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| **Timing, measured on real Web Audio rendering.** The stem session runs in an `OfflineAudioContext` (the same nodes as live playback), and play, pause, resume, seek-while-playing, pause, seek-while-paused and play are scheduled at render times with `suspend()`. Results: <br>• **every click of stem A (left) has its partner from stem B (right) at exactly the same sample** (no drift); <br>• within each run the clicks are exactly 11,025 samples (0.25 s) apart; <br>• the only other gaps are the restarts | PASS | `tests/e2e/stems.spec.js` (test 1), `evidence/playwright-stems.txt` |
| **Summing and routing, measured on rendered samples:** <br>• a centred mono stem gives 0.707 × in each channel (equal-power law); a centred stereo stem is unchanged; <br>• −6 dB and hard left change only stem A; mute silences only B; solo leaves only C; muting a soloed stem silences it; <br>• a 0.1 s offset moves only C by exactly 0.1 s; <br>• the session lasts as long as the longest stem | PASS | `tests/e2e/stems.spec.js` (test 2) |
| **Dialog with the real engine:** <br>• three stems (one at 48 kHz, one shorter) give "3 stems · 0:08.0" and both policy notes; <br>• Play stops the single track and starts exactly 3 sources; the position advances; the vocal meter and master meter read real levels (the mono bass reads −15 dBFS for a −12 dBFS file: the documented pan law); <br>• Mute drops the vocal meter to −60; Solo silences the others; <br>• seeking to 6 s while playing restarts 2 sources (the 5 s vocal has ended); Pause leaves 0; <br>• closing hands back to the single track (1 source); reopening resumes from about 6 s; Remove works; <br>• no horizontal page scroll at 360×780 | PASS | `tests/e2e/stems.spec.js` (test 3), `evidence/screenshots/` |
| **Engine units:** <br>• the stems get their own stereo stage, which receives the chain settings and the Processed/Original switch but not single-track loudness matching; <br>• the file's own rate and channels are read; <br>• playing stems stops the single track, and playing the single track pauses the stems; dispose cleans up; <br>• non-WAV or undecodable stems are refused | PASS | `evidence/vitest-engine-verbose.log` |
| **Regressions:** LAS-51 layout matrix, playback (LAS-9/10), the pause toggle (LAS-11) and track removal (LAS-12) rerun together with the stem tests | PASS | `evidence/playwright-stems.txt` |
| `npm run check`: ESLint clean, Vitest 266/266 (18 files), build, Playwright 79/79. Run on the staged tree committed unchanged as `98bf1c6` | PASS | `evidence/npm-run-check-98bf1c68e36edc70fa053cb71d41d6c19211e160.log`, `evidence/html-report-98bf1c68e36edc70fa053cb71d41d6c19211e160.zip` |
| **First full run failed** 6 LAS-51 layout tests. A *Stems* button in the masthead made the page 453 px tall at 761×450 (limit 450). The entry moved to the mixer heading (*Stems…*, next to Settings…); the accepted responsive layout is unchanged and the layout matrix passes | FIXED | `evidence/npm-run-check-attempt1-failed.log` |
| `npm run scan:artifacts`: 139 pieces, 0 findings | PASS | `evidence/scan-artifacts-98bf1c68e36edc70fa053cb71d41d6c19211e160.json` |
| Mac/Chrome run with Gennady's own stems | NOT_RUN | `manual-qa.md` |

## Changed files
- New: `src/stem-session.js`, `src/StemsDialog.jsx`.
- Changed: `src/audio-engine.js` (stem stage and session, shared settings and listening, turn-taking with the single track), `src/main.jsx`, `src/MixerPanel.jsx` (Stems… in the mixer heading), `src/styles.css`.
- Tests: `tests/e2e/stems.spec.js`, `tests/unit/audio-engine.test.js`.

## Limitations
- **Not a DAW:** no waveform, no timeline editing, no per-stem processing yet (LAS-35), no saving of stem sessions.
- Stem sessions are not saved: reloading the page empties them.
- Live playback of a stem at another sample rate uses the browser's resampler, so it is not sample-identical to the file. LAS-35 defines the offline render policy.
- Meters show peaks of 2048-sample windows read ten times a second. They are monitoring meters, not loudness measurements (use Analyze for those).
- Styling is provisional until the LAS-44/45 design gates. Linux Chromium only; not run on Mac/Chrome.
