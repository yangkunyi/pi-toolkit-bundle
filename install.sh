#!/usr/bin/env bash
set -e

REPO_URL="https://github.com/yangkunyi/pi-toolkit-bundle.git"
INSTALL_DIR="${HOME}/.local/share/pi-toolkit-bundle"
BIN_DIR="${HOME}/.local/bin"
PI_AGENT_DIR="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}"
AGENTS_SKILLS_DIR="${HOME}/.agents/skills"

# Ensure ~/.local/bin is in PATH for this script session
mkdir -p "$BIN_DIR"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  export PATH="$BIN_DIR:$PATH"
fi

echo "========================================================"
echo "    Pi + Cairn + Sidekick All-in-One Installer"
echo "========================================================"

# Detect whether running from an existing local clone or via curl | bash
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/package.json" ]; then
  BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  echo "--> Running in zero-clone mode..."
  if [ -d "$INSTALL_DIR/.git" ]; then
    echo "  Updating existing toolkit in $INSTALL_DIR..."
    git -C "$INSTALL_DIR" pull --quiet || true
  else
    echo "  Downloading pi-toolkit-bundle into $INSTALL_DIR..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
  BUNDLE_DIR="$INSTALL_DIR"
fi

mkdir -p "$PI_AGENT_DIR"
mkdir -p "$AGENTS_SKILLS_DIR"

# Helper: Install user-space standalone Node.js (zero sudo needed)
install_user_node() {
  echo "--> Installing user-space Node.js (v24.19.0 LTS) into ~/.local..."
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
      echo "✗ Unsupported architecture for auto-install: $ARCH"
      echo "  Please manually install Node.js >= 22.19.0 and re-run."
      return 1
      ;;
  esac

  NODE_VER="v24.19.0"
  NODE_PKG="node-${NODE_VER}-${OS}-${ARCH}"
  TARBALL="${NODE_PKG}.tar.gz"
  NODE_DIR="${HOME}/.local/${NODE_PKG}"

  mkdir -p "${HOME}/.local"
  TMP_TAR="/tmp/${TARBALL}"

  echo "  Downloading ${TARBALL}..."
  DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VER}/${TARBALL}"
  MIRROR_URL="https://npmmirror.com/mirrors/node/${NODE_VER}/${TARBALL}"

  if ! curl -fsSL --connect-timeout 8 "$DOWNLOAD_URL" -o "$TMP_TAR" 2>/dev/null; then
    echo "  Primary download timed out, trying npmmirror..."
    curl -fsSL "$MIRROR_URL" -o "$TMP_TAR" || {
      echo "✗ Failed to download Node.js archive."
      return 1
    }
  fi

  echo "  Extracting Node.js into ~/.local..."
  tar -xzf "$TMP_TAR" -C "${HOME}/.local"
  rm -f "$TMP_TAR"

  ln -sfn "${NODE_DIR}" "${HOME}/.local/node-current"
  ln -sf "${NODE_DIR}/bin/node" "${BIN_DIR}/node"
  ln -sf "${NODE_DIR}/bin/npm" "${BIN_DIR}/npm"
  ln -sf "${NODE_DIR}/bin/npx" "${BIN_DIR}/npx"

  export PATH="${BIN_DIR}:${NODE_DIR}/bin:$PATH"
  echo "✓ Installed user-space Node.js $(node -v) into ~/.local"
}

# 1. Check & Ensure Modern Node.js (>= 22.19.0)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  \. "$HOME/.nvm/nvm.sh" 2>/dev/null || true
fi

NEED_NODE=0
if ! command -v node >/dev/null 2>&1; then
  echo "⚠ Node.js not detected on PATH."
  NEED_NODE=1
else
  CURRENT_NODE_VER="$(node -v 2>/dev/null || echo "v0.0.0")"
  NODE_MAJOR="$(echo "$CURRENT_NODE_VER" | sed -E 's/^v([0-9]+).*/\1/')"
  NODE_MINOR="$(echo "$CURRENT_NODE_VER" | sed -E 's/^v[0-9]+\.([0-9]+).*/\1/')"

  if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 22 ]; then
    echo "⚠ Detected existing Node.js $CURRENT_NODE_VER, but Pi requires Node.js >= 22.19.0."
    NEED_NODE=1
  elif [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 19 ]; then
    echo "⚠ Detected existing Node.js $CURRENT_NODE_VER, but Pi requires Node.js >= 22.19.0."
    NEED_NODE=1
  fi
fi

if [ "$NEED_NODE" -eq 1 ]; then
  install_user_node || {
    echo "✗ Error: Node.js >= 22.19.0 is required."
    echo "  Please install Node.js >= 22.19.0 (e.g. via nvm) and re-run."
    exit 1
  }
fi
echo "✓ Node.js $(node -v) is ready."

# Ensure npm global install is writable without sudo (prevents EACCES on /usr/local)
NPM_PREFIX="$(npm config get prefix 2>/dev/null || echo "")"
if [ -n "$NPM_PREFIX" ]; then
  # Test writability of prefix
  if [ ! -w "$NPM_PREFIX" ] 2>/dev/null || { [ -d "$NPM_PREFIX/lib" ] && [ ! -w "$NPM_PREFIX/lib" ]; }; then
    echo "⚠ Global npm directory ($NPM_PREFIX) is not user-writable."
    echo "  Configuring npm prefix to ~/.local (no sudo required)..."
    mkdir -p "$HOME/.local/lib/node_modules"
    npm config set prefix "$HOME/.local"
  fi
fi

# 2. Check / Install Beads (bd)
if ! command -v bd >/dev/null 2>&1; then
  echo ""
  echo "--> Checking 'bd' (Beads CLI)..."
  echo "⚠ 'bd' not found. Installing via official script..."
  curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash || {
    echo "⚠ curl installer failed, trying npm install -g @beads/bd..."
    npm install -g @beads/bd || echo "✗ Failed to install bd automatically. Please install it manually."
  }
fi

if command -v bd >/dev/null 2>&1; then
  echo "✓ bd detected: $(bd --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ bd still not detected on PATH. Make sure ~/.local/bin is in your PATH."
fi

# 3. Check / Install RTK CLI
if ! command -v rtk >/dev/null 2>&1; then
  echo ""
  echo "--> Checking 'rtk' (RTK CLI)..."
  echo "⚠ 'rtk' not found. Installing via official script..."
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh || {
    echo "⚠ Failed to install rtk automatically. You can install it manually from https://github.com/rtk-ai/rtk"
  }
fi

if command -v rtk >/dev/null 2>&1; then
  echo "✓ rtk detected: $(rtk --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ rtk still not detected on PATH. Make sure ~/.local/bin is in your PATH."
fi

# 4. Check / Install Pi CLI
if ! command -v pi >/dev/null 2>&1; then
  echo ""
  echo "--> Installing Pi coding agent CLI..."
  npm install -g @earendil-works/pi-coding-agent || {
    echo "✗ Failed to install pi automatically. Please run manually:"
    echo "  npm install -g @earendil-works/pi-coding-agent"
  }
fi

if command -v pi >/dev/null 2>&1; then
  echo "✓ pi detected: $(pi --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ Continuing without pi on PATH. You can install it later."
fi

# 5. Install Unified Pi Toolkit Bundle into Pi (Cairn + Sidekick + Skills)
echo ""
echo "--> Installing unified Pi Toolkit package into Pi..."
if command -v pi >/dev/null 2>&1; then
  pi install "$BUNDLE_DIR" || echo "⚠ pi install toolkit bundle failed; check pi status"
else
  echo "  Skipped 'pi install' because pi is not yet installed."
fi

# 6. Install Recommended Ecosystem Extensions into Pi
echo ""
echo "--> Installing Ecosystem Pi extensions..."
if command -v pi >/dev/null 2>&1; then
  PI_PACKAGES=(
    "npm:pi-subagents"
    "npm:pi-web-access"
    "npm:@companion-ai/feynman@0.5.35"
    "npm:billion-context"
    "npm:pi-lens"
    "npm:pi-simplify"
    "npm:pi-open-tui"
    "npm:@juicesharp/rpiv-ask-user-question"
    "npm:@narumitw/pi-btw"
    "npm:pi-hashline-edit-pro"
    "npm:@ff-labs/pi-fff"
    "npm:pi-rtk-optimizer"
    "npm:@plannotator/pi-extension"
    "git:github.com/NVlabs/SoL-Pi"
  )
  for pkg in "${PI_PACKAGES[@]}"; do
    echo "  Installing $pkg..."
    pi install "$pkg" || echo "  ⚠ Failed to install $pkg (skipped)"
  done
fi

# 7. Link Cairn CLI binary to ~/.local/bin
echo ""
echo "--> Linking cairn CLI tool to $BIN_DIR..."
ln -sf "$BUNDLE_DIR/bin/cairn" "$BIN_DIR/cairn"
chmod +x "$BUNDLE_DIR/bin/cairn"
echo "✓ Linked 'cairn' to $BIN_DIR"

# 8. Install Skills to Agent Skills Directory
echo ""
echo "--> Installing Skills into $AGENTS_SKILLS_DIR and $PI_AGENT_DIR/skills..."
mkdir -p "$PI_AGENT_DIR/skills"
for skill_dir in "$BUNDLE_DIR/skills"/*; do
  if [ -d "$skill_dir" ]; then
    skill_name="$(basename "$skill_dir")"
    cp -rf "$skill_dir" "$AGENTS_SKILLS_DIR/"
    cp -rf "$skill_dir" "$PI_AGENT_DIR/skills/"
    echo "  ✓ Installed skill: $skill_name"
  fi
done

# 9. Setup Pi Config (AGENTS.md, APPEND_SYSTEM.md, clean settings, open-tui, optimizer, sol-pi)
echo ""
echo "--> Setting up Pi Configuration in $PI_AGENT_DIR..."
if [ ! -f "$PI_AGENT_DIR/settings.json" ]; then
  cp "$BUNDLE_DIR/pi/settings.clean.json" "$PI_AGENT_DIR/settings.json"
  echo "  ✓ Initialized $PI_AGENT_DIR/settings.json"
else
  echo "  ✓ $PI_AGENT_DIR/settings.json already exists (left untouched)"
fi

if [ ! -f "$PI_AGENT_DIR/AGENTS.md" ]; then
  cp "$BUNDLE_DIR/pi/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md"
  echo "  ✓ Installed $PI_AGENT_DIR/AGENTS.md"
fi

if [ ! -f "$PI_AGENT_DIR/APPEND_SYSTEM.md" ]; then
  cp "$BUNDLE_DIR/pi/APPEND_SYSTEM.md" "$PI_AGENT_DIR/APPEND_SYSTEM.md"
  echo "  ✓ Installed $PI_AGENT_DIR/APPEND_SYSTEM.md"
fi

for cfg in open-tui.json optimizer.json sol-pi.json; do
  if [ ! -f "$PI_AGENT_DIR/$cfg" ] && [ -f "$BUNDLE_DIR/pi/$cfg" ]; then
    cp "$BUNDLE_DIR/pi/$cfg" "$PI_AGENT_DIR/$cfg"
    echo "  ✓ Installed $PI_AGENT_DIR/$cfg"
  fi
done

# 10. Install VS Code / Cursor Extension
echo ""
echo "--> Installing Cairn VS Code extension..."
VSIX_FILE="$BUNDLE_DIR/vscode/cairn-0.2.1.vsix"
INSTALLED_IDE=0

if command -v code >/dev/null 2>&1; then
  echo "  Installing into VS Code (code)..."
  code --install-extension "$VSIX_FILE" --force || true
  INSTALLED_IDE=1
fi

if command -v cursor >/dev/null 2>&1; then
  echo "  Installing into Cursor..."
  cursor --install-extension "$VSIX_FILE" --force || true
  INSTALLED_IDE=1
fi

if command -v windsurf >/dev/null 2>&1; then
  echo "  Installing into Windsurf..."
  windsurf --install-extension "$VSIX_FILE" --force || true
  INSTALLED_IDE=1
fi

if [ "$INSTALLED_IDE" -eq 0 ]; then
  echo "  Notice: Neither 'code', 'cursor', nor 'windsurf' found on PATH."
  echo "  You can manually install the extension in VS Code/Cursor via:"
  echo "    Extensions -> ... (Views and More Actions) -> Install from VSIX..."
  echo "    Path: $VSIX_FILE"
fi

# 11. Ensure ~/.local/bin in user shell profile & Verification
echo ""
echo "--> Updating Shell PATH profile..."
for profile in "$HOME/.bashrc" "$HOME/.zshrc"; do
  if [ -f "$profile" ] && ! grep -q '\.local/bin' "$profile"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$profile"
    echo "  ✓ Appended ~/.local/bin to PATH in $profile"
  fi
done

echo ""
echo "========================================================"
echo "    Setup Complete!"
echo "========================================================"
echo "Next Steps:"
echo "1. Initialize any project repository:"
echo "     cd /path/to/your/git-repo"
echo "     cairn init"
echo ""
echo "2. Open the project in Pi coding agent:"
echo "     pi"
echo "   Cairn tools (cairn_recall, cairn_choose, cairn_option, etc.)"
echo "   and Sidekick persistent subagent will load automatically."
echo ""
echo "3. Open the project in VS Code / Cursor:"
echo "   Click on the Cairn icon in the activity bar to view"
echo "   the interactive issue tree, decision graph, and kanban board."
echo "========================================================"
