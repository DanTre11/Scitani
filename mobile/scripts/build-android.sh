#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run sync
cd android
./gradlew assembleRelease bundleRelease
