#!/bin/bash
# Development-only: ad-hoc seal a freshly built, UNSIGNED-build app AFTER all resources are final,
# then strictly verify. Ad-hoc is NOT Developer ID and NOT notarization; Gatekeeper will still
# not treat a downloaded build as notarized. Production signing stays in package-macos.sh.
# Usage: seal-dev-app.sh <path/to/staged.app>   (operate on the staged copy, never a downloaded app)
set -euo pipefail
cd "$(dirname "$0")/../.."
app="${1:?usage: seal-dev-app.sh App.app}"
test -d "$app" || { echo "Missing $app" >&2; exit 1; }
# Replace any linker-generated/partial signature with one whole-bundle seal (covers CodeResources).
codesign --force --deep --sign - --timestamp=none --entitlements apple/Mac.entitlements "$app"
test -f "$app/Contents/_CodeSignature/CodeResources" \
  || { echo 'FAIL: CodeResources missing after sealing' >&2; exit 1; }
codesign --verify --deep --strict --verbose=4 "$app"
echo "Sealed (ad-hoc, development only) and verified: $app"
