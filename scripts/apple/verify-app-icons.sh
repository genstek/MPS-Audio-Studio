#!/bin/bash
# LAS-171: verify a built macOS .app carries a compiled icon. Usage: verify-app-icons.sh <MPSMac.app>
set -euo pipefail
APP="${1:?path to .app}"
RES="$APP/Contents/Resources"
PL="$APP/Contents/Info.plist"
test -f "$RES/Assets.car" || { echo "FAIL: no Assets.car in $APP" >&2; exit 1; }
test -f "$RES/AppIcon.icns" || { echo 'FAIL: AppIcon.icns missing (default icon fallback)' >&2; exit 1; }
/usr/libexec/PlistBuddy -c 'Print :CFBundleIconName' "$PL" >/dev/null || { echo 'FAIL: CFBundleIconName missing' >&2; exit 1; }
echo "OK: icon present in $APP"
