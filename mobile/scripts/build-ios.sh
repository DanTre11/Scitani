#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
# For a device/App Store archive select your Apple team in Xcode, then Product > Archive.
