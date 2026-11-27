#!/bin/bash
# Verify a development DMG: image integrity, then extract the app from the mounted image and
# check strict codesign, architectures and minimum macOS. Fails (non-zero) on any problem.
# Usage: verify-dev-dmg.sh <file.dmg>
set -euo pipefail
dmg="${1:?usage: verify-dev-dmg.sh file.dmg}"
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS required.' >&2; exit 1; }
hdiutil verify "$dmg"
work="$(mktemp -d)"; mnt="$work/mnt"; mkdir "$mnt"
cleanup() { hdiutil detach "$mnt" -quiet 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT
hdiutil attach "$dmg" -readonly -nobrowse -noverify -mountpoint "$mnt" -quiet
ditto "$mnt/MPS Audio Studio.app" "$work/extracted.app"
app="$work/extracted.app"
codesign --verify --deep --strict --verbose=4 "$app"
exe="$app/Contents/MacOS/$(plutil -extract CFBundleExecutable raw "$app/Contents/Info.plist")"
archs="$(lipo -archs "$exe")"
for a in arm64 x86_64; do
  [[ " $archs " == *" $a "* ]] || { echo "FAIL: DMG app lacks $a (has: $archs)" >&2; exit 1; }
done
# Check minos per architecture slice.
for a in arm64 x86_64; do
  m="$(otool -arch "$a" -l "$exe" | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print $2; exit}')"
  [[ "$m" == 13.0 ]] || { echo "FAIL: $a minos '$m' != 13.0" >&2; exit 1; }
done
test -d "$app/Contents/Resources/WebAssets" || { echo 'FAIL: WebAssets missing' >&2; exit 1; }
codesign -dvv --entitlements - "$app" 2>&1 | grep -E 'Identifier|Signature|CodeDirectory|Sealed|com.apple' || true
echo "DMG verified: $dmg (archs: $archs)"
