# Sample rate, bit depth and SRC — Product/DSP/QA specification

Status: requirements proposal; **not a claim that UI or DSP is already implemented**.
Scope: audio import, device playback, stem sessions, processing, offline WAV export, analysis and project persistence.

## Correct conceptual model
- Sample rate 48,000 Hz means 48,000 PCM samples **per channel** each second. 96,000 Hz doubles that; the ideal Nyquist limits are 24 and 48 kHz respectively, subject to reconstruction/anti-alias filtering.
- A proper 48→96 kHz conversion is **band-limited interpolation**, not 'recoding' that creates previously absent high-frequency source content or improved recorded detail.
- 24-bit has greater storage/processing headroom than 16-bit; converting an already recorded 16-bit signal to 24-bit does not recover lost quantization information.
- A WAV is a container; 'WAV HD' is marketing shorthand, not a new technical encoding standard.
- Some nonlinear effects benefit from localized oversampling to reduce aliasing. A whole project forced to 96 kHz is not an automatic upgrade; test the DSP implementation first.
- Resampling is not pitch shifting or time stretching: preserve duration, timing, channel identity and perceived musical content.

## Functional requirements
**SRC-01 Import provenance:** Store and display original header sample rate, PCM bit depth, channels, frame count and duration. Preserve original file unchanged. Distinguish file rate from audio-context/device rate and output rate.

**SRC-02 Project audio rate:** Make the rate used by the DSP graph explicit in project metadata; avoid silently altering the rate on reopen. For web audio, report the actual AudioContext rate and account for browser-imposed sample-rate behavior instead of assuming every device can run at a requested rate.

**SRC-03 User export choice:** Offer 44.1, 48 and 96 kHz PCM WAV (24-bit, and 16-bit with appropriate final dither) only once high-quality SRC and independent validation exist. Default to source/project rate. Make duration, estimated size, conversion status and 'upsampling cannot restore source detail' clear.

**SRC-04 Converter:** Use a deterministic band-limited quality resampler for offline output, e.g. polyphase windowed-sinc or a license-reviewed and technically appropriate library. Support rational factors including 44.1↔48 and 48↔96, multi-channel phase-aligned conversion. Do not treat duplicating samples or linear interpolation as a mastering-quality replacement.

**SRC-05 DSP order:** Use consistent live/offline parameter snapshots. Perform SRC at a documented, singular boundary; do not unknowingly resample a decoded stream multiple times. For nonlinear processors, provide internal oversampling with proper up/down filters and latency compensation, separate from export-rate selection.

**SRC-06 Output quality:** No unintended clipping, channel swap, timestamp drift, clicks at boundaries or truncated tails; measure exported PCM true peak (not only sample peak). Keep normal offline export responsive/cancellable and avoid UI-thread heavy conversion.

**SRC-07 Dither:** Apply TPDF dither only when reducing to a lower integer PCM word length as the last appropriate stage. Do not add repeated dither when changing sample rate or simply representing a 16-bit source as 24-bit PCM.

**SRC-08 UI and project:** Show 'Original 48 kHz → Processing 48 kHz → Export 96 kHz' (real values, not hardcoded). Save export choices in versioned project settings with backwards-compatible migration. Do not mislabel 96 kHz as objectively superior.

**SRC-09 Export verification:** Analyze the final WAV header/PCM independently of the application pipeline; log algorithm settings, frame counts, channel count, sample peak, true peak, loudness and conversion ratio.

## QA acceptance scenarios
1. Import synthetic mono and stereo files at 44.1/48/96 kHz with PCM 16/24-bit; assert header metadata, duration and channels.
2. Export 48→96 kHz and 96→48 kHz. Assert exact target sample-rate header, expected frame count (within documented rounding), equal musical duration, no speed/pitch change, and no NaN/Inf.
3. Export 44.1↔48 kHz with a deterministic tone/sweep/multitone, check amplitude/frequency response, stopband attenuation and alias levels against fixed, *documented* thresholds after selecting the converter.
4. Roundtrip 48→96→48, compare time-aligned audio with latency compensation and publish error metrics; set tolerances consistent with filter design and near-Nyquist limitations.
5. Verify left/right channel alignment and phase/correlation on wide and mono signals; confirm mono content remains mono.
6. Reanalyze independent true peak, integrated LUFS and LRA, and verify no unexpected gain changes or ceiling breach, including intersample overs.
7. Test transient impulses, silence, DC, near-full-scale peaks, clipped and corrupt files, empty input and very large stem sessions.
8. Verify dither behavior and integer quantization at 16- and 24-bit export. Ensure no cumulative dither on repeated processing.
9. Run live/offline parity and project save/reopen at supported device rates; log actual AudioContext rates on browser/OS combinations.
10. Manual level-matched A/B: 48 kHz native vs 96 kHz resampled and 96 kHz nonlinear-processing trials. Never use louder playback as evidence of quality.

## Delivery plan
P0: metadata provenance + independent rate reporting + deterministic fixtures and baseline measurements.
P1: high-quality offline SRC engine with cancellable export, UI option and automated header/audio tests.
P2: selective oversampling for nonlinear DSP, user-facing quality settings and profile/realtime CPU benchmarks.

Architecture fit: prefer modules under src/dsp/, with one validation/schema path; integrate with existing render worker and worklet parity model. Do not hardwire a browser AudioContext change as the only 96 kHz solution. Review license if adding SoXR or another resampling library.

## Definition of done
Code and UI implemented, schema migrations tested, synthetic fixtures committed, algorithm and numerical tolerances documented, actual exported WAV independently analyzed, memory/CPU verified, a non-technical explanation shown in UI, and reviewer-approved level-matched listening comparison. Never claim 'hi-res enhancement'.
