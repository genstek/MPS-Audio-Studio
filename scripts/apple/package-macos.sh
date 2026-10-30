#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${MAC_SIGN_IDENTITY:?Set your Developer ID Application identity from Keychain}"
: "${NOTARY_PROFILE:?Set an existing notarytool Keychain profile}"
app='apple/build/Build/Products/Release/MPSMac.app'
test -d "$app" || { echo 'Build the Release app first.' >&2; exit 1; }
codesign --force --options runtime --timestamp --entitlements apple/Mac.entitlements --sign "$MAC_SIGN_IDENTITY" "$app"
codesign --verify --deep --strict "$app"
mkdir -p artifacts/apple
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
ditto "$app" "$stage/MPS Audio Studio.app"
ln -s /Applications "$stage/Applications"
output="artifacts/apple/MPS-Audio-Studio-$(uname -m).dmg"
test ! -e "$output" || { echo 'Move the existing DMG before creating another.' >&2; exit 1; }
hdiutil create -volname 'MPS Audio Studio' -srcfolder "$stage" -ov -format UDZO "$output"
codesign --timestamp --sign "$MAC_SIGN_IDENTITY" "$output"
xcrun notarytool submit "$output" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$output"
xcrun stapler validate "$output"
shasum -a 256 "$output" > "$output.sha256"
echo 'DMG created. Installation, offline audio and clean-machine QA are still required.'
