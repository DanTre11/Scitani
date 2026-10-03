#!/usr/bin/env bash
set -euo pipefail
# Password files contain only the password. Never commit these files or the keystore.
: "${SCITANI_KEYSTORE:?Path to release keystore}"
: "${SCITANI_PASSWORD_FILE:?Path to keystore password file}"
: "${ANDROID_HOME:?Android SDK path}"
cd "$(dirname "$0")/.."
mkdir -p releases
"$ANDROID_HOME/build-tools/36.0.0/apksigner" sign --ks "$SCITANI_KEYSTORE" --ks-key-alias "${SCITANI_KEY_ALIAS:-scitani-upload}" --ks-pass "file:$SCITANI_PASSWORD_FILE" --out releases/Scitani-dopravy-1.5.0.apk android/app/build/outputs/apk/release/app-release-unsigned.apk
cp android/app/build/outputs/bundle/release/app-release.aab releases/Scitani-dopravy-1.5.0.aab
jarsigner -keystore "$SCITANI_KEYSTORE" -storepass:file "$SCITANI_PASSWORD_FILE" releases/Scitani-dopravy-1.5.0.aab "${SCITANI_KEY_ALIAS:-scitani-upload}"
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose releases/Scitani-dopravy-1.5.0.apk
