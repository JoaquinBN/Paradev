#!/bin/bash
# Builds Wank, installs it to ~/Applications and (re)launches it.
set -euo pipefail
cd "$(dirname "$0")"
swift build -c release
APP="$HOME/Applications/Wank.app"
# Earlier builds were called Show Me, then Wank.
for old in Wank ShowMe; do pkill -x "$old" 2>/dev/null && sleep 1; done
# The helper was briefly also called Wanker.app, the name of the main app.
pkill -f "Applications/Wanker.app/Contents/MacOS" 2>/dev/null && sleep 1
rm -rf "$APP" "$HOME/Applications/Wanker.app" "$HOME/Applications/ShowMe.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp .build/release/ShowMe "$APP/Contents/MacOS/Wank"
cp Info.plist "$APP/Contents/Info.plist"
cp Resources/compiler.md "$APP/Contents/Resources/compiler.md"
# A stable identity keeps macOS permissions across rebuilds; ad-hoc signing resets them.
IDENTITY=$(security find-identity -v -p codesigning | awk -F'"' '/Apple Development|Developer ID Application/ {print $2; exit}')
codesign --force --sign "${IDENTITY:--}" "$APP"
open "$APP"
echo "Installed $APP"
