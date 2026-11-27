# LAS-58 — development DMG resource-seal failure (issue #124)

## Observed (owner, 2026-11-27, Apple Silicon)
Development DMG from run 44881347579 (PR #120 head 288f42f6): macOS reports the app is damaged;
`codesign --verify --deep --strict --verbose=4` -> `code has no resources but signature indicates they must be present`.

## Root cause status: NOT PROVEN
No macOS host was available to the author of this change (Linux runner), so the artifact was not inspected.
Working hypothesis: the build uses `CODE_SIGNING_ALLOWED=NO`; on arm64 the linker emits an ad-hoc
(linker-signed) signature on the executable, but no bundle seal (`Contents/_CodeSignature/CodeResources`)
is produced. The signature then claims resources that the bundle does not seal. The pipeline then copied
the app with `ditto` and built the DMG without ever running `codesign --verify`.
Confirm on macOS with: `codesign -dvvv --entitlements - <app>`, `ls <app>/Contents/_CodeSignature`,
`lipo -detailed_info`, on the CI-built staged app *before* sealing (use a fresh CI artifact, not a re-signed download).

## Change
- `scripts/apple/seal-dev-app.sh`: ad-hoc seal (`--force --deep --sign -`, entitlements from `apple/Mac.entitlements`)
  of the STAGED copy after resources are final, then `codesign --verify --deep --strict`. Fails if CodeResources is absent.
- `scripts/apple/verify-dev-dmg.sh`: `hdiutil verify`, mount read-only, extract app, strict codesign verify,
  arm64+x86_64 present, minos 13.0 per slice, WebAssets present. Non-zero on failure.
- `scripts/apple/package-dev-macos.sh`: uses both; artifact names now `DEV-ADHOC`.
- Production `package-macos.sh` (Developer ID + notarization) is untouched and remains separate.

## Limits (accurate)
Ad-hoc sealing makes the bundle internally consistent for development. It is NOT Developer ID signing and NOT
notarization; a downloaded DMG is still quarantined and Gatekeeper may still warn or refuse. Do not remove
quarantine, disable Gatekeeper, or re-sign a downloaded app. Sandbox entitlements under ad-hoc signing are
unverified on hardware. Offline launch smoke has NOT been run. Owner manual MacBook QA remains pending.

## Workflow patch (not applied: the GitHub App cannot edit `.github/workflows`)
Replace the "Package development artifacts" step body in `.github/workflows/apple-build.yml` with:

```yaml
        run: |
          mkdir -p artifacts/apple-ci artifacts/dmg-stage
          ditto apple/build/Build/Products/Debug/MPSMac.app 'artifacts/dmg-stage/MPS Audio Studio.app'
          bash scripts/apple/seal-dev-app.sh 'artifacts/dmg-stage/MPS Audio Studio.app'
          ditto -c -k --keepParent 'artifacts/dmg-stage/MPS Audio Studio.app' artifacts/apple-ci/MPSMac-adhoc.zip
          ln -s /Applications artifacts/dmg-stage/Applications
          dmg=artifacts/apple-ci/MPS-Audio-Studio-development-universal-adhoc.dmg
          hdiutil create -volname 'MPS Audio Studio Development' -srcfolder artifacts/dmg-stage -format UDZO "$dmg"
          bash scripts/apple/verify-dev-dmg.sh "$dmg"
          ditto -c -k --keepParent apple/ios-build/Build/Products/Debug-iphonesimulator/MPSiOS.app artifacts/apple-ci/MPSiOS-simulator-only.zip
          (cd artifacts/apple-ci && shasum -a 256 *.dmg *.zip > SHA256SUMS.txt)
          echo "git_sha=$GITHUB_SHA" > artifacts/apple-ci/PROVENANCE.txt
```
Since the steps fail on non-zero exit, invalid packaging fails CI. A main-push trigger should be a separate workflow PR.
