#!/usr/bin/env bash
# Install security-scanner system-wide (user install: ~/.local) or system (optional).
# With command wrappers: once installed and PATH set, any "project run" (npm start, node server.js,
# python app.py, rails s, flutter run, etc.) is scanned first and blocked if threats are found.
# Usage: ./install.sh [--system]
#   --system  install to /opt/security-scanner and system systemd (requires sudo)
#   default   install to ~/.local/share/security-scanner and user systemd

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_SYSTEM=false

for arg in "$@"; do
  [ "$arg" = "--system" ] && INSTALL_SYSTEM=true
  [ "$arg" = "--help" ] || [ "$arg" = "-h" ] && {
    echo "Usage: $0 [--system]"
    echo "  default   Install for current user (~/.local/share/security-scanner, command wrappers, user systemd)"
    echo "  --system  Install to /opt/security-scanner and system systemd (sudo)"
    echo ""
    echo "System-level block: After install, put the install bin dir at the START of your PATH."
    echo "Then any 'npm start', 'node server.js', 'python app.py', 'rails s', 'flutter run' etc."
    echo "will be scanned first; if threats are found, the command is blocked."
    exit 0
  }
done

if [ "$INSTALL_SYSTEM" = true ]; then
  INSTALL_DIR="/opt/security-scanner"
  BIN_DIR="/usr/local/bin"
  SYSTEMD_DIR="/etc/systemd/system"
  CONFIG_DIR="/etc/security-scanner"
  [ -z "$SUDO_UID" ] && [ "$(id -u)" -ne 0 ] && echo "Run with sudo for --system install." && exit 1
  mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$CONFIG_DIR"
  cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
  # CLI binary
  echo "#!/bin/sh" > "$BIN_DIR/security-scanner"
  echo "exec node '$INSTALL_DIR/cli.js' \"\$@\"" >> "$BIN_DIR/security-scanner"
  chmod +x "$BIN_DIR/security-scanner"
  if command -v node >/dev/null 2>&1; then
    REAL_BINARIES=$(cd "$INSTALL_DIR" && node scripts/detect-binaries.js 2>/dev/null || echo "{}")
    if [ -n "$REAL_BINARIES" ] && [ "$REAL_BINARIES" != "{}" ]; then
      export SECURITY_SCANNER_CONFIG_FILE="$CONFIG_DIR/config.json"
      echo "$REAL_BINARIES" | (cd "$INSTALL_DIR" && node scripts/merge-real-binaries.js) 2>/dev/null || true
    fi
  fi
  # Command wrappers: always use real NODE to run run-wrapper.js (which then invokes real npm/node/etc from config)
  # Resolve node without BIN_DIR in PATH so we do not pick up our own wrapper when re-installing
  PATH_WITHOUT_BIN=$(printf '%s\n' "$PATH" | tr ':' '\n' | grep -vFx "$BIN_DIR" | tr '\n' ':' | sed 's/:$//')
  REAL_NODE=$(PATH="$PATH_WITHOUT_BIN" command -v node 2>/dev/null || true)
  [ -z "$REAL_NODE" ] && echo "Warning: node not found; no wrappers installed."
  for cmd in node npm npx python3 python ruby bundle rails flutter dart; do
    PATH="$PATH_WITHOUT_BIN" command -v "$cmd" >/dev/null 2>&1 || continue
    sed "s|REAL_BINARY_PLACEHOLDER|$REAL_NODE|g" "$INSTALL_DIR/bin/wrapper.sh" | \
      sed "s|SCANNER_DIR_PLACEHOLDER|$INSTALL_DIR|g" | \
      sed "s|COMMAND_NAME_PLACEHOLDER|$cmd|g" > "$BIN_DIR/$cmd"
    chmod +x "$BIN_DIR/$cmd"
  done
  # systemd
  sed "s|INSTALL_DIR_PLACEHOLDER|$INSTALL_DIR|g" "$SCRIPT_DIR/systemd/security-scanner.service" | sed "s|HOME_PLACEHOLDER|/root|g" > "$SYSTEMD_DIR/security-scanner.service"
  cp "$SCRIPT_DIR/systemd/security-scanner.timer" "$SYSTEMD_DIR/"
  systemctl daemon-reload
  echo "Installed to $INSTALL_DIR, binary: $BIN_DIR/security-scanner"
  echo "Command wrappers (system-level block): $BIN_DIR/{node,npm,npx,python3,...}"
  echo "Ensure $BIN_DIR is in PATH (often already is). Then npm start, node server.js, etc. will be scanned first (block only; no codebase destruction)."
  echo "Enable timer: sudo systemctl enable --now security-scanner.timer"
  echo "Run once:     sudo systemctl start security-scanner"
  [ -n "$REAL_NODE" ] && [ -x "$REAL_NODE" ] && "$REAL_NODE" "$INSTALL_DIR/scripts/banner.js" 2>/dev/null || true
else
  INSTALL_DIR="${HOME}/.local/share/security-scanner"
  BIN_DIR="${HOME}/.local/bin"
  CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/security-scanner"
  SYSTEMD_USER="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$CONFIG_DIR" "$SYSTEMD_USER"
  cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
  # Resolve PATH without our bin so we use real node during install (avoid wrapper recursion)
  PATH_WITHOUT_BIN=$(printf '%s\n' "$PATH" | tr ':' '\n' | grep -vFx "$BIN_DIR" | tr '\n' ':' | sed 's/:$//')
  # CLI binary
  echo "#!/bin/sh" > "$BIN_DIR/security-scanner"
  echo "exec node '$INSTALL_DIR/cli.js' \"\$@\"" >> "$BIN_DIR/security-scanner"
  chmod +x "$BIN_DIR/security-scanner"
  if PATH="$PATH_WITHOUT_BIN" command -v node >/dev/null 2>&1; then
    REAL_BINARIES=$(cd "$INSTALL_DIR" && PATH="$PATH_WITHOUT_BIN" node scripts/detect-binaries.js 2>/dev/null || echo "{}")
    if [ -n "$REAL_BINARIES" ] && [ "$REAL_BINARIES" != "{}" ]; then
      export SECURITY_SCANNER_CONFIG_FILE="$CONFIG_DIR/config.json"
      echo "$REAL_BINARIES" | (cd "$INSTALL_DIR" && PATH="$PATH_WITHOUT_BIN" node scripts/merge-real-binaries.js) 2>/dev/null || true
    fi
  fi
  # Command wrappers: always use real NODE to run run-wrapper.js (which then invokes real npm/node/etc from config)
  REAL_NODE=$(PATH="$PATH_WITHOUT_BIN" command -v node 2>/dev/null || true)
  [ -z "$REAL_NODE" ] && echo "Warning: node not found; no wrappers installed."
  for cmd in node npm npx python3 python ruby bundle rails flutter dart; do
    PATH="$PATH_WITHOUT_BIN" command -v "$cmd" >/dev/null 2>&1 || continue
    sed "s|REAL_BINARY_PLACEHOLDER|$REAL_NODE|g" "$INSTALL_DIR/bin/wrapper.sh" | \
      sed "s|SCANNER_DIR_PLACEHOLDER|$INSTALL_DIR|g" | \
      sed "s|COMMAND_NAME_PLACEHOLDER|$cmd|g" > "$BIN_DIR/$cmd"
    chmod +x "$BIN_DIR/$cmd"
  done
  # systemd user
  sed "s|INSTALL_DIR_PLACEHOLDER|$INSTALL_DIR|g" "$SCRIPT_DIR/systemd/security-scanner.service" | sed "s|HOME_PLACEHOLDER|$HOME|g" > "$SYSTEMD_USER/security-scanner.service"
  cp "$SCRIPT_DIR/systemd/security-scanner.timer" "$SYSTEMD_USER/"
  # Auto-add PATH to shell profiles so wrappers are used without manual steps
  add_path_line() {
    local profile="$1"
    local line="export PATH=\"$BIN_DIR:\$PATH\""
    [ ! -f "$profile" ] && return
    if grep -qF "$BIN_DIR" "$profile" 2>/dev/null; then
      return
    fi
    echo "" >> "$profile"
    echo "# security-scanner: use command wrappers (node, npm, python, etc.)" >> "$profile"
    echo "$line" >> "$profile"
    echo "  Added PATH to $profile"
  }
  add_path_line "$HOME/.bashrc"
  add_path_line "$HOME/.zshrc"
  [ -f "$HOME/.profile" ] && ! grep -qF "$BIN_DIR" "$HOME/.profile" 2>/dev/null && add_path_line "$HOME/.profile"
  echo ""
  echo "Installed to $INSTALL_DIR"
  echo "Binary: $BIN_DIR/security-scanner"
  echo "Config: $CONFIG_DIR/config.json"
  echo ""
  echo "=== System-level block (project run interception) ==="
  echo "Command wrappers were installed to: $BIN_DIR"
  echo "  (node, npm, npx, python3, python, ruby, bundle, rails, flutter, dart)"
  echo "  PATH was added to your shell profile. Open a new terminal or run: source ~/.bashrc"
  echo ""
  echo "Then, without running any scan manually:"
  echo "  - npm start, node server.js, etc. → scanner runs on current dir first; blocks if threats found"
  echo "  - python app.py, rails s, flutter run → same"
  echo ""
  echo "User systemd: $SYSTEMD_USER"
  echo "  systemctl --user start security-scanner   # run once"
  echo "  systemctl --user enable --now security-scanner.timer   # daily"
  [ -x "$REAL_NODE" ] && "$REAL_NODE" "$INSTALL_DIR/scripts/banner.js" 2>/dev/null || true
fi
