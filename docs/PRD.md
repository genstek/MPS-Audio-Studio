# Product requirements (PRD) — v1

## User goal
Turn Suno-generated or recorded WAV files and later stems into cleaner, wider, punchier professional masters with audible live control, repeatable presets and A/B reference comparisons.

## Personas and workflows
- Music creator: import WAV → play → choose preset → adjust controls while listening → A/B at equal loudness → export WAV.
- Advanced user: load reference → measure EQ/width/dynamics differences → apply suggested settings → fine tune → save profile.
- Mixing user (later): load vocal/instrument/drums/bass stems → channel strip each → bus routing → master.

## MVP (P0)
- Installable macOS .app and developer-build DMG; correct startup, drag/drop, native file picker.
- Transport: play, pause, stop, seek, loop region, time ruler, waveform overview.
- Real-time 10-band graphic EQ and at least 5-band fully parametric EQ (frequency 20–20k, gain, Q, filter type).
- Stereo compressor: threshold, ratio, attack, release, knee, makeup gain; actual gain reduction meter.
- Stereo width Mid/Side with frequency-aware bass mono protection and correlation/mono monitoring.
- Reverb send (mix, decay, pre-delay) with safe routing and bypass.
- Master output trim, true-peak limiter (document oversampling), meter bridge: sample peak, true peak, integrated/short-term LUFS, LRA, L/R correlation.
- Level-matched original/processed/reference A/B with bypass without discontinuities.
- Factory and user presets with complete parameters and versioned JSON, undo/redo.
- Offline 24-bit WAV export with dither only when appropriate; metadata and analysis report.
- Persist non-destructive project state; original WAV is never overwritten.

## P1
- Reference-matching assistant (tonal balance, M/S bands, loudness, crest, dynamic envelope) with limits, confidence, and manual review.
- Multi-track stems, channels, buses, solo/mute, gain, pan, routing, sends, sidechain.
- De-esser, dynamic EQ, multiband compressor, transient shaper, saturation.

## P2
- AI vocal repair (artifact diagnostics and optional licensed offline ML); vocoder as creative effect, not repair.
- AU/VST3 hosting, plugin scanning, crash isolation and latency compensation; optional online features.

## Out of scope for MVP
- Automated professional-quality claims, exact recreation of Masterify internal algorithms, full DAW recording/MIDI, third-party proprietary preset copying.

## Success metrics
- A 6-minute 48 kHz stereo WAV loads and plays without UI freeze or audible glitches on target Macs.
- All controls audibly and measurably affect processing as specified.
- Export has deterministic duration, valid WAV headers, measured true-peak compliance, and no unintended clipping.
- Preset save/load restores full chain and state; reference A/B is gain matched.
