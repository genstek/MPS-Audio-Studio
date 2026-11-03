#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS and Xcode are required.' >&2; exit 1; }
mode="${1:-simulator}"
[[ "$mode" == simulator || "$mode" == archive ]] || { echo 'Usage: build-ios.sh [simulator|archive]' >&2; exit 1; }
if [[ "$mode" == archive ]]; then
  : "${APPLE_TEAM_ID:?Set your signing team before creating a device archive}"
fi
bash scripts/apple/prepare.sh
if [[ "$mode" == simulator ]]; then
  xcodebuild -project apple/MPSAudioStudio.xcodeproj -scheme MPSiOS -configuration Debug \
    -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath apple/build CODE_SIGNING_ALLOWED=NO build
else
  mkdir -p artifacts/apple
  xcodebuild -project apple/MPSAudioStudio.xcodeproj -scheme MPSiOS -configuration Release \
    -destination 'generic/platform=iOS' -archivePath artifacts/apple/MPSiOS.xcarchive \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" archive
  echo 'Open the archive in Xcode Organizer to validate and choose an authorized distribution method.'
fi
