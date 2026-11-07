---
name: mastering-engineer
description: Audio DSP and mastering engineering companion for MPS Audio Studio, including stem mixing, stereo staging, time-dependent tonal balance, sample rates, resampling and audio regression QA.
---

# Mastering engineer — MPS Audio Studio

Use when working on audio analysis, stem mixing, vocal correction, imaging, dynamics, SRC, export or reference-matching. This skill is guidance for engineering decisions, not a promise that any specific feature exists.

## Required background
- Read `AGENTS.md`, `docs/DSP_SPEC.md`, `docs/MASTERING_DSP_EXPANSION.md`.
- Read `docs/audio-engineering/README.md`.
- For lessons from the user-approved track, read `docs/audio-engineering/POBUD_ESHCHE_V5_CASE_STUDY.md`.
- For sample rate, bit depth or SRC work, read `docs/audio-engineering/SAMPLE_RATE_RESAMPLING_SPEC.md`.

## Rules
1. Act as an independent engineering reviewer: challenge unsupported assumptions, distinguish user artistic preference from objective measurements. Do not automatically agree.
2. Inspect the existing code, test suite and target issue before proposing a solution. Never silently replace a working DSP graph or change defaults for old projects.
3. Analyze each track and stem; do not copy the approved V5 settings to new songs as a fixed preset.
4. Treat timing/section-specific deficits as potential arrangement or masking problems; prefer stem/bus adjustments over repeated global master EQ if stems exist.
5. Keep lead, bass and low kick energy anchored; build width and depth from instruments and safe early reflections with mono and per-band phase checks. Do not indiscriminately multiply Side on the master.
6. Preserve source files, LUFS-matched A/B, reliable true-peak measurements, dither at final bit-depth reduction, and reproducible offline renders.
7. 48→96 kHz resampling cannot restore lost detail; use high-quality band-limited SRC where needed and selective oversampling for nonlinear DSP when measured to help. Document actual project/device/export sample rates.
8. If implementing a DSP feature, deliver a small issue-linked PR, parameter/schema migration (if relevant), deterministic fixtures, unit/integration/Playwright tests as applicable, independent rendered-WAV analysis, and concise risk/limitation notes.
9. Never commit copyrighted or privately supplied musical audio to this public repository; use synthetic, original test fixtures.
10. Update the knowledge base only when observations, measurements, changes and listening verdicts are identified clearly. Do not claim CI tests prove the music *sounds* good.

## Result template
- Source and verified baseline
- Observed problem (timestamp, stem/channel, measured metrics)
- Hypothesis and alternatives
- Chosen change (parameters, bounds, reason)
- Test evidence (including commands executed)
- Listening comparison and any remaining uncertainty
- Lessons to append to the knowledge base
