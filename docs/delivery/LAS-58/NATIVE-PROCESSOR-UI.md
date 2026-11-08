# Processor UI in native and web builds without a URL flag (LAS-58 / LAS-75 / LAS-76, issue #67)

## Cause
`src/main.jsx` enabled the processor preview only for `?design=processors`. The bundled macOS/iOS apps load
`apple/WebAssets/index.html` with no query, so the Graphic EQ tab and processor skins were never shown, even in a fresh build.

## Change
- A compact **Interface mode** selector (Normal / Processor Preview) sits at the left of the studio footer, in web and native builds. `?design=processors` still opens the preview on the web.
- The mode and the Graphite rack / Warm console skin are saved in `localStorage` (`mps.uiMode`, `mps.processorSkin`). They are presentation-only: not in projects, presets or exports, and never read by the audio engine.
- Preview mode shows the EQ Graphic/Parametric tabs and the rack/console layouts (still labelled "design pending"; not finished production skins). The 10-band setup stays an explicit "Set up 10 graphic bands" action that replaces parameters 1–10 and can be undone. Switching mode, tab or skin changes no DSP.
- Not part of this change: AI Co-Producer (#59) and Mastering DSP expansion (#56).
- `apple/project.yml` is unchanged (macOS 13.0, iOS 16.0).

## Build provenance (avoiding "old build" confusion)
- `npm run build` embeds the short git SHA; hover the Interface mode selector to see it (`build <sha>`).
- `scripts/apple/copy-assets.mjs` (run by `scripts/apple/prepare.sh`) deletes and recopies `dist` into `apple/WebAssets` and now writes `apple/WebAssets/build-info.json` with `gitSha`, `builtAt` and `assetDigest`.
- Check: `git rev-parse --short HEAD` equals the tooltip SHA and `build-info.json`; `ls apple/WebAssets/assets` matches `dist/assets`.
- If the selector is missing in the app, the bundle is old: rerun `bash scripts/apple/prepare.sh` then `bash scripts/apple/build-macos.sh` (remove `apple/build` if Xcode shows stale assets).
- `copy-assets.mjs` was **not executed** in the authoring environment (no approval for it); its change is untested. `prepare.sh` needs XcodeGen and was not run.

## Manual QA — NOT PERFORMED (macOS 13+ Intel/Apple Silicon, iOS 16+)
1. Run prepare and build, launch; confirm the footer selector and that the tooltip SHA matches HEAD.
2. Default is Normal: the EQ has no Graphic tab. Choose Processor Preview: toolbar and Graphic/Parametric tabs appear.
3. Load a WAV; toggle mode, skins and EQ tabs during playback: the sound must not change.
4. Click "Set up 10 graphic bands" (warning shown), move a fader, Undo restores the previous curve.
5. Quit and relaunch: mode and skin persist. Save/Open Project, Hi-Res WAV export, Dynamics and Limiter still work.
6. iPhone/iPad: the selector is reachable and layouts do not overflow in portrait and landscape.
