# MPS Mastering Framework v1.1 — Approved baseline

## Approved sonic reference
- **Lia Master v6 — Reference Matched**: user-approved baseline as of 2026-10-12.
- Original source: `Lia.wav`.
- Commercial comparison: `Master_Lia (1).wav` (Masterify).
- Working output: `Lia_Master_v6_Reference_Matched.wav`.
- User preference: wide stereo staging, clear brightness/presence, punchy low end, clean natural AI vocal.
- v6 was preferred over v1–v5; commercial reference may remain marginally brighter.

## Important provenance
The v6 sound is an approved **audio reference**, not a verified recreation of Masterify's internal processing chain. The exact plugin parameters and coefficients used to produce v6 are not available in this record; do not claim an exact reproducible preset. Preserve the audio files and perform calibrated reference matching to develop a reproducible chain.

## Engineering pipeline
1. Ingest: preserve original PCM, checksum, inspect bit depth, sample rate, clipping.
2. Analyze: integrated LUFS, LRA, true peak, crest factor, spectral bands, stereo correlation and Mid/Side per band.
3. Diagnose: note specific defects and time ranges; distinguish generated artifacts from mix defects.
4. Route: stereo mix mastering vs. stems mixing; vocal repair if stems available.
5. Process: corrective EQ → dynamics → tonal shaping → stereo stage → true peak limiting, with alternative chains when warranted.
6. Compare: level-matched A/B against source and commercial reference; mono compatibility; multiple playback systems.
7. Deliver: lossless master, measurements, settings, QA checklist, change log.

## App roadmap
- **Prototype 0.1**: local browser player, 10-band graphic EQ from 20 Hz to 10 kHz with shelf at 10 kHz extending above, compressor, convolution reverb, Mid/Side stereo width, spectrum visualizer, A/B bypass, JSON presets.
- **0.2**: frequency response curve 20 Hz–20 kHz, LUFS/true-peak metering, safe limiter, offline 24-bit WAV export, loudness-matched A/B.
- **0.3**: multiband dynamics, reference matching, per-band stereo imaging, sidechain, history/undo.
- **0.4**: stem tracks, vocal restoration tools, de-esser, spectral editing, plugin architecture.
- **0.5**: vocoder as an intentional effect, not an AI-artifact removal algorithm; automation and export QA.

## Acceptance criteria
- No unexpected clipping; verified true peak.
- No phase collapse in mono; low end remains stable.
- Clear audible improvement in level-matched comparisons, not loudness bias.
- Preset serializes every user-facing control.
- Original audio never overwritten.
