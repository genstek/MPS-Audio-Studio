#!/bin/bash
# Build and package an UNSIGNED, owner-only development DMG from the current checkout.
# Not a production installer: not Developer ID signed, not notarized.
# Usage: bash scripts/apple/package-dev-macos.sh [--skip-build]
set -euo pipefail
cd "$(dirname "$0")/../.."
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS and Xcode are required.' >&2; exit 1; }

# Never inherit signing settings: this pipeline is deliberately separate from package-macos.sh.
unset APPLE_TEAM_ID MAC_SIGN_IDENTITY NOTARY_PROFILE

if [[ "${1:-}" != --skip-build ]]; then
  bash scripts/apple/build-macos.sh
fi

app='apple/build/Build/Products/Debug/MPSMac.app'
test -d "$app" || { echo "Missing $app. Run without --skip-build." >&2; exit 1; }

sha="$(git rev-parse --short=12 HEAD)"
dirty=''
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || dirty='-dirty'
version="$(plutil -extract CFBundleShortVersionString raw "$app/Contents/Info.plist")"
build="$(plutil -extract CFBundleVersion raw "$app/Contents/Info.plist")"
exe="$app/Contents/MacOS/$(plutil -extract CFBundleExecutable raw "$app/Contents/Info.plist")"
name="MPS-Audio-Studio-${version}+${build}-${sha}${dirty}-DEV-UNSIGNED"

out="artifacts/apple-dev/$name"
test ! -e "$out" || { echo "$out already exists; move it first." >&2; exit 1; }
mkdir -p "$out"

# Compatibility evidence from the actual executable (not the file name).
archs="$(lipo -archs "$exe")"
minos="$(otool -l "$exe" | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print $2; exit}')"
plist_min="$(plutil -extract LSMinimumSystemVersion raw "$app/Contents/Info.plist" 2>/dev/null || echo 'not set')"
for a in x86_64 arm64; do
  [[ " $archs " == *" $a "* ]] || { echo "FAIL: executable lacks $a (has: $archs)" >&2; exit 1; }
done
[[ "$minos" == 13.0 ]] || { echo "FAIL: minos is '$minos', expected 13.0" >&2; exit 1; }
test -f "$app/Contents/Resources/WebAssets/index.html" || test -d "$app/Contents/Resources/WebAssets" \
  || { echo 'FAIL: WebAssets missing from bundle (app would need a server).' >&2; exit 1; }

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
ditto "$app" "$stage/MPS Audio Studio.app"
ln -s /Applications "$stage/Applications"
hdiutil create -volname 'MPS Audio Studio DEV (unsigned)' -srcfolder "$stage" -ov -format UDZO "$out/$name.dmg"
ditto -c -k --keepParent "$app" "$out/$name-app.zip"

{
  echo "build_type: DEBUG, UNSIGNED, DEVELOPMENT ONLY (not notarized; not for distribution)"
  echo "git_sha: $(git rev-parse HEAD)${dirty}"
  echo "git_branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "built_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "app_version: $version ($build)"
  echo "host_macos: $(sw_vers -productVersion)"
  echo "xcode: $(xcodebuild -version | tr '\n' ' ')"
  echo "executable_archs: $archs"
  echo "min_macos_load_command: $minos"
  echo "LSMinimumSystemVersion: $plist_min"
  echo "codesign: $(codesign -dv "$app" 2>&1 | grep -E 'Signature|flags' | tr '\n' ' ')"
} > "$out/PROVENANCE.txt"

( cd "$out" && shasum -a 256 "$name.dmg" "$name-app.zip" > SHA256SUMS.txt )
cat "$out/PROVENANCE.txt"
echo "Output: $out"
cat "$out/SHA256SUMS.txt"
echo 'DEVELOPMENT BUILD ONLY: unsigned, not notarized. Gatekeeper will warn; see docs/delivery/LAS-58/RELEASE-RUNBOOK.md.'
