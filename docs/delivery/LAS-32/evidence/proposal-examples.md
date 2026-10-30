# LAS-32 proposals for representative cases

Node v22.22.0, 44100 Hz. Synthetic LAS-29 programme only. "before → after" is the distance to the reference, rendered and measured.

## Mix vs the same music through the "master" preset

Section 4–10 s · computed in 7.5 s

- **EQ — proposed.** 31.5 Hz band: +2.0 dB relative to the reference 63 Hz band: +1.7 dB relative to the reference 4 kHz band: −0.7 dB relative to the reference 8 kHz band: −2.2 dB relative to the reference Values: 31.5 Hz bell, Q 1.41, −1.9 dB; 63 Hz bell, Q 1.41, −1.0 dB; 125 Hz bell, Q 1.41, +1.3 dB; 250 Hz bell, Q 1.41, −0.8 dB; 500 Hz bell, Q 1.41, −0.8 dB; 8 kHz bell, Q 1.41, +2.3 dB.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (−0.1 LU).
- **Limiter — proposed.** With this chain the mix section is 3.4 LU quieter than the reference (−16.4 against −13.0 LUFS). Values: input gain +3.9 dB, ceiling −1 dBTP, release 100 ms; in the final check: loudness −13.1 LUFS (reference −13.0), largest limiter gain reduction 2.5 dB, true peak −1.0 dBTP.
- **Width — not proposed.** The mix's side/mid is −0.2 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +2.2 | +0.3 | +1.2 |
| Integrated loudness difference (LU) | -3.6 | -0.1 | -1.6 |
| Crest factor difference (dB) | +1.9 | -0.0 | +1.4 |
| Loudness range difference (LU) | -0.1 | -0.1 | -0.1 |
| True peak of the result (dBTP) | — | -1.00 | -1.00 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 2.5 | 0.0 / 0.7 |

## Mix vs a much brighter version (tonal, adversarial)

Section 4–10 s · computed in 4.9 s

- **EQ — proposed.** 31.5 Hz band: +18.2 dB relative to the reference 63 Hz band: +18.0 dB relative to the reference 125 Hz band: +16.9 dB relative to the reference 250 Hz band: +10.4 dB relative to the reference 1 kHz band: −10.2 dB relative to the reference 2 kHz band: −17.3 dB relative to the reference 4 kHz band: −20.3 dB relative to the reference 8 kHz band: −21.1 dB relative to the reference Values: 31.5 Hz bell, Q 1.41, −6.0 dB; 63 Hz bell, Q 1.41, −6.0 dB; 125 Hz bell, Q 1.41, −6.0 dB; 250 Hz bell, Q 1.41, −6.0 dB; 500 Hz bell, Q 1.41, −6.0 dB; 1 kHz bell, Q 1.41, +4.0 dB; 2 kHz bell, Q 1.41, +4.0 dB; 4 kHz bell, Q 1.41, +4.0 dB; 8 kHz bell, Q 1.41, +4.0 dB. Guards: 31.5 Hz: the measured shape asks for −18.2 dB; cuts stop at −6 dB. 63 Hz: the measured shape asks for −18.0 dB; cuts stop at −6 dB. 125 Hz: the measured shape asks for −16.9 dB; cuts stop at −6 dB. 250 Hz: the measured shape asks for −10.4 dB; cuts stop at −6 dB. 1 kHz: the measured shape asks for +10.2 dB; boosts stop at +4 dB. 2 kHz: the measured shape asks for +17.3 dB; boosts stop at +4 dB. 4 kHz: the measured shape asks for +20.3 dB; boosts stop at +4 dB. 8 kHz: the measured shape asks for +21.1 dB; boosts stop at +4 dB.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (+0.2 LU).
- **Limiter — not proposed.** With this chain the mix section is 5.3 LU louder than the reference. The chain has no output trim (master level is not implemented), so nothing is proposed; the comparison stays level-matched.
- **Width — not proposed.** The mix's side/mid is −4.1 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +21.1 | +18.6 | +18.6 |
| Integrated loudness difference (LU) | +11.0 | +5.3 | +7.8 |
| Crest factor difference (dB) | -9.9 | -7.4 | -9.4 |
| Loudness range difference (LU) | +0.2 | +0.1 | +0.2 |
| True peak of the result (dBTP) | — | -6.28 | -5.43 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 0.0 | 0.0 / 0.0 |

## Quiet wide-range mix vs a slowly compressed version

Section 3–15 s · computed in 12.3 s

- **EQ — proposed.** 31.5 Hz band: +2.5 dB relative to the reference 63 Hz band: +0.8 dB relative to the reference 2 kHz band: −0.6 dB relative to the reference 4 kHz band: −0.8 dB relative to the reference 8 kHz band: −0.8 dB relative to the reference Values: 31.5 Hz bell, Q 1.41, −3.6 dB; 1 kHz bell, Q 1.41, −0.5 dB.
- **Compressor — proposed.** The mix's loudness range is 7.5 LU wider than the reference's (12.1 against 4.6 LU). Values: threshold −26 dBFS (halfway into the section's range), ratio 1.5, attack 30 ms, release 300 ms, knee 6 dB, RMS detector; in the final check: loudness range 12.1 → 9.3 LU (reference 4.6), largest gain reduction 4.7 dB. Guards: Ratio 2 would reduce the gain by 7.1 dB (guard 6 dB); not used.
- **Limiter — not proposed.** Loudness within 0.5 LU of the reference (−0.3 LU).
- **Width — not proposed.** The mix's side/mid is −0.1 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +2.5 | +0.2 | +1.0 |
| Integrated loudness difference (LU) | +4.1 | +0.0 | +1.4 |
| Crest factor difference (dB) | -3.0 | -1.7 | -2.2 |
| Loudness range difference (LU) | +7.5 | +4.7 | +5.8 |
| True peak of the result (dBTP) | — | -4.37 | -3.51 |
| Largest compressor / limiter gain reduction (dB) | — | 4.7 / 0.0 | 2.8 / 0.0 |

## Mix vs a hard-limited version (+14 dB into the limiter)

Section 4–10 s · computed in 11.6 s

- **EQ — proposed.** 31.5 Hz band: +2.7 dB relative to the reference 63 Hz band: +3.3 dB relative to the reference 250 Hz band: −1.9 dB relative to the reference 500 Hz band: −2.0 dB relative to the reference 1 kHz band: −0.6 dB relative to the reference 2 kHz band: +1.0 dB relative to the reference 4 kHz band: +2.2 dB relative to the reference 8 kHz band: +2.3 dB relative to the reference Values: 31.5 Hz bell, Q 1.41, −0.8 dB; 63 Hz bell, Q 1.41, −2.0 dB; 125 Hz bell, Q 1.41, +1.0 dB; 250 Hz bell, Q 1.41, +0.5 dB; 500 Hz bell, Q 1.41, +1.0 dB; 1 kHz bell, Q 1.41, +0.5 dB; 2 kHz bell, Q 1.41, −1.5 dB; 4 kHz bell, Q 1.41, −2.4 dB; 8 kHz bell, Q 1.41, −3.6 dB.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (+0.1 LU).
- **Limiter — proposed.** With this chain the mix section is 9.7 LU quieter than the reference (−16.6 against −6.9 LUFS). Its crest factor is 7.9 dB higher: limiting raises the density with the peaks held at the ceiling. Values: input gain +7.1 dB, ceiling −1 dBTP, release 100 ms; in the final check: loudness −10.8 LUFS (reference −6.9), largest limiter gain reduction 5.8 dB, true peak −1.0 dBTP. Guards: Input gain limited so that the limiter reduces the gain by at most 6 dB.
- **Width — not proposed.** The mix's side/mid is −2.1 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +3.3 | +0.3 | +2.0 |
| Integrated loudness difference (LU) | -9.7 | -3.9 | -6.5 |
| Crest factor difference (dB) | +7.9 | +3.9 | +6.3 |
| Loudness range difference (LU) | +0.1 | +0.2 | +0.1 |
| True peak of the result (dBTP) | — | -0.99 | -1.00 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 5.8 | 0.0 / 2.3 |

## Mastered mix vs a quieter, unprocessed reference

Section 4–10 s · computed in 6.0 s

- **EQ — proposed.** 31.5 Hz band: −2.0 dB relative to the reference 63 Hz band: −1.7 dB relative to the reference 4 kHz band: +0.7 dB relative to the reference 8 kHz band: +2.2 dB relative to the reference Values: 63 Hz bell, Q 1.41, +2.4 dB; 125 Hz bell, Q 1.41, −1.5 dB; 500 Hz bell, Q 1.41, +0.5 dB; 2 kHz bell, Q 1.41, −0.9 dB; 8 kHz bell, Q 1.41, −3.3 dB. Guards: 31.5 Hz: the measured shape asks for +2.0 dB; no boost below 40 Hz.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (+0.1 LU).
- **Limiter — not proposed.** With this chain the mix section is 9.4 LU louder than the reference. The chain has no output trim (master level is not implemented), so nothing is proposed; the comparison stays level-matched.
- **Width — not proposed.** The mix's side/mid is +0.2 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +2.2 | +0.9 | +1.4 |
| Integrated loudness difference (LU) | +9.6 | +9.4 | +9.5 |
| Crest factor difference (dB) | -1.9 | -2.1 | -2.0 |
| Loudness range difference (LU) | +0.1 | +0.1 | +0.1 |
| True peak of the result (dBTP) | — | -1.12 | -1.04 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 0.0 | 0.0 / 0.0 |

## Mix 24 dB too quiet vs the mastered version

Section 4–10 s · computed in 5.5 s

- **EQ — proposed.** 31.5 Hz band: +2.0 dB relative to the reference 63 Hz band: +1.7 dB relative to the reference 4 kHz band: −0.7 dB relative to the reference 8 kHz band: −2.2 dB relative to the reference Values: 31.5 Hz bell, Q 1.41, −2.2 dB; 63 Hz bell, Q 1.41, −1.9 dB; 125 Hz bell, Q 1.41, +1.4 dB; 500 Hz bell, Q 1.41, −0.5 dB; 2 kHz bell, Q 1.41, +0.8 dB; 8 kHz bell, Q 1.41, +2.9 dB.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (−0.1 LU).
- **Limiter — proposed.** With this chain the mix section is 27.4 LU quieter than the reference (−40.4 against −13.0 LUFS). Values: input gain +12.0 dB, ceiling −1 dBTP, release 100 ms; in the final check: loudness −28.4 LUFS (reference −13.0), largest limiter gain reduction 0.0 dB, true peak −14.4 dBTP. Guards: Input gain stops at 12 dB.
- **Width — not proposed.** The mix's side/mid is −0.2 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | +2.2 | +0.4 | +1.1 |
| Integrated loudness difference (LU) | -27.6 | -15.4 | -21.5 |
| Crest factor difference (dB) | +1.9 | +1.8 | +1.8 |
| Loudness range difference (LU) | -0.1 | -0.1 | -0.1 |
| True peak of the result (dBTP) | — | -14.38 | -20.33 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 0.0 | 0.0 / 0.0 |

## Mix with an inverted right channel vs the original

Section 4–10 s · computed in 4.8 s

- **EQ — not proposed.** No octave band differs by 0.5 dB or more.
- **Compressor — not proposed.** Loudness range within 2 LU of the reference (0.0 LU).
- **Limiter — not proposed.** Loudness within 0.5 LU of the reference (0.0 LU).
- **Width — not proposed.** The mix's side/mid is +54.2 dB relative to the reference. The chain has no width processor yet (Space is planned), so nothing is proposed. Guards: The mix's correlation is −1.00: check mono compatibility before mastering.

| Distance to the reference | Mix | Proposal 100 % | Proposal 50 % |
| --- | --- | --- | --- |
| Largest octave-band difference (dB) | 0.0 | 0.0 | 0.0 |
| Integrated loudness difference (LU) | 0.0 | 0.0 | 0.0 |
| Crest factor difference (dB) | 0.0 | 0.0 | 0.0 |
| Loudness range difference (LU) | 0.0 | 0.0 | 0.0 |
| True peak of the result (dBTP) | — | -2.30 | -2.30 |
| Largest compressor / limiter gain reduction (dB) | — | 0.0 / 0.0 | 0.0 / 0.0 |

