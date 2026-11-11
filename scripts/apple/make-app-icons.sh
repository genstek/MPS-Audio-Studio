#!/bin/bash
# LAS-171: build AppIcon sets from the owner-approved artwork. This script never generates artwork.
# Usage (macOS only, needs sips): scripts/apple/make-app-icons.sh <mac-1024-rgba.png> <ios-1024-opaque.png>
set -euo pipefail
cd "$(dirname "$0")/../.."
MAC_SRC="${1:?macOS 1024x1024 RGBA PNG required}"
IOS_SRC="${2:?iOS 1024x1024 opaque PNG required}"
command -v sips >/dev/null || { echo 'sips (macOS) required.' >&2; exit 1; }
MAC=apple/Resources/Mac/Assets.xcassets/AppIcon.appiconset
IOS=apple/Resources/iOS/Assets.xcassets/AppIcon.appiconset
prop() { sips -g "$2" "$1" | awk -v k="$2" '$1==k":"{print $2}'; }
for f in "$MAC_SRC" "$IOS_SRC"; do
  [ "$(prop "$f" pixelWidth)" = 1024 ] && [ "$(prop "$f" pixelHeight)" = 1024 ] || { echo "$f must be 1024x1024" >&2; exit 1; }
done
[ "$(prop "$MAC_SRC" hasAlpha)" = yes ] || { echo 'macOS source must be RGBA with transparent rounded corners' >&2; exit 1; }
[ "$(prop "$IOS_SRC" hasAlpha)" = no ] || { echo 'iOS source must be opaque (no alpha)' >&2; exit 1; }
imgs=""
for n in 16 32 128 256 512; do
  for s in 1 2; do
    px=$((n*s)); out="icon_${n}x${n}@${s}x.png"
    sips -z "$px" "$px" "$MAC_SRC" --out "$MAC/$out" >/dev/null
    imgs="$imgs{\"filename\":\"$out\",\"idiom\":\"mac\",\"scale\":\"${s}x\",\"size\":\"${n}x${n}\"},"
  done
done
printf '{"images":[%s],"info":{"author":"xcode","version":1}}\n' "${imgs%,}" > "$MAC/Contents.json"
cp "$IOS_SRC" "$IOS/AppIcon-1024.png"
printf '%s\n' '{"images":[{"filename":"AppIcon-1024.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}' > "$IOS/Contents.json"
echo 'Icons written. Inspect the 16/32/64/128 px renditions, then commit.'
