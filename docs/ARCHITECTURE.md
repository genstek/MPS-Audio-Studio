# Architecture decision record — ADR-001

## Decision: JUCE standalone macOS app (C++20/CMake)
Reason: real-time audio callbacks, offline rendering, sample-accurate automation, plugin hosting path and macOS packaging. Do **not** port the existing fragile HTML audio graph as the engine. The old Electron/browser prototype remains a UX/feature reference only.

## Modules
- `app/`: native startup, device setup, permissions, document lifecycle.
- `ui/`: analog console, channel strips, EQ graph, meter bridge, transport, accessibility.
- `audio/engine/`: real-time graph, transport, latency, routing, parameter smoothing.
- `audio/dsp/`: EQ, compressor, width, reverb, limiter, analysis; isolated unit tests.
- `audio/io/`: WAV read/write, resampling, metadata, offline rendering, atomic saves.
- `analysis/`: loudness EBU R128 / ITU-R BS.1770, true peak, stereo M/S, spectral profiles.
- `presets/`: versioned JSON serialization, migrations, factory/user profiles.
- `reference/`: source/reference alignment, gain matching, feature extraction, bounded suggested chain.
- `tests/`: DSP unit, golden audio fixtures, integration, stress, UI smoke.

## Threading contract
Audio callback: no heap allocation, locks, file/network I/O, UI calls, logging or exceptions. Parameter changes via lock-free queue or atomics and smoothing. Analysis/waveform generation on worker threads. UI repaint bounded at 30–60 fps and suspended when hidden. Offline export runs off UI thread, cancellable.

## Audio graph
File decoder → input trim → corrective EQ → compressor → tone EQ → optional reverb send → M/S width with low-frequency protection → limiter → output trim → meter → device/export. Provide per-module bypass; implement latency accounting, avoid graph feedback loops, preserve mono compatibility. Later stems enter channel strips and buses before master chain.

## File safety
Project files reference source media without mutating it; cache analysis in app support directory; export via temporary file + atomic rename; detect missing media. Use checksums for reference assets and regression fixtures.

## macOS build/release
CMake presets for Debug/Release; test on Apple Silicon and Intel when available; create signed/notarized universal or architecture-specific DMG for distribution. Development builds may be unsigned; document limitations. No user should be told to disable system security.

## License and dependency review
Before implementation check current JUCE license, plugin SDK terms, DSP library licenses, redistribution rights and code-signing requirements.
