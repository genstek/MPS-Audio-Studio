#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v xcodegen >/dev/null || { echo 'Install XcodeGen on your Mac first.' >&2; exit 1; }
test -f package-lock.json || { echo 'Run this script in the complete MPS repository.' >&2; exit 1; }
npm ci
npm run build -- --base=./
mkdir -p apple/WebAssets
# Only generated assets in this exact directory are replaced.
node scripts/apple/copy-assets.mjs
xcodegen generate --spec apple/project.yml
echo 'Open apple/MPSAudioStudio.xcodeproj; select your signing team for device builds.'
