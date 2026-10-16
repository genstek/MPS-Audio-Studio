# UI / UX specification — Analog Console meets Digital Precision

## Visual direction
Original design inspired by classic Fostex multitrack consoles and SSL channel-strip ergonomics, with modern EQ visuals. Do not copy brand marks, panel labels, proprietary layouts or exact trade dress. Default dark graphite chassis, subtle brushed-metal texture, warm amber VU needles, restrained cyan EQ graph and channel accent colors; legible typography and high contrast. Optional 'Vintage' and 'Modern' skins.

## Main desktop window (recommended 1440×900 baseline)
Top (80px): project name, transport, loop, tempo optional, CPU/audio engine status, device and sample rate.
Center top (180px): stereo waveform, draggable playhead, A/B/REF selectors, gain-matched monitor switch.
Center bottom (450px): horizontal scrollable channel strips (later stems), initially INPUT, EQ, DYNAMICS, COLOR, SPACE, MASTER; each module visually a vertical console strip with tactile knobs and bypass LEDs.
Right inspector (320px): large parametric EQ plot / compressor transfer curve / spectral view, context dependent.
Bottom (120px): master fader, L/R meters, LUFS, true peak, correlation, mono toggle, export button.

## Strip anatomy
Header/name/color → input gain → 3–5 rotary controls → module toggle → vertical level meter → long fader → solo/mute (only on audio tracks). Keyboard/mouse: double-click numeric edit, shift for fine adjust, option-click reset, undo/redo, hover tooltip units.

## Preset browser
Factory groups: Flat, Rock Starting Point, Pop Starting Point, Jazz Starting Point, Acoustic Starting Point, Vocal Clarity, Cinematic Width, User. Show applied parameters and editable diff. Mark factory profiles as **heuristic starting points**, not mastered-by-celebrity settings.

## Accessibility / responsiveness
Minimum window 1100×700 with scroll/zoom, scalable UI, keyboard navigation, accessible names, no color-only state. No decorative meters: actual live readings. CPU overload indicator; persistent unsaved changes state.

## UX states
No file; decoding; ready; playing; paused; analysis pending; exporting; failed; missing file; audio device unavailable. Never block UI while reading audio. Present actionable error with retry and logs.

## User flow acceptance
Launch → drop WAV → waveform appears → press play → adjust 80 Hz EQ and hear immediate difference → bypass → A/B loudness matched → choose Rock preset → tweak → save custom → export → reopen output and validate.
