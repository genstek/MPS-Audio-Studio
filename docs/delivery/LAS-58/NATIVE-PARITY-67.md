# Native app parity (issue #67) — LAS-58 / LAS-75 / LAS-76

## Change
The `?design=processors` flag is removed. Graphic/Parametric EQ tabs, the Graphite rack / Warm console layout chooser and hardware-style Dynamics/Limiter are now in the ordinary studio UI, so the bundled MPSMac.app and MPSiOS.app show them with no URL query. The layout chooser is labelled "prototype skins": skins are presentation only. Switching view or skin never changes DSP, presets or projects. Setting up 10 graphic bands stays explicit (replaces parameters 1–10) and Undo restores them.

## Clean native build (macOS Ventura 13.7.8 Intel, Xcode 15.2, XcodeGen 2.41.0) — NOT_RUN here
```
git checkout main && git pull && git status   # must be clean
rm -rf dist apple/WebAssets apple/MPSAudioStudio.xcodeproj
bash scripts/apple/prepare.sh                  # npm ci, build --base=./, copy to apple/WebAssets, xcodegen
cat apple/WebAssets/BUILD-INFO.txt             # git SHA + index.html sha256
bash scripts/apple/build-macos.sh
bash scripts/apple/build-ios.sh                # iOS Simulator, minimum iOS 16.0
```
Minimums in `apple/project.yml` are unchanged: macOS 13.0, iOS 16.0.

Provenance: the `BUILD-INFO.txt` SHA must equal `git rev-parse HEAD`, and `grep -l "Processor layout" apple/WebAssets/assets/*.js` must match. The installed app's `Contents/Resources` copy of the assets should carry the same `BUILD-INFO.txt`.

## Manual QA (NOT_RUN — needs a Mac / Simulator)
1. Launch MPSMac.app, import a WAV, Edit EQ: Graphic and Parametric tabs are visible with no flag.
2. Graphic → "Set up 10 graphic bands" → move faders → Undo restores the previous curve.
3. Toggle A · Graphite rack / B · Warm console: sound and parameters unchanged.
4. Check Dynamics, Limiter, Space, master level, Save/Open Project, Hi-Res 96 kHz/24-bit export, draggable windows, tooltips.
5. Repeat on the iOS Simulator (16.0+).

## Distribution
Unsigned local .app and simulator builds are not releases. A distributable DMG needs Developer ID signing and notarization; a real iPhone needs a signed device build with provisioning. No credentials are available in CI here.

## Not implemented (separate work)
AI Co-Producer (#59), Neo UI and Mastering DSP expansion (#56) are not done. Processor skins are prototype designs, not final production skins.
