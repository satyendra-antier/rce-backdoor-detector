#!/usr/bin/env bash
# One-line install for security-scanner (user install to ~/.local).
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/security-scanner/main/get.sh | bash
#    or: curl -fsSL https://.../get.sh | bash
# If run from inside a security-scanner repo, uses local install.sh; otherwise clones and runs install.

set -e
REPO_URL="${SECURITY_SCANNER_REPO:-https://github.com/your-org/security-scanner.git}"
BRANCH="${SECURITY_SCANNER_BRANCH:-main}"

if [ -f "install.sh" ] && [ -f "cli.js" ]; then
  echo "Using current directory (security-scanner repo)."
  chmod +x install.sh
  ./install.sh
  exit 0
fi

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
if command -v git >/dev/null 2>&1; then
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$TMP/repo"
  cd "$TMP/repo"
else
  echo "git not found. Download install.sh and run: bash install.sh"
  exit 1
fi
chmod +x install.sh
./install.sh