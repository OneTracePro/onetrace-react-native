#!/bin/bash
# Copies the sources of OneTrace for iOS (OneTracePro/onetrace-ios) at a tag or commit into ios/OneTraceSDK.
#
# The pod compiles them together with the module: the iOS SDK is a Swift package, and linking a Swift package to a
# Swift pod (spm_dependency) needs dynamic frameworks in the app. CI checks that the copy matches ios/OneTraceSDK/VERSION.
#
# Usage: scripts/vendor-ios-sdk.sh [ref]   (default: the ref in ios/OneTraceSDK/VERSION)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
target="$root/ios/OneTraceSDK"
ref="${1:-$(cat "$target/VERSION")}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git clone --quiet https://github.com/OneTracePro/onetrace-ios.git "$work/sdk"
git -C "$work/sdk" -c advice.detachedHead=false checkout --quiet "$ref"

rm -rf "$target"
mkdir -p "$target"
cp -R "$work/sdk/Sources/OneTrace/." "$target/"
cp "$work/sdk/LICENSE" "$target/LICENSE"
echo "$ref" > "$target/VERSION"
echo "OneTrace for iOS $ref → ios/OneTraceSDK"
