# QA plan / release gates

## Gate 0: startup & failure recovery
- Launch on clean macOS install; UI responsive; no infinite recursion or stack overflow.
- Open missing/corrupt/unsupported file → actionable error, no crash.
- Audio device missing/changed during playback → graceful recovery.
- Idle CPU stable; no runaway repaint; repeated open/close 100x no leaks.

## Gate 1: playback
- Import 16/24/32-bit WAV; stereo and mono; 44.1/48/96k; 1s and 60min fixtures.
- Transport play/pause/seek/loop; end-of-file stops; progress and waveform agree.
- No UI freeze during decode/analysis; no clipping in unity bypass.
- Stress test 10-minute playback while adjusting 10 controls/sec; no pops/NaNs.

## Gate 2: DSP controls
- Each control tested at min/nominal/max, bypass, rapid automation, reload.
- EQ frequency response validated with swept sine and impulse; curve agrees with DSP.
- Compressor attack/release/ratio validated with step-tone envelopes.
- Stereo width tested on mono, correlated stereo and anti-phase fixtures; mono fold-down checked.
- Reverb wet/dry and impulse tails checked for clipping and feedback.

## Gate 3: meters & export
- LUFS / LRA compared to independently generated reference fixtures and analyzer.
- True peak checked on intersample-peak fixtures; sample peak not substituted.
- Offline WAV export duration/sample count/bit depth/sample rate validated.
- Preview/export consistency: render controlled test and compare signal (allow known device/SRC differences).
- Cancel export leaves no partial final file; source unchanged.

## Gate 4: project/presets
- Save/reopen restores all parameters, routing, automation and version; schema migration.
- Invalid JSON is rejected with meaningful error; factory presets immutable.
- Undo/redo and bypass behavior deterministic; A/B loudness matched within target tolerance.

## Gate 5: desktop delivery
- Build `.app`, package `.dmg`, install, launch, uninstall; signing/notarization for distribution.
- Smoke on Apple Silicon and Intel if supported; supported macOS version documented.
- No unsigned third-party binaries bundled without review; dependency/license inventory.

## Bug template
ID | build | macOS/CPU/audio device | source file properties | steps | expected | actual | logs | audio evidence | severity | regression test.

## Release policy
Do not mark a milestone Done without reproducible test evidence. A pretty UI is not a functioning audio engine. Report unverified tests explicitly.
