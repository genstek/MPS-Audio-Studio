# LAS-35 — Process individual stems and render a synchronized stem master

Jira: [LAS-35](https://genstek69.atlassian.net/browse/LAS-35) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-35.md` · Mode: IMPLEMENT · Prerequisites: LAS-34, LAS-28 (READY_FOR_QA)

Branch `feat/LAS-35-stem-processing` · tested application commit `7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82`

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
In the *Stem session* (Mixer → **Stems…**), each strip now has its own chain:
- **Chain** label: *bypass* (default), *copy of master settings* or *from <file>*;
- **Use master settings**: copies the mixer's current chain to this stem;
- **Load settings…**: an `mps-chain` settings file (LAS-28) or an `mps-preset` file (LAS-33);
- **Bypass**: all processors off.

A stem's chain runs live on its own AudioWorklet node, before the strip's gain and pan.

**Session and render:**
- **Save session file** downloads `mps-stem-session` v1: every strip's offset, gain, pan, mute and solo; each stem's chain; the master chain. Stems are identified by their files' SHA-256, and **no audio is stored**.
- **Load session file…** applies the saved settings to the loaded stems with the same checksum and reports the ones it could not find. It sets the master chain as one undo step. Newer, foreign or invalid files are refused with a reason.
- **Render stem master** (24-bit, or 16-bit with TPDF dither) renders, in a worker and from the files themselves at their own sample rate:
  - `stem-master.wav`: every audible stem through its chain, gain, pan and offset, summed through the master chain;
  - `<stem>-stem.wav` for every audible stem: its strip output before the master, session-long, so the files line up in any DAW.

  A table shows each file's length (seconds and samples), rate, channels, bit depth, peak and true peak, and clipped samples. **Save** downloads each file; **Cancel render** stops the job.

## Signal path and alignment
```
stem → own chain (renderChain / AudioWorklet) → gain → pan (Web Audio equal-power law) → offset ─┐
                                                      sum of audible strips ←─────────────────────┘ → master chain → stem master
```
- **Latency:**
  - Every chain has the same constant latency (77 / 83 / 155 samples at 44.1 / 48 / 96 kHz), bypassed or processing, so stems with different chains stay sample-aligned live.
  - Offline, `renderChain` removes it per chain and for the master, so sample *n* of every export lines up with sample *n* of the session.
- **Parity:**
  - The live graph renders the same mix as the offline renderer. Measured in an `OfflineAudioContext` (per-stem chain worklets, strips, master output stage): the live output equals `renderStemMix` delayed by the start lead plus two chain latencies.
  - Each stem alone matches to 3e-8; the three-stem mix matches to **1.19e-7** (test limit 1e-4).
- **Pan law:**
  - Offline uses the Web Audio `StereoPannerNode` algorithm.
  - A stem's chain node has the stem's own channel count, so a mono stem stays mono into the panner and keeps the mono law (−3 dB per channel at centre).

## Export policy
| Topic | Policy |
| --- | --- |
| Sample rate | Rendering needs one rate for all stems and renders at that rate, never resampling. Mixed rates are refused with the rates named; playback still resamples them for listening |
| Channels | Mono and stereo stems; more channels are refused for rendering (they play as a downmix) |
| Length | Every file lasts as long as the session: the longest stem from its offset |
| Tails | A stem's chain keeps running after the stem ends (filter ringing, compressor and limiter release) until the session ends, as it does live. The session ends with its longest stem, whose own tail is not extended (the single-track export rule) |
| Mute / solo | Same rule as live. Muted or not-soloed stems are left out of the master and get no per-stem file; the report names them |
| Headroom and clipping | No normalisation, ever. The master goes through the master chain, so its limiter, when enabled, sets the ceiling. Per-stem files are written as they leave their strip; samples beyond full scale are clipped and counted per file |
| Sources | Only read. The session file's checksums show the exact bytes that were read |
| Errors | Undecodable files, mixed rates and unsupported channel counts end the render with a reason. Nothing is written, and the session and its settings stay as they were |

## Validation (developer evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| **Live vs offline parity:** a three-stem mix in an `OfflineAudioContext` (stereo keys, mono bass with an offset, mono vocal with its own EQ and an offset; gains and pans; master output stage) against `renderStemMix` on the same samples. Largest difference **1.19e-7** over 48,510 frames (mix peak 0.658), after aligning by the start lead plus two chain latencies (77 samples each) | PASS | `tests/e2e/stem-render.spec.js` (test 1), `evidence/playwright-stem-render.txt` |
| **Dialog workflow with the real worker:** <br>• vocal chain from a settings file; drums "Use master settings"; bass bypassed and muted; <br>• Render produces stem-master + drums + vocal files (bass named as not rendered), 4.000 s / 176,400 samples, 44.1 kHz stereo 24-bit; <br>• **the downloaded master and vocal stem equal a Node render of the same file bytes to 5.96e-8** (24-bit rounding); <br>• the session file holds each stem's SHA-256 (= the uploaded bytes), chain labels, no audio, < 64 KiB; <br>• recall restores the changed gain, mute and chain ("Recalled 3 of 3 stems and the master chain."); <br>• a 48 kHz stem makes rendering refuse with both rates named; <br>• no horizontal scroll at 360×780 | PASS | `tests/e2e/stem-render.spec.js` (test 2), `evidence/screenshots/` |
| **Renderer, 5 unit tests:** <br>• bypassed stems sum exactly with the Web Audio pan law (mono and stereo, both sides); <br>• a stem's own chain changes only that stem's strip, and processed and bypassed stems keep the same impulse position (latency compensated, master too); <br>• mute/solo routing as live; exact offsets; length = longest stem; <br>• no stems, mixed rates and 3-channel stems refused with reasons; inputs never modified; <br>• a short stem's chain tail runs to the session end, equal to a padded render | PASS | `evidence/vitest-stems-verbose.log` |
| **Session file, 3 unit tests:** round trip of every strip setting and chain; checksum matching with missing stems reported; newer, foreign, broken, out-of-range and bad-checksum files refused | PASS | same log |
| **Engine:** each stem gets a bypassed chain sized to its channels (mono → 1) and a checksum; `setChain` reaches the stem's live node | PASS | same log |
| LAS-34 stem tests rerun with LAS-35 (timing, routing, dialog) | PASS | `evidence/playwright-stem-render.txt` |
| `npm run check`: ESLint clean, Vitest 275/275 (20 files), build, Playwright 81/81. Run on the staged tree committed unchanged as `7fc3a59` | PASS | `evidence/npm-run-check-7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82.log`, `evidence/html-report-7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82.zip` |
| `npm run scan:artifacts`: 145 pieces, 0 findings | PASS | `evidence/scan-artifacts-7fc3a59ad01fa3e2ad4048b02bd5c73ab24e7d82.json` |
| Listening review of rendered stems; Mac/Chrome run | NOT_RUN | `manual-qa.md` |

## Defect found while building this slice
**Offline tails were cut at a short stem's end.**
- The first parity run differed by 0.025 just after the shorter stem ended: offline, each stem's chain was rendered only to the stem's own length, while live the worklet kept ringing.
- Fixed: each stem's chain now runs through to the session end, as it does live.
- A unit test checks the tail against a render of the stem padded with silence.

## Changed files
- New: `src/dsp/stem-render.js`, `src/stem-session-file.js`.
- Changed: `src/stem-session.js` (per-stem chain node, `setChain`, stem identity), `src/audio-engine.js` (stem chains, checksums), `src/StemsDialog.jsx` (chain controls, session save/load, render), `src/dsp/render.worker.js` (mode `stems`), `src/render-client.js`, `src/main.jsx`, `src/styles.css`.
- Tests: `tests/unit/stem-render.test.js`, `tests/unit/stem-session-file.test.js`, `tests/unit/audio-engine.test.js`, `tests/e2e/stem-render.spec.js`.

## Limitations
- Per-stem chains are set from the master settings or a file; there is no per-stem editor panel yet. Editing a stem's chain in detail means editing the mixer chain and pressing **Use master settings**, or loading a settings file.
- No resampling: stems at different rates must be converted before rendering.
- Per-stem files are offered for audible stems only.
- Each rendered file is downloaded on its own (no archive).
- Stem sessions are not stored in the account; the session file is the recall mechanism.
- No listening review has been run; the evidence is signal-level.
- Styling is provisional until the LAS-44/45 design gates. Linux Chromium only; not run on Mac/Chrome.
