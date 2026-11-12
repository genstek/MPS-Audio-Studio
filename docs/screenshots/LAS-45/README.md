# LAS-45 Phase 1 — Classic vs Console 2.0 screenshots

Captured by `tests/e2e/LAS45-console.spec.js` (Playwright, Linux headless Chromium) with a 6 s synthetic
mono tone imported, transport stopped. `classic-WxH.png` / `console-WxH.png` at 1920×1080, 1440×900,
1280×720 and 761×450.

Limitations
- The ChatGPT mockups (Concepts C and D) are in the design discussion (LAS-44), not repo assets, so these
  are not a pixel comparison against them.
- Headless Linux Chromium only. Ventura 13 WKWebView / native: NOT RUN.
- Meters are idle (no audio playing). LUFS / true peak show `—` / "Requires analysis" by design.
- At 1280×720 and 761×450 Console 2.0 scrolls the page vertically; these images show the top of the page.
- The build label is ellipsised at 761 px (as in Classic, LAS-169); full identity is in its title/aria-label.
