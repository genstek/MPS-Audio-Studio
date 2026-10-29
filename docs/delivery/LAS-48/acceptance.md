# LAS-48 acceptance trace

Tested commit `b06590ba02bf5209d67cbf6a5b0e5c83345ec5cd` (Linux, Chromium 141). Developer results only; manual results are NOT_RUN.

| Trace ID | Criterion | Check | Developer result | Evidence |
| --- | --- | --- | --- | --- |
| LAS-48-AC-01 | Resizing updates layout without reload/zoom/action | LAS-51 sweeps + matrix round trip on one page; no reload (track and playback state kept) | PASS (automated); maximize/restore/display move NOT_RUN | log, HTML report |
| LAS-48-AC-02 | No horizontal overflow, overlap or clipped essentials at approved sizes | LAS-51 geometry (desktop range) + matrix incl. 768×1024 and 390×844 | PASS | same |
| LAS-48-AC-03 | Many tracks bounded | not executable: single track | BLOCKED | README |
| LAS-48-AC-04 | Readable labels, visible focus, zoom 125/200 % | zoom-equivalent sizes at DPR 1.25/2, labels not cut, focus ring across resizes | PASS (emulated); real zoom NOT_RUN | same |
| LAS-48-AC-05 | Resizing keeps audio, playhead, settings, project state | playing/paused/stopped across resizes with source probe | PASS for transport/track; settings BLOCKED (not implemented) | same |
| LAS-48-AC-06 | Waveform/EQ/meters/high-DPI/pointer mapping | DPR 2 layout only; graphics absent | BLOCKED (controls not implemented); DPR layout PASS (emulated) | same |
| LAS-48-AC-07 | Proposed matrix + continuous width/height resize | matrix round trip; LAS-51 height and width sweeps, 760/761/762 crossings | PASS (Chromium) | same |
| LAS-48-AC-08 | Playwright resizing/overflow/core controls; manual evidence | 8 new + 9 LAS-51 tests; TC-001 traces recorded | PASS (automated); manual NOT_RUN; Firefox/WebKit BLOCKED | `evidence/tc001-traces/` |
