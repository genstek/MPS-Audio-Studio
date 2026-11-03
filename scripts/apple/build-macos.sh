#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS and Xcode are required.' >&2; exit 1; }
command -v xcodebuild >/dev/null
bash scripts/apple/prepare.sh
mkdir -p artifacts/apple
if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
  xcodebuild -project apple/MPSAudioStudio.xcodeproj -scheme MPSMac -configuration Release \
    -destination 'generic/platform=macOS' -derivedDataPath apple/build \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" build
else
  xcodebuild -project apple/MPSAudioStudio.xcodeproj -scheme MPSMac -configuration Debug \
    -destination 'platform=macOS' -derivedDataPath apple/build CODE_SIGNING_ALLOWED=NO build
fi
echo 'Build only. Use package-macos.sh with a Developer ID identity for a distributable DMG.'
