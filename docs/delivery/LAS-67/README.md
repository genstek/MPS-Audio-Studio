# LAS-67 — Player: FF/RWD, timeline and stereo needle meters (behaviour)

Jira: [LAS-67](https://genstek69.atlassian.net/browse/LAS-67) · Sprint 10 package · Mode: IMPLEMENT behaviour; **visual design gated** (tape-deck vs compact hybrid is Gennady's choice in LAS-44/65; LAS-45 applies it)

Branch `delivery/LAS-40-sprint-10` · implementation commit `a915a54`, review fix `2c5d0ce` · tested application commit `2c5d0ce`

Developer status: **READY_FOR_QA** for behaviour (proposed) · visual selection **PENDING** · Gennady manual / listening QA: **NOT_RUN**

## Behaviour (as proposed in the package, now implemented)
| Control | Behaviour |
| --- | --- |
| **RWD ◀◀ / FF ▶▶** (transport, either side of Play/Pause/Stop) | Click, Enter or Space: −5 s / +5 s. Hold the pointer: one step at once, then after 400 ms a step every 200 ms (**25 s per second of hold**). Clamped at 0 and at the end. Works while playing (the one source restarts at the new place) and while paused/stopped (cues the next Play). Navigation only — audio never plays backwards. Accessible names "Rewind 5 seconds", "Fast forward 5 seconds". |
| **Timeline** (Tracks footer, replaces "Waveform & seeking coming soon") | Seekable range with a time ruler (0, ¼, ½, ¾, end). Pointer: drag shows the target, release seeks. Keyboard: ←/→ 1 s, Page Down/Up 10 s, Home start, End end. `aria-valuetext` "0:13.0 of 0:30.0". |
| End of track | Seeking to the end while playing ends playback like the natural end (Stopped, 0:00). Play from the end starts again at 0. |
| Empty / loading | RWD, FF and the timeline are disabled until a track is loaded and while loading; the meters rest. |
| Replace / Remove | Safe during rapid seeking: one source at most (probe), no page errors. |

Elapsed/total time and state stay in the transport (`role=timer`, `role=status`, LAS-9). Single-track transport only; the stem session keeps its own transport (LAS-34).

## Meters and spectrum
**Measurement tap:** the LAS-68 monitor bus — what is sent to the speakers **after** the Original/Processed switch, loudness matching and Master Level. So the meters follow A/B and the output level, and mute shows silence. Mono tracks appear on both sides.

| Display | What it measures | Ballistics / scale |
| --- | --- | --- |
| **L / R needle meters** ("VU-style") | RMS of the last 2048 samples per channel | 65 ms exponential smoothing (99 % of a step in ≈ 300 ms, VU-like); dial in **dBFS RMS** from −40 to 0, red above −6. **Not a calibrated or standards-compliant VU meter.** |
| **L / R bars** (footer) | RMS (bar) and sample peak (hold line, held 1.5 s then falling 20 dB/s) | dBFS, −60 to 0; readout of the held peak |
| **CLIP** | a sample at or beyond 0 dBFS reached the speakers | latches until clicked ("Clipping detected at the output; reset") |
| **Spectrum** | the monitor bus analyser (4096-point FFT, smoothing 0.75) | 20 Hz–20 kHz log axis (50, 100, 500, 1k, 5k, 10k), level 0 to −100 dB (0, −30, −60, −90 labels); caption says "no signal" when nothing plays |

Readings run about 30 times a second only while audio plays or while the meters are falling back; when everything has come to rest the loop stops. Needles and spectrum are signal information, so they keep updating under reduced motion; there is no decorative animation (no reels). Placement: needles and spectrum sit beside the track details when the Tracks area is at least 44 rem wide; on narrower desktops only the footer bars and CLIP are shown (essential level information stays visible without page scrolling); on phones (≤ 760 px) the needles and spectrum stack below the track details.

## Validation
| Criterion | Check | Result | Evidence |
| --- | --- | --- | --- |
| Play/Pause/Stop preserved, no duplicate sources | rapid RWD ×8 while playing: one source playing, at most one ever; LAS-9/11 suites | PASS | `tests/e2e/player.spec.js`, `transport-position.spec.js`, `pause-toggle.spec.js` |
| FF/RWD ±5 s, hold rate, clamping | 5.0 / 10.0 / 5.0 / 0.0 s; held ≈ 1 s → 15–25 s; held to the end → 0:30.0 | PASS | `player.spec.js` |
| Timeline pointer and keyboard while playing and paused | ←×3 = 3.0 s, PageUp = 13.0 s, Home, pointer at middle ≈ 15 s; state kept | PASS | same |
| Empty / end-of-track / replace / unload | disabled without a track; End while playing → Stopped 0:00; Play from end → 0; replace/remove during seeking safe | PASS | same |
| L/R needles and bars from real output | −12 dBFS sine: needle −15 ± 1 dBFS RMS, bar peak ≥ −13; L-only → right at rest; R-only → left at rest; mono L = R; Master −12 dB → needle 11+ dB lower; silence → rest | PASS | same |
| Clip indication | processed (limiter) no clip; original full-scale square → CLIP latched; click resets | PASS | same |
| Real spectrum, truthful idle | canvas painted while playing; "no signal" after pause | PASS | same |
| Stable playback / CPU | longest frame gap over 2 s of playback with all meters: ≈ 17 ms alone; up to ≈ 100 ms with four test workers sharing the CPU; assertion: no freeze (< 250 ms) | PASS | annotation in the report |
| Engine seek | single source restarted at the target; paused cue; clamps; NaN → 0 | PASS | `tests/unit/audio-engine.test.js` |
| Responsive, no LAS-48/51 regressions | RWD, FF and the timeline added to the "essential controls" lists of both layout suites; full matrix; 360 px phone fit | PASS | `LAS51-layout.spec.js`, `LAS48-coverage.spec.js`, `player.spec.js` |

## Defects found and fixed
- A 360 px phone with edited processor cards scrolled sideways: the LAS-63 "edited" tag did not wrap (found by the LAS-33 preset test's phone check). Strip titles now wrap; a regression test covers it.
- **Held FF walked on after the end** (Cursor Bugbot on PR #45): holding FF while playing through the end stopped playback (position 0), but the held button kept seeking, so the position moved again while Stopped. `seek()` now reports when it is at either end and a held button stops repeating there; `player.spec.js` holds FF through the end while playing and expects Stopped at 00:00.0 — `2c5d0ce`.
- **Main-thread long tasks while playing** (found by the LAS-26 test in the full regression: a 212 ms task, bound 200 ms). Long-animation-frame attribution showed whole-studio React renders of 30–60 ms every 100 ms: the playback position was App state, and Sprint 10 made the App larger. Baseline `0296386` had no long tasks in the same scenario. The position now lives in a small store that only the clock and the timeline read, and the spectrum takes its canvas size from a ResizeObserver instead of reading layout every frame. Same scenario after the fix: 0 long tasks in 3 runs — `2c5d0ce`.

## Limitations
- Visual styling is provisional: the two player proposals (tape deck with dual needles; compact hybrid) are in `docs/design/LAS-44/studio-proposals.html` for Gennady's selection. No reel animation.
- The needles are an RMS approximation with VU-like timing; not a calibrated VU or PPM.
- Hardware output was not measured (no audio device in this container); meters read the samples sent to the destination.
- Manual QA: [`manual-qa.md`](manual-qa.md) — **NOT_RUN**.

## Evidence on the tested commit `2c5d0ce`
- Test results: [`evidence/test-log-2c5d0ce.txt`](evidence/test-log-2c5d0ce.txt), an extract of [`../sprints/10/final/`](../sprints/10/final/). The full `npm run check` exited 0: Playwright 119/119 and Vitest 313/313.
- Screenshots (Chromium 153, headless, synthetic tone; the viewport is in each file name): [`player-playing-1280x720.png`](evidence/player-playing-1280x720.png), [`player-playing-1440x900.png`](evidence/player-playing-1440x900.png), [`player-playing-360x780.png`](evidence/player-playing-360x780.png)
- Records: [`results.json`](results.json) · [`jira-update.md`](jira-update.md) · [`manual-qa.md`](manual-qa.md) (**NOT_RUN**)
