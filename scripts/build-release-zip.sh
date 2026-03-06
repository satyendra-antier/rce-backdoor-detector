#!/usr/bin/env bash
# Build a release zip for GitHub Releases (all platforms).
# Usage: ./scripts/build-release-zip.sh [version]
# Output: dist/security-scanner-<version>.zip

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${1:-1.0.0}"
DIST="$ROOT/dist"
ZIP_NAME="security-scanner-${VERSION}.zip"
STAGING="$DIST/zip-staging"

rm -rf "$STAGING"
mkdir -p "$STAGING" "$DIST"

rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='*.deb' --exclude='*.plan.md' \
  "$ROOT/" "$STAGING/security-scanner/"
rm -rf "$STAGING/security-scanner/dist"

cd "$STAGING"
zip -r "$DIST/$ZIP_NAME" security-scanner
cd "$ROOT"
rm -rf "$STAGING"

echo "Built: $DIST/$ZIP_NAME"
echo "Upload this file to the GitHub Release as an asset."
