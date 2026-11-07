# Mixing case study: “Побудь ещё” — V1 through V5

Status: V5 Studio Stage **accepted by the user for sound** on 2026-11-07; quality target only, not an algorithm or production-ready app preset.
Source: 11 synchronized 48 kHz / 16-bit WAV stems, approximately 4:19. Files were supplied privately and **must not** be committed to this public repo. No licensed audio reference or stem data is embedded here.

## Session history (what was heard and changed)
| Version | Observation / request | Engineering approach | Status |
| --- | --- | --- | --- |
| V1 | Initial stem mix; concern vocal dominance | Independent stem EQ/dynamics, conservative stereo and mastering | Starting comparison |
| V2 | Lead too prominent, backing too quiet, vocal high slightly sharp | Lead approximately -2 dB; backing approximately +2 dB; subtle high-frequency softening to lead | Preferred balance direction |
| V3 | Perceived muddiness and presence dip late in track | Time-localized broad tonal EQ trial after ~3:10, rather than whole-song boost | Diagnostic trial, not definitive fix |
| V4 | After 3:00 loss of air, question whether limiter / convolution reverb responsible | Analyze premaster vs master; try mild low-mid reduction and presence/air correction after ~2:58, without new limiter | Tonal comparison |
| V5 | Soundstage too center-heavy across the **entire** song | Remix 11 stems: keep lead/bass stable in center; subtle high-band drum and percussion width; place guitar/keyboards more deliberately; do not broaden already phase-sensitive synth/strings; quiet early reflections for backing; no additional final limiter | **User-approved listening reference** |
| V5 at 96 kHz | User liked 24-bit/96 kHz export | High-quality upsampling of 24-bit/48 kHz master | Format/workflow variant only; no claim of new source information |

## Why the final spatial approach matters
- Full-mix positive LR correlation does not establish good depth. In earlier comparisons the Side/Mid relationship was weakest around 1:00–2:00; final seconds were already wider. Width must be measured **by section**.
- Bass and much of drums were strongly centered; some strings/synths already wide and occasionally phase-risky. Raising global Side uniformly was not the preferred solution.
- A successful spatial mix balances placement, spectral masking, early reflections and central focus. Reverb is not a substitute for an intelligible dry vocal and may worsen low-mid mud.
- User specifically reported a lack of air and perceived muddiness beyond 3:00. Spectral masking and arrangement change were plausible; a limiter alone was **not established as the root cause**. Keep hypotheses separate from verified faults.
- If a proposed master-stage EQ helps but is not enough, return to stems for precise time automation and separation, rather than indefinitely stacking broad master EQ curves.

## Reference measurements reported in the original session
- V5 final: **24-bit / 48 kHz**, approximately **-17.67 LUFS integrated**, **-1.25 dBTP**, **6.0 LU LRA**. These are session-report figures, **not independently remeasured in this repository**.
- The user also approved listening to the **24-bit / 96 kHz** resampled version. This preference is evidence of their approval of that rendition, **not proof that 96 kHz sounds better than 48 kHz in a controlled level-matched blind test**.
- V5 stereo improvement relative to V4 was intentionally modest, reported at roughly +0.1 to +0.55 dB Side/Mid depending on section, not a large widener effect.
- No universal LUFS, width or compressor settings can be inferred from one song.

## Reusable processing logic
1. Diagnose all of 0:00–end with adaptive windows: intro, verses, choruses, transition and outro; output plots plus listening section markers.
2. Inspect isolated and in-context stems, masking, polarity and stereo coherence.
3. Automate lead/back balance by phrase rather than boost everything; judge vocal high bands only after balance adjustment.
4. Preserve sub/bass mostly mono and centered; widen instrument ambience/high bands where mono fold-down remains safe.
5. Build perceived depth with instrument-specific early reflections/predelay and controlled reverb return low end, not full-mix convolution.
6. Apply compression/limiting only as much as needed for final musical dynamics and true peak; audition at matched loudness.
7. Compare A/B at matched perceived loudness, including mono and headphones/speakers. Listener approval is essential; measurement is necessary but not sufficient.

## Possible MPS features, not marked as built
- Timeline-based spectral and M/S analysis, phase and mono-check per band/section.
- Independent stem positioning / high-band width / early-reflection sends, with latency and phase safety.
- Time-range or automation-curve EQ and voice/bus gain; per-stem A/B and Undo.
- Resampling and per-export format selection (see companion specification).
- Listening evaluation log with versioned measurements and approval status.

## Key limitation
This document preserves decisions and prior measurements as reported in a conversation. It does not substitute for new on-device audition, reproducible signal tests or access to the original stems. Re-run independent verification when implementing features.
