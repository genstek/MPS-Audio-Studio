# Implementation roadmap — Codex tasks

## Milestone 0 — repo/bootstrap (first PR)
- Inspect legacy HTML, document defects and useful behaviors.
- Create JUCE/CMake skeleton, native window and automated CI build for macOS.
- Add logging, error boundaries, unit test framework, formatting/lint and sample fixtures.
- Acceptance: clean build, opens responsive blank console, automated test command passes.

## Milestone 1 — playback vertical slice
- Import WAV on background thread, waveform cache, transport, play/pause/seek, engine status.
- Acceptance: 6-minute 48 kHz WAV plays without freezes, repeated load/unload stable.

## Milestone 2 — DSP and UI
- Implement 10-band EQ, parametric EQ, compressor, width, reverb with real live controls.
- Add Fostex-inspired console strips, inspector, knobs/faders, A/B.
- Acceptance: automated DSP response tests, no audible pops during control changes.

## Milestone 3 — professional output
- Meter bridge (LUFS/true peak/correlation), limiter, offline WAV export, save/reopen project, JSON presets.
- Acceptance: preview/export parity, export validated with independent analysis.

## Milestone 4 — reference matching
- Source/reference align, measured spectral/M/S/dynamics profile, bounded suggested chain, A/B at equal loudness.
- Acceptance: results and residual errors visible; never claim exact proprietary settings.

## Milestone 5 — mixing
- Stems, channel strip routing, buses, per-track gain/pan/sends, solo/mute, latency compensation.

## Milestone 6 — advanced vocal and plugins
- De-esser, dynamic EQ, spectral repair workflow, optional offline ML; AU/VST3 feasibility and licensing review before implementation.

## Execution rule
One milestone at a time. Commit testable end-to-end slices, no large speculative rewrite. After each milestone report working features, failing tests, commands, build artifact, risks, next task.
