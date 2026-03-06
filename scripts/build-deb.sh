#!/usr/bin/env bash
# Build a .deb package for security-scanner (install to /opt, wrappers in /usr/local/bin).
# Usage: ./scripts/build-deb.sh [version]
# Output: dist/security-scanner_<version>_amd64.deb

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${1:-1.0.0}"
PKG_NAME="security-scanner"
DIST="$ROOT/dist"
STAGING="$DIST/staging"
INSTALL_DIR="/opt/security-scanner"
BIN_DIR="/usr/local/bin"

rm -rf "$STAGING"
mkdir -p "$STAGING/$INSTALL_DIR"
mkdir -p "$STAGING$BIN_DIR"
mkdir -p "$STAGING/DEBIAN"

# Copy project (exclude dev/git)
rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='*.deb' \
  "$ROOT/" "$STAGING/$INSTALL_DIR/"
rm -rf "$STAGING/$INSTALL_DIR/dist"

# CLI binary in /usr/local/bin
cat > "$STAGING$BIN_DIR/security-scanner" << EOF
#!/bin/sh
exec node '$INSTALL_DIR/cli.js' "\$@"
EOF
chmod +x "$STAGING$BIN_DIR/security-scanner"

# postinst: create wrappers (same logic as install.sh --system)
cat > "$STAGING/DEBIAN/postinst" << 'POSTINST'
#!/bin/sh
set -e
INSTALL_DIR="/opt/security-scanner"
BIN_DIR="/usr/local/bin"
CONFIG_DIR="/etc/security-scanner"
mkdir -p "$CONFIG_DIR"
REAL_NODE=$(command -v node 2>/dev/null || true)
[ -n "$REAL_NODE" ] && for cmd in node npm npx python3 python ruby bundle rails flutter dart; do
  command -v "$cmd" >/dev/null 2>&1 || continue
  sed "s|REAL_BINARY_PLACEHOLDER|$REAL_NODE|g" "$INSTALL_DIR/bin/wrapper.sh" | \
    sed "s|SCANNER_DIR_PLACEHOLDER|$INSTALL_DIR|g" | \
    sed "s|COMMAND_NAME_PLACEHOLDER|$cmd|g" > "$BIN_DIR/$cmd"
  chmod +x "$BIN_DIR/$cmd"
done
if command -v node >/dev/null 2>&1; then
  REAL_BINARIES=$(cd "$INSTALL_DIR" && node scripts/detect-binaries.js 2>/dev/null || echo "{}")
  if [ -n "$REAL_BINARIES" ] && [ "$REAL_BINARIES" != "{}" ]; then
    export SECURITY_SCANNER_CONFIG_FILE="$CONFIG_DIR/config.json"
    echo "$REAL_BINARIES" | (cd "$INSTALL_DIR" && node scripts/merge-real-binaries.js) 2>/dev/null || true
  fi
fi
echo "security-scanner installed. Run: security-scanner --help"
POSTINST
chmod 755 "$STAGING/DEBIAN/postinst"

# control
cat > "$STAGING/DEBIAN/control" << EOF
Package: $PKG_NAME
Version: $VERSION
Section: utils
Priority: optional
Architecture: all
Depends: nodejs
Maintainer: Security Scanner <noreply@localhost>
Description: RCE/backdoor security scanner for JS, Python, Ruby, Dart
 Scans codebases for malicious patterns and can block runs (npm start,
 node server.js, python app.py, etc.) when threats are found.
 Blocks run if threats are found; no automatic deletion.
EOF

cd "$DIST"
dpkg-deb --root-owner-group -b staging "${PKG_NAME}_${VERSION}_all.deb"
rm -rf staging
echo "Built: $DIST/${PKG_NAME}_${VERSION}_all.deb"
echo "Install: sudo dpkg -i $DIST/${PKG_NAME}_${VERSION}_all.deb"