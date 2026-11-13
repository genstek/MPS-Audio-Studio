# DSP research knowledge log — 2026-11-13

Scope: research/test proposals only. **No production DSP changes, no Jira issues, no validation of current implementation.** Sources are established technical publications; novelty here is their application to MPS acceptance tests, not a claim of new publication. Reviewed against README description of LAS-127; existing prior research log not found at two checked paths. Thresholds marked *proposed* must be approved and measured against independent reference implementations.

## 1. ITU-R BS.1770-5 (2023-11-22): programme loudness and true peak
URL: https://www.itu.int/rec/R-REC-BS.1770-5-202311-I
Confidence: high for normative measurement definitions; unverified for MPS implementation.
Confirmed: K-weighted channel-dependent loudness, gating, and oversampled true-peak detection are distinct from sample peak. Oversampled meter at >=192 kHz is described for dBTP.
Limit: specification defines measurement, not a universally correct mastering target or guaranteed reconstruction of every analogue output.
DSP requirement proposal: expose integrated LUFS, sample peak and true peak separately; A/B loudness matching must measure both outputs over the same selection with the same gate, and apply reversible monitor-only gain, never alter source/master exports.
QA fixture: stereo 48 kHz WAV with known calibration tone, silence segments, inter-sample peak stress signal, plus independent BS.1770 reference outputs.
Steps: measure full file, repeat after inserting silence, compare sample-peak vs TP, toggle A/B matching and export.
Expected: reproducible LUFS within proposed ±0.2 LU of independently validated reference; TP within proposed ±0.2 dB; exported samples identical with monitor A/B toggled. Pass only if all; fail on clipping, gate mismatch, export mutation.
Edges: all silence/undefined LUFS, mono, anti-phase stereo, short clips, 96 kHz, NaN/Inf input.

## 2. EBU Tech 3341 (2023-11-21): EBU Mode loudness metering
URL: https://tech.ebu.ch/publications/tech3341
Confidence: high for published meter behavior.
Confirmed: standardizes momentary (400 ms), short-term (3 s), integrated and meter test signals; published revision notes test signals and LRA stability indicator.
Limit: metering accuracy does not by itself imply perceptual equality of two masters.
DSP requirement proposal: distinguish M/S/I displays; reset meter state on new playback analysis and avoid carrying old programme statistics into next track.
QA fixture: official EBU minimum-requirement test signals and 400-ms/3-s stepped-level fixture.
Steps: play/analyze each signal, check M/S/I versus supplied reference, reset and load new file, compare chunked vs single-pass analysis.
Expected: conform to official tolerances for each fixture; no old-track state contamination. Fail if official reference test fails or analysis differs across chunk boundaries beyond defined numeric tolerance.
Edges: shorter than 3 s, silence, seeks, paused playback, channel layout changes.

## 3. AES AESTD1008.1.21-9 (2021-09-24): streaming loudness
URL: https://aes.org/community/technical-council/technical-document-aestd1008/
Confidence: high for scope and recommendations, medium for applicability to a particular distributor.
Confirmed: recommendations cover streaming/on-demand loudness consistency, dynamic range, metadata and peak control; document supersedes AES TD1004.
Limit: guidance targets distribution; platform-specific normalization is not universal and codec output may overshoot pre-encode peaks.
DSP requirement proposal: delivery profiles must be explicit and configurable, not silently force all music to one LUFS; provide separate pre-encode TP and post-codec verification stage where codecs exist.
QA fixture: master near configured ceiling, high-frequency transient, AAC/Opus encoded and decoded references.
Steps: measure PCM, encode/decode via fixed codec version, measure decoded TP and loudness, verify warnings and no hidden destructive gain.
Expected: report differences and warn when selected profile ceiling is exceeded; no promise that pre-encode -1 dBTP guarantees decoded ceiling. Pass if warnings reflect reference; fail if only sample peak is checked.
Edges: limiter disabled, mono, album/track modes, codec variants, 16/24-bit export.

## 4. libsoxr primary engineering documentation (copyright 2007–2018; repository file undated)
URLs: https://github.com/chirlu/soxr/blob/master/README ; https://github.com/chirlu/soxr/blob/master/src/soxr.h
Confidence: high for API capabilities and documented latency, medium for general performance claims.
Confirmed: configurable phase, passband, stopband and precision; HQ 44.1→48 kHz can incur ~1000 output samples (~20 ms) latency. API reports delay and clip count; one-shot default differs from streaming default (LQ vs HQ).
Limit: library properties do not establish MPS Kaiser resampler correctness; upsampling 48→96 kHz adds no original spectral information.
MPS context: README says LAS-127 uses polyphase Kaiser windowed sinc, ~100 dB stopband, preserves pitch/duration and round(frames*ratio), and exports 96k/24bit. This is a claim in documentation, NOT verified by this research run.
DSP requirement proposal: validate existing LAS-127 against independent high-quality reference and explicit spectral tolerances, not replace algorithm without evidence; document output bit depth and dithering policy separately from sample rate.
QA fixture: 44.1/48 kHz multitone, 0.9 lower-Nyquist sweep, out-of-band chirp for downsampling, impulse, DC, stereo anti-phase, 1-sample and 1,000,001-sample WAV.
Steps: convert 44.1→96, 48→96, 96→48, 96→44.1; inspect WAV header, exact frame count, frequency response, aliases, stereo phase, impulse latency and clipping; compare whole-file and chunked outputs.
Expected: frames=round(N*out/in) per MPS documented contract; preserved duration/pitch; proposed passband ripple <=0.1 dB in specified band and alias attenuation >=90 dB for controlled fixture (engineering proposal, not confirmed MPS capability); 24-bit PCM is actual encoded format, not a metadata label. Fail on wrong header, dropped frames, phase mismatch or spectral threshold breach.
Edges: non-integer ratio, end-of-stream flushing, >1GiB guard, low memory, 16-bit source, zero-length input.

## Cross-source synthesis and hypotheses
**Confirmed by publications:** BS.1770 defines a measurement framework; EBU supplies meter requirements; AES offers delivery guidance; libsoxr documents filter tradeoffs and latency.
**Hypotheses requiring MPS experiments:** ±0.2 LU/dB meter agreement; 0.1 dB ripple; 90 dB alias rejection; LUFS matching alone yields perceptually fair A/B (it may not for different spectra/transients).
**Next test proposals:** prioritize independent loudness/TP oracle, A/B non-destructive monitor gain, LAS-127 spectral regression and frame-count tests. Mid/Side/mono stem tests remain a next-cycle research topic, not presented as newly validated here.
