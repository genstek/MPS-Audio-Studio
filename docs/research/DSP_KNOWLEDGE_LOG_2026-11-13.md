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


---

## Research cycle 2026-11-20 — additional sources (not implementation verification)
Checked against entries 1–4 above: no repeated source. Dates below are publication dates, not dates of new discoveries. **No MPS code was executed.** All numerical acceptance thresholds labelled PROPOSED require baseline/oracle validation.

### 5. W3C Audio EQ Cookbook — 2021-06-08
Primary: https://www.w3.org/TR/audio-eq-cookbook/
Confidence HIGH for published coefficient equations; MPS applicability CONDITIONAL (must first identify its actual EQ implementation).
Evidence/method: Robert Bristow-Johnson's biquad analog prototypes transformed using bilinear transform with frequency prewarping; defines peaking, shelves, low/high-pass, notch, all-pass, and Q/BW/S parameter semantics. Analytic property: equal peaking boost and cut with same Q and f0 ideally cancel in cascade; NOT a measured MPS result.
Limits: not a numerical-stability or click-free automation guarantee; finite precision, coefficient smoothing, cascaded gain and high-frequency warping require independent tests.
DSP proposal: document EQ filter type, sample-rate-specific coefficients and Q definition; ensure parameter changes do not mutate unrelated modules; protect against unstable/invalid coefficients.
QA EQ-01 fixture: 48k and 96k float stereo impulses, 1 kHz -18 dBFS sine, 20 Hz–20 kHz logarithmic sweep; independent RBJ coefficient oracle.
Steps: render peak +6 dB at 1 kHz Q=1; render matching -6 dB in cascade; FFT/transfer-function compare, then automate f0/Q/gain over block boundaries.
Expected: peak center gain +6 dB; inverse cascade near unity in static state. PROPOSED pass: center error <=0.1 dB, inverse response <=0.1 dB over 30 Hz–18 kHz after settling; no NaN/Inf or out-of-range coefficients. Fail on excess error, runaway signal, or unrelated Dynamics/Limiter parameter changes. Edge: f0 near Nyquist, Q extremes, zero gain, silence, 1-sample buffers, rapid changes, bypass and Undo/Redo. Relates to reported EQ slider/Undo-Redo cross-module bug; not proof of cause.

### 6. ITU-R BS.2051-3 — 2022-05
Primary: https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.2051-3-202205-I%21%21PDF-E.pdf
Confidence HIGH for defined loudspeaker layouts and labels; MEDIUM relevance to future multichannel/stem routing.
Evidence/method: normative sound-system loudspeaker configurations and channel positions; recommendation notes 100 microsecond alignment accuracy at central listening position when speakers are not on a sphere. This is a playback alignment recommendation, NOT a mono compatibility pass criterion.
Limits: multichannel speaker layout standard does not define a universal stereo Mid/Side width algorithm or guarantee mono compatibility.
DSP proposal: make channel mapping explicit and reversible; never silently reinterpret stereo M/S as surround channels. For stereo define M=(L+R)/2, S=(L-R)/2 and reconstruct L=M+S, R=M-S; mono fold-down policy must be explicit.
QA MS-01 fixture: stereo identical L=R, anti-phase L=-R, L-only impulse, decorrelated stereo noise, 11-stem synchronized 48k set (if accessible and authorized).
Steps: encode M/S, decode, sum to mono, measure sample residual and RMS per fixture, then change width and compare fold-down.
Expected: identical stereo S=0; anti-phase M=0; M/S roundtrip reproduces L/R. PROPOSED pass: float64 roundtrip max absolute error <1e-12 for finite inputs within [-1,1]; anti-phase mono cancellation within numerical floor. This is not a subjective quality threshold. Fail on channel swaps, unintended gain, hidden polarity inversion. Edges: zero/one-sample stems, unequal stem lengths, channel layout metadata, nonfinite samples, 24-bit export quantization, near-zero RMS correlation undefined. Note: mathematical M/S identities are independent of BS.2051 and are recorded as engineering test design, not a normative requirement of this recommendation.

### 7. Julius O. Smith III, Physical Audio Signal Processing — Windowed Sinc Interpolation (online book, page undated; checked 2026-11-20)
Primary: https://www.dsprelated.com/freebooks/pasp/Windowed_Sinc_Interpolation.html
Confidence HIGH for sampling theory and algorithmic derivation; MPS performance UNKNOWN.
Evidence/method: sampled-signal reconstruction by sinc interpolation, finite window approximation and cutoff reduction when downsampling to avoid aliasing. Derived compute-cost dependence on higher of input/output rates and extra boundary samples required for convolution. No measured benchmark for MPS.
Limits: ideal sinc is infinite; practical filter length/window trades stopband rejection, transition bandwidth, latency and ringing. 48→96k does not recover information absent from 48k source.
DSP proposal (LAS-127): document passband/stopband, boundary policy, delay compensation and exact frame-count contract separately; test downsampling as well as 96k export; keep 24-bit PCM encoding/dither separate from sample-rate conversion.
QA SRC-02 fixture: 44.1/48/96k impulses at first/middle/last sample, 1 kHz sine, passband sweep, 30 kHz sine at 96k for 96→48 alias test, 1,000,001-frame stereo file; independent offline high-quality reference.
Steps: convert 44.1→96, 48→96, 96→48, 96→44.1 in whole-buffer and random-sized chunks, flush tails, inspect PCM header, duration, FFT alias and endpoint impulse energy.
Expected: documented frame count round(N*Fo/Fi), correct header and no dropped tail; PROPOSED pass: passband ripple <=0.1 dB within *specified* band and out-of-band rejection >=90 dB for controlled test, after excluding transition band and window leakage. Fail on wrong length, unexplained latency shift, >threshold aliases, missing tail or channel divergence. Edges: 0/1 samples, noninteger ratios, DC, near Nyquist, nonfinite input, large files, dither on/off. These thresholds are engineering hypotheses, not sourced MPS measurements.

### 8. AES17:2020 — Measurement of digital audio equipment (2020-11-21)
Primary catalog: https://www.aes.org/publications/standards/search.cfm?docID=21
Publisher status: https://aes.org/standards/standards-development/project-status/
Confidence HIGH for scope/date; LIMITED for detailed normative tolerances (full paid text not accessed).
Evidence/method: AES standard methods for specifying and verifying digital-audio equipment performance. Current AES standards committee status lists AES17:2020 under review. Do not infer exact standard tolerances from catalog abstract.
Limits: some equipment measurement conditions are hardware-specific; not all are appropriate for software DSP. This is not a substitute for BS.1770 loudness/TP.
DSP proposal: establish repeatable independent measurement harness for gain, noise, distortion, clipping and export bit depth, with clearly defined stimulus/reference and measurement bandwidth.
QA MEAS-01 fixture: 48/96k 24-bit PCM silence, -20 dBFS 997 Hz sine, near-full-scale sine, low-level dithered sine, independent measurement tool/version.
Steps: import/export bypass; measure gain, noise floor, THD+N, PCM format and compare with fixture/reference; repeat with EQ bypass and enabled.
Expected: bypass is sample-preserving if contract says lossless, otherwise bounded by declared dither/quantization; correct 24-bit PCM container. PROPOSED pass: gain error <=0.05 dB for steady tone, no unexpected clipping or NaN; THD+N threshold TBD from validated baseline, not asserted as AES17 compliance. Fail on format mismatch or undocumented signal alteration. Edges: 16→24-bit padding, 24→16-bit dither, mono/stereo, denormals, silence, intersample peak. Do not claim AES17 compliance until licensed full standard and test method are reviewed.

### Consolidated evidence / next actions
Verified external claims: W3C RBJ equations and filter definitions; ITU multichannel layout recommendation; Smith's windowed-sinc derivation; AES17:2020 scope and active review. No empirical measurements of MPS were performed.
Hypotheses: ±0.1 dB EQ response, 1e-12 M/S roundtrip float64, <=0.1 dB SRC ripple, >=90 dB SRC rejection, <=0.05 dB gain error. These are provisional engineering thresholds, not published performance claims.
Priority test proposals: (1) EQ module isolation and Undo/Redo regression; (2) stereo M/S/mono fixtures for future stem workflow; (3) LAS-127 chunk-boundary, anti-alias and output-format checks; (4) reproducible measurement harness. No production DSP changes or Jira issues authorized.


---

## Research cycle 2026-11-27 — stem integrity and final quantization
Compared with entries 1–8; both sources are new to this journal, not newly published. No MPS execution or Jira changes. All acceptance tolerances below are proposals.

### 9. Le Roux et al., SDR — Half-baked or Well Done? (ICASSP May 2019; preprint 2018-11-06)
Primary full text: https://arxiv.org/pdf/1811.02508 ; DOI: 10.1109/ICASSP.2019.8683855 ; checked 2026-11-27.
Confidence: high for mathematical metric; conditional for stereo music.
Evidence: projection of estimate onto reference, with SI-SDR = 10 log10(projected energy / residual energy). Analytical counterexamples demonstrate shortcomings of filter-tolerant BSS_eval SDR. Scale invariance means an estimate multiplied by a nonzero scalar can score perfectly despite wrong gain. This is a mathematical result, not a measured MPS benchmark.
Limit: single-channel separation focus; cannot establish perceived spatial position, height, or mix quality. A polarity reversal can also score perfectly. No claim that SI-SDR should evaluate intentional EQ or panning.
DSP proposal: for stem import/bypass or future separation with ground truth, report SI-SDR alongside signed gain, sample alignment, residual and channel mapping; separately measure per-stem L/R energy and mono fold-down. Never use aggregate stereo width as evidence of localization.
QA STEM-03 fixture: two known orthogonal equal-energy mono signals s and n, each 1 second at 48 kHz, e.g. 997 and 1500 Hz, peak 0.1; estimate s+0.1n; gain-only 0.5s; inverted -s; silence; stereo pair with swapped channels.
Steps: compute projection and residual in float64; compare independent analytic oracle; run gain and polarity checks; compare channel mapping and frame alignment; repeat with imported stems in bypass when available.
Expected: first estimate 20 dB SI-SDR analytically; gain-only and inverted cases zero residual (infinite or explicitly capped score), but separate signed gain detects 0.5 and -1; silent reference explicitly undefined. Proposed pass: finite score within 0.05 dB of oracle, signed gain within 0.001 of expected, no channel swap or silent-reference false pass. Fail on incorrect metric or missed gain/polarity error. Edges: unequal lengths, one-sample shift, near-zero reference, nonfinite samples, intentional processing excluded from bypass oracle.
Spatial follow-up hypothesis: per-stem time/frequency L/R energy and mono loss can diagnose crowded center, but perceived height/depth requires controlled listening and appropriate renderer. No spatial performance claim.

### 10. Lipshitz, Wannamaker, Vanderkooy — Quantization and Dither: A Theoretical Survey (JAES 40(5), May 1992, pp.355–375)
Primary paper copy: https://hajim.rochester.edu/ece/sites/zduan/teaching/ece472/reading/Lipshitz_1992.pdf ; checked 2026-11-27.
Confidence: high for ideal quantizer theory and reported simulation; conditional for MPS export.
Evidence: sections 5.4 and 6, figures 9–10. Non-subtractive triangular PDF dither with 2 LSB peak-to-peak makes conditional first and second error moments constant; total error variance delta^2/4. Authors simulate 1 kHz sine at 4 LSB peak-to-peak and estimate spectrum using 60 half-overlapped Hann 512-point records at assumed 44.1 kHz. Reported noise floor increase 4.8 dB relative to subtractive case. Higher moments may remain input dependent; no claim of full statistical independence.
DSP proposal (LAS-127 export follow-up, current issue status not checked): retain floating precision through SRC and processing; if selected, apply TPDF once at final integer quantization, independent random draws per channel, document clipping/headroom and bit-exact bypass policy. Do not add dither to untouched integer padding by default; 96 kHz does not restore lost information.
QA DITHER-01 fixture: float64 96 kHz, 24-bit step delta=2^-23 normalized; 1 million samples per DC offset 0, 0.25, 0.5, 0.75 LSB; 1 kHz sine at 4 LSB peak-to-peak; fixed test seed; independent rounding oracle; stereo silence and near-full-scale cases.
Steps: export with dither enabled, decode signed PCM24, compute error relative to input in LSB units per offset; repeat with disabled dither and exact 16-to-24 padding; check header and clipping counters; repeat independent seeds.
Expected theoretical RMS 0.5 LSB (~-144.5 dBFS relative to unit peak), mean zero, variance 0.25 LSB^2 for ideal unclipped TPDF. Proposed pass: abs(mean) <=0.01 LSB and variance 0.24–0.26 LSB^2 per offset; exact padding preserves samples with dither off; no integer wraparound; clipping explicitly reported. Fail on wrong format, systematic offset-dependent noise, overflow, or unintended repeat quantization. Edges: full-scale rails (exclude clipped samples from moment oracle), silence policy, float32 precision near full scale, stereo RNG correlation, chunk boundaries, reproducible test seed versus production randomness.
No claim of audible improvement at 24 bits; validate with measurements before changing export.

### Consolidation
Confirmed: SI-SDR scale invariance and TPDF first/second moment results under stated assumptions. Proposed: numerical QA tolerances, per-stem spatial diagnostics, final-stage dither policy. No production DSP tests run; no code or Jira changes. Next cycle: independent spatial localization/controlled listening sources.
