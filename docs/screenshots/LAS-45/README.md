# LAS-45 Studio Layout review screenshots

Captured with headless Chromium (Linux) from the real app while a generated 20 s sine WAV plays and
after Analyze finished: `LAS45_SHOTS=1 npx playwright test tests/e2e/studio-layout.spec.js -g shot`.
Files: `{classic,a,b,c,d}-{1920x1080,1280x720,1024x768,761x450}.png` (full page).

They show composition only. They are not a pixel comparison with the owner's ChatGPT concept images
(not in the repository) and prove nothing about audio fidelity. Ventura 13 WKWebView: NOT RUN.

| Layout | Real today | Planned / not available |
|---|---|---|
| A Console Focus | Monitor drawer (listening, monitor level), real-time spectrum + needles, strips, selected-processor inspector (real bypass, Edit), offline values after Analyze | EQ-over-spectrum overlay, scenes drawer |
| B Analog Strip Wall | Tall strips (EQ/Dynamics/Limiter/Space, real LED/GR meters), upright master fader with dB scale, read-only stem channels, real-time spectrum | Per-stem live faders/meters (Stage 2), knobs bound to processor params |
| C Mastering Hybrid | Analysis-first stage: real-time spectrum + needles, offline LUFS/true peak/range/correlation with provenance, mixer bank + inspector | Real-time LUFS/true peak/phase, stereo M/S view (Stage 3) |
| D Digital Console Suite | Left navigation + session + stems, inspector between tracks and strips, master rack with upright fader | Live stem strips (Stage 2) |
