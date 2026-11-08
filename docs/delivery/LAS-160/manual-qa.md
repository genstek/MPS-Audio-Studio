# LAS-160 — Graphic EQ faders on native macOS (WKWebView)

Jira: https://genstek69.atlassian.net/browse/LAS-160 · Issue #69

## Cause (from the 41 s screen recording; not reproduced on a Mac from CI)
The faders were native `<input type="range">` with `writing-mode: vertical-lr; direction: rtl; appearance: none` and custom `::-webkit-slider-*` geometry. On Ventura 13.7.8 WKWebView, the value changed (and the EQ curve followed) while the thumb stayed at 0 dB and pointer positions mapped to the end stop (−12 dB). Vertical range inputs are not interoperable across engines, so the fix replaces them rather than adding JS workarounds.

## Fix
`GraphicFader` in `src/GraphicEqEditor.jsx` is a focusable `role="slider"` with `aria-valuemin/max/now/text`, `aria-orientation="vertical"`. Pointer Y maps linearly to gain (pointer capture, 0.5 dB steps, clamped ±12). Keys: arrows ±0.5, PageUp/Down ±3, Home/End = −12/+12; double-click resets to 0. The thumb is positioned by CSS from the same value that is displayed. The edit still goes through `editGraphicGain` and `update`, so undo, link L/R, curve, preview and export are unchanged.

## Automated (Linux, Chromium only)
- `tests/e2e/processor-design.spec.js` "LAS-160": real mouse drags to 12/6/0/−6/−12/3.5 dB in both skins; asserts `aria-valuenow`, the numeric output, the thumb's physical position and the chain's `eq.left[5].gain`; also clamping, Home/End/PageDown, double-click reset.
- WebKit could not be installed on the CI host, so WebKit automation was NOT run.

## Manual QA — native macOS: **NOT_RUN**
Build on Intel iMac / Ventura 13.7.8 / Xcode 15.2.
1. Launch `MPSMac.app`; import a WAV; open EQ → Graphic → **Set up 10 graphic bands** (replaces bands 1–10; Undo restores).
2. In both skins, for each of the 10 faders: click at the top, middle and bottom of the track, and drag slowly. Expect the thumb under the pointer, the number and curve matching, and intermediate values (e.g. +3.5).
3. Keyboard: Tab to a fader; arrows, PageUp/Down, Home/End. VoiceOver should read "1000 Hz gain, slider, +3.0 dB".
4. Set 1 kHz to +12, then −12 dB with EQ on and Processed. Expect an audible and spectrum change. Export a WAV and compare its spectrum with the original.
5. Link and Independent L/R, Original/Processed A/B, EQ bypass, Undo/Redo, switch to Parametric and back (sound unchanged), save and reload a project and an EQ preset.
Record results in `results.json` style; do not mark PASS without running on a Mac.
