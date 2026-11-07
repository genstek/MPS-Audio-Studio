# LAS-75/76 — functional processor design preview

Draft on `feat/LAS-75-76-processor-preview`, based on main `df996b0464eee2b9292f395ba3869aa9411964e0`.
Gennady asked to focus on development and leave his manual QA for later. This slice makes two panel proposals usable with the real audio engine. It does not complete the full LAS-75/76 scope or record design/listening approval.

## Open the candidate

```sh
git fetch origin
git switch feat/LAS-75-76-processor-preview
npm ci
npm run dev -- --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/?design=processors` and open EQ, Dynamics or Limiter from the mixer. The normal URL retains the existing interface. No user account is required.

- **A · Graphite rack:** dark front panels, rotary-looking controls, clear numerical values, amber accents and measured gain reduction.
- **B · Warm console:** olive/graphite faceplates, warm side rails, vertical controls and cream faders.
- Skin selection changes presentation only. It does not rebuild the audio graph or change settings/history.
- Both proposals retain independent movable windows, actual curves/meters, section preset save/load, and keyboard/numeric editing. In rack mode the underlying native slider moves horizontally across the knob; arrow keys and the number field also work.

## Graphic EQ behavior

In the EQ editor select **Graphic**. This is a proposal for ten bands at 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000 and 16000 Hz, ±12 dB, with Q = √2. The count and visual direction remain for owner selection.

Opening Graphic does not alter the sound. If bands 1–10 do not already match the graphic bank, a setup panel explains the replacement and provides an explicit **Set up 10 graphic bands** action. This creates flat, enabled bell filters in those slots. It preserves bands 11–24 and every other processor. In Link mode it applies to both channels; in independent mode only the selected side changes. Undo can restore the earlier settings.

All ten gains are directly editable without individual enable steps. The graph shows the real combined filter response, including any active additional parametric bands. On narrow screens the faders form two groups of five. Frequencies above 0.45 × sample rate use the existing frequency clamp, with a visible explanation.

Returning to Parametric is lossless and retains all 24 bands. If a subsequent parametric edit makes the first ten incompatible, Graphic presents setup again instead of silently converting them. Resetting graphic gains requires an explicit confirmation and only resets those ten gains.

The existing band arrays are used for playback, WAV export, projects and section presets. There is no second EQ processing stage and no schema migration. The previous text proposal suggested using `eq.mode` for the view, but that property already stores stereo Link/Independent and is preserved. View/skin selection is temporary UI state; reopening an editor starts in Parametric. Existing undo/redo remains whole-chain history.

## Hardware research and original design

These are interaction references, not emulations. No manufacturer artwork, logos or audio presets are distributed.

| Source | Adopted idea | Deliberately outside this slice |
| --- | --- | --- |
| [Yamaha Q2031B official datasheet](https://usa.yamaha.com/files/download/other_assets/5/322305/datasheet_Q2031B_en.pdf) | Fixed-frequency fader bank, marked gain range and one EQ bypass | Its 31-band count, physical high-pass control and analogue circuitry |
| [Drawmer DL241 official product page](https://www.drawmer.com/products/pro-series/dl241.php) | Grouped dynamics controls, a separate limiter section and readable metering; front-panel photo reviewed | Gate/expander, automatic timing and proprietary analogue behavior |
| [Tascam Model 24 official product page](https://www.tascam.eu/en/model24) | Hands-on mixer direction supplied by the owner; a reference for the console option | No claim to reproduce its circuitry, routing or controls |

The Fostex Model 820 remains the earlier owner reference in Jira. Its original uploaded photograph was not available in this checkout, so this delivery does not claim a new visual comparison with it. Yamaha/Tascam full-page image retrieval was unavailable; the Yamaha datasheet text and Tascam official indexed description were available. Drawmer's front-panel image was inspected directly. The two layouts here use original CSS.

## Development validation

Environment: Linux, Node v24.22.1, npm 11.9.0.

- `npm ci`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:unit`: 318 passed. After adding the independent 1 kHz signal check, `npx vitest run tests/unit/graphic-eq.test.js` passed all 5 graphic-EQ cases, including measured +6 dB and bypass unity. Lint/build were then rerun and passed.
- `git diff --check`: passed.
- The selected Playwright run could not start Chromium: `ProcessSingleton socket() failed: Operation not permitted`. All 24 cases stopped before browser interaction. This is an environment block, not a recorded application test result. Downloading bundled Chromium/headless-shell also failed with an invalid ZIP response. A separate cloud browser could not connect to this environment's localhost.
- Browser cases were added for gain-to-engine/export, non-destructive view changes, undo, section preset round-trip, layout switching and narrow-screen access. The layout case attaches screenshots to the Playwright HTML report when it runs. These cases remain unverified here.
- Gennady's manual QA, design choice and listening acceptance: pending.

## Next development slice

After visual selection, refine the chosen layout and graphic band count; add persistent view preferences, factory starting points/preset state, and a supported skin package format. Final all-state visual review (empty, stopped, playing, bypassed, edited and narrow) and broader browser coverage remain outstanding. This preview must not be marked as completed LAS-75/76 acceptance.
