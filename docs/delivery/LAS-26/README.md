# LAS-26 — Analyze WAV loudness, true peaks, spectrum, dynamics and stereo behavior

Jira: [LAS-26](https://genstek69.atlassian.net/browse/LAS-26) · Work order: `docs/claude-code/2026-10-29/tasks/LAS-26.md` · Mode: IMPLEMENT · Prerequisites: baseline (LAS-8 import, LAS-9 transport)

Branch `feat/LAS-26-analysis` · tested application commit `a21e687624ae867b1b957256498552f9e2e0c430` (the application code is identical to `d8143f0`, where the screenshots, the FFmpeg cross-check and the performance numbers were taken; `a21e687` changes only unit-test titles)

Developer status: **READY_FOR_QA** · Gennady manual QA: **NOT_RUN** · Jira sync: **SYNC_PENDING**

## What the user gets
With a track loaded, **Analyze** in the Tracks heading opens *Track analysis*. The file is measured on this device, in a Web Worker, from the file's own samples at its own sample rate. The report shows:

| Group | Measures |
| --- | --- |
| Loudness | integrated loudness (LUFS), loudness range (LU), max momentary (400 ms) and max short-term (3 s) loudness |
| Peaks | true peak (dBTP, 4× oversampled), sample peak (dBFS), labelled separately |
| Dynamics | RMS (dBFS), crest factor (sample peak − RMS), peak-to-loudness ratio (true peak − integrated), DC offset per channel, clipping (full-scale runs of 3+ samples) |
| Stereo (stereo files only) | L/R correlation, side relative to mid, balance (left − right), loudness change when folded to mono |
| Spectrum | share of energy and relative level per octave band, 31.5 Hz – 16 kHz |
| Metadata | algorithm version `mps-analysis-1`, sample rate, mono/stereo, bit depth/encoding, segment (whole file), source SHA-256 |

States are labelled instead of giving numbers: *silent* (nothing above the −70 LUFS gate), *too short* (under 0.4 s), *needs 3 seconds* (short-term loudness), *mono file* (no stereo measures), *cancels to silence* (mono fold-down of inverted channels), *below −90 dB* (octave bands dominated by window leakage/quantisation noise).

Closing the dialog does not stop a running analysis — the transport stays usable and reopening shows progress or the result. **Cancel analysis**, a new track or **Remove track** stop it; a late result of a replaced file is discarded.

## Measurement definitions (reference implementation `src/dsp/`)
- **Integrated loudness** (`loudness.js`): ITU-R BS.1770-4. K-weighting (high-shelf + high-pass) is derived from the standard's analogue prototype for every sample rate; at 48 kHz it equals the printed coefficients (unit test to 1e-8). Mean square per channel, channel weights 1.0 (mono and L/R). 400 ms blocks every 100 ms; absolute gate −70 LUFS, relative gate −10 LU (EBU R128). `LUFS = −0.691 + 10·log10(Σ mean squares)`.
- **Loudness range**: EBU Tech 3342 — 3 s short-term windows every 100 ms, gates −70 LUFS absolute and −20 LU relative, LRA = 95th − 10th percentile.
- **Momentary / short-term max**: largest 400 ms / 3 s window loudness (ungated).
- **Sample peak**: largest absolute sample value, 20·log10, dBFS.
- **True peak** (`true-peak.js`): BS.1770-4 Annex 2 method — 4× oversampling with a 24-tap Kaiser-windowed (β = 6) sinc per interpolation point (¼, ½, ¾ of a sample), maximum absolute value of original and interpolated points, dBTP. Samples before the start and after the end count as silence (as on playback), so an abrupt start/end at high level reads above its sample peak — that overshoot really happens on a converter.
- **RMS**: mean square over all samples and channels, dBFS (a full-scale sine reads −3.01 dBFS). **Crest factor** = sample peak − RMS. **PLR** = true peak − integrated loudness. **DC offset** = mean sample value per channel (shown in % of full scale).
- **Clipping**: samples with |x| ≥ 32767/32768; a run is 3+ consecutive such samples. Isolated full-scale samples are reported separately.
- **Stereo** (`analysis.js`): Pearson correlation of mean-removed L and R; side/mid = 10·log10(Σside²/Σmid²) with mid = (L+R)/2, side = (L−R)/2; balance = 10·log10(ms(L)/ms(R)); mono change = integrated loudness of the mono fold-down (played on both channels) − stereo integrated loudness.
- **Spectrum**: average power of Hann-windowed 8192-point FFT frames (half overlap, at most 512 frames spread evenly over the file), summed into octave bands (centre/√2 … centre·√2); share = band energy / total, level = 10·log10(share).

## Validation and tolerances (developer evidence)
| Check | Expected (source) | Tolerance | Result |
| --- | --- | --- | --- |
| EBU Tech 3341 tests 1–4 (1 kHz tones, relative and absolute gate) | −23 / −33 / −23 / −23 LUFS (specification) | ±0.1 LU | PASS |
| Same −23 dBFS tone at 44.1 and 96 kHz | −23 LUFS | ±0.1 LU | PASS |
| EBU Tech 3342 tests 1–4 | LRA 10 / 5 / 20 / 15 LU (specification) | ±1 LU | PASS |
| K-weighting at 48 kHz | BS.1770-4 printed coefficients | 1e-8 | PASS |
| Intersample peak: 12 kHz sine at 45° (samples at −9.03 dBFS) | −6.02 dBTP | ±0.05 dB | PASS |
| True peak, 997 Hz – 20 kHz, five phases | exact waveform at quarter-sample points | ±0.05 dB | PASS |
| Mono, silence, impulses, clipping, inverted/uncorrelated/unbalanced stereo, segment, reproducibility, input unchanged | see `tests/unit/analysis.test.js` | per test | PASS |
| WAV decoding: PCM 8/16/24/32, float 32/64, extensible, LIST chunks; 9 corrupt/unsupported cases | `tests/unit/wav-decode.test.js` | exact / one LSB | PASS |
| **Independent tool:** FFmpeg 6.1.1 `ebur128=peak=true+sample` on 6 fixtures (EBU tones, programme-like noise stereo 44.1 kHz and mono 96 kHz, intersample peak, chord with tremolo) — 24 comparisons | FFmpeg values (printed to 0.1) | I ±0.15 LU, LRA ±0.6 LU, SP ±0.06 dB, TP ±0.25 dB | PASS — largest differences I 0.04, LRA 0.025, SP 0.032, TP 0.096 (96 kHz) |

Evidence: [`evidence/vitest-analysis-verbose.log`](evidence/vitest-analysis-verbose.log), [`evidence/crosscheck-ffmpeg.md`](evidence/crosscheck-ffmpeg.md) / [`.json`](evidence/crosscheck-ffmpeg.json) (`npm run crosscheck:analysis <folder>`; FFmpeg is a development tool only, not a dependency).

Browser checks (`tests/e2e/analysis.spec.js`, Chromium 141): the −23 dBFS tone reads −23.0 LUFS / −23.00 dBTP / −23.00 dBFS in the UI, identical on a second run, SHA-256 equals the file on disk and the file is unchanged; a two-minute stereo file analysed with **0 main-thread long tasks** (unheld run 3.97 s under the suite's load), cancel/retry, closing the dialog while it runs and playing meanwhile; replacing the track discards the old result; a 4-channel file fails with a clear message and playback keeps working; the Tracks heading fits from 320 to 1280 px (fails without the CSS change: [`evidence/heading-fit-without-css-fix.log`](evidence/heading-fit-without-css-fix.log)). These prove wiring and responsiveness, **not** measurement accuracy — that is the unit tests' and the cross-check's job.

Performance (`evidence/performance.txt`, Node 22, this container): two minutes of stereo 48 kHz noise in 3.2 s (9.1 s before the optimisation commit `9e779be`). A 100 MiB file (~9.7 min of 16-bit stereo 48 kHz) is therefore expected around 15–20 s here; progress is shown and it can be cancelled.

## Demo
1. `npm install`, `npm run dev`, open http://127.0.0.1:5173.
2. Import a WAV (e.g. a 1 kHz tone at −23 dBFS) → **Analyze** → read the report; **Analyze again** gives the same numbers.
3. Import a long WAV → **Analyze** → **Cancel analysis** → **Try again** → close the dialog → **Play** → reopen.

## Changed files
`src/dsp/{biquad,loudness,true-peak,fft,analysis,wav-decode,analysis.worker}.js`, `src/analysis-client.js`, `src/AnalysisDialog.jsx`, `src/main.jsx` (Analyze button), `src/styles.css`, `scripts/crosscheck-ffmpeg.js`, `package.json` (`crosscheck:analysis`), `tests/unit/{analysis,wav-decode}.test.js`, `tests/fixtures/{signals.js,wav.js}` (`makeWav` gains `frequency`/`dbfs`; the default file stays byte-identical, checked by SHA-256), `tests/e2e/analysis.spec.js`, `tests/e2e/helpers/analysis-probe.js`.

## Decisions
- **Own decoder, source rate.** `decodeAudioData` resamples to the playback rate (44.1 kHz in this container), which would change true peak and spectrum. The worker parses PCM/float WAV itself; the same validation rules as the server's WAV inspector.
- **Web Worker, terminate to cancel.** Reading, hashing, decoding and measuring all happen off the main thread; cancel = `worker.terminate()`.
- **4× true peak per BS.1770-4.** Like every 4× meter it can read a crest between quarter-sample points low, by up to 20·log10(cos(π·f/(4·fs))): 0.17 dB at 12 kHz, 0.47 dB at 20 kHz for 48 kHz audio. Documented, tested as a bound.
- **Visual design is provisional** — it reuses the existing dialog styling until the LAS-43/LAS-44 design decisions.

## Limitations
- Whole-file analysis only in the UI (the `analyze()` function supports segments and reports their bounds).
- Mono and stereo only; 3+ channel files are refused with a message (they still play).
- PCM 8/16/24/32-bit and float 32/64-bit WAV only; other codecs are refused. Files over 100 MiB are refused at import.
- The whole file is held in worker memory (about 4× the PCM size as Float32 plus a padded copy for true peak).
- Measured on Linux Chromium 141 only; Mac/Chrome and listening checks are Gennady's manual QA.
- A Playwright `setInputFiles` path containing “−” (U+2212) delivered no file in this harness; the test title uses ASCII. This affects only test output folder names, not users.
