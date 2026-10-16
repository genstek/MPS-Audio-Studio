# DSP and audio engineering specification

## Audio fidelity
Internal float32 or float64 DSP; avoid unnecessary resampling. Device sample rates 44.1/48/96 kHz; high-quality SRC only where required. Deterministic offline render from the same parameter snapshot and equivalent processing algorithms.

## EQ
10-band graphic EQ plus parametric bands with bell, low/high shelf, high/low pass. Frequency 20 Hz to min(20k, 0.45*sampleRate); gain ±18 dB; Q 0.2–12 (validate filter stability); smoothed parameter changes to prevent zipper noise. UI curve must reflect actual transfer function, not a Gaussian approximation.

## Compressor
Threshold -60..0 dBFS, ratio 1:1..20:1, attack 0.1..200 ms, release 10..2000 ms, knee 0..24 dB, makeup -12..+24 dB, optional stereo link. Accurate gain reduction metering; characterize detector (peak/RMS), time constants and latency.

## Stereo width
M=(L+R)/2, S=(L-R)/2. Width adjusts S with bounded gain; low frequencies remain near mono by configurable crossover. Check phase/correlation and mono fold-down. Width must not silently change perceived loudness; offer compensation.

## Reverb
Safe wet/dry routing with no unintended feedback; predelay, decay, mix; normalize impulse response if convolution used. Defer heavy IR loading to worker; latency accounted for.

## Limiter / export
True-peak ceiling adjustable -6..-0.1 dBTP, initial -1 dBTP. Oversampled detection and appropriate lookahead; measure exported PCM using independent analyzer. Do not claim sample peak equals true peak. 24-bit PCM export; optional 16-bit with TPDF dither. Dither only at final bit-depth reduction.

## Metering
Implement ITU-R BS.1770 / EBU R128 loudness with gating and LRA; short-term 3s, momentary 400ms; true peak with sufficient oversampling; sample peak, RMS, crest factor, spectral balance, M/S per band, L/R correlation. Document exact algorithms and tolerances.

## Reference matching
Align source and reference by sample rate, onset/offset and optional cross-correlation; level-match before spectral comparison. Estimate broad-band EQ difference, M/S width by bands, LUFS, crest and dynamic envelope; limit suggestions to safe ranges; expose user approval and A/B. No guarantee of recovering proprietary compressor parameters or original unmastered dynamics.

## Vocal processing roadmap
P1 de-esser, dynamic EQ, spectral resonance detector, clip gain; P2 spectral restoration or optional local ML source separation with transparent artifact-risk warnings. Vocoder is a creative effect, not a cleanup solution.

## Audio QA numerical targets (initial; calibrate with fixtures)
No NaN/Inf, no denormals causing CPU spikes, stable feedback-free processing; bypass unity ±0.1 dB (except explicit latency); 24-bit export round-trip within quantization; true peak ceiling within +0.2 dBTP measurement tolerance; seek/loop without clicks using crossfades. Test all at multiple sample rates and buffer sizes.
