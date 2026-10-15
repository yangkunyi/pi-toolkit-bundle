#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
PI_AGENT_DIR="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}"
AGENTS_SKILLS_DIR="${HOME}/.agents/skills"

echo "========================================================"
echo "    Pi + Cairn + Sidekick All-in-One Installer"
echo "========================================================"

mkdir -p "$BIN_DIR"
mkdir -p "$PI_AGENT_DIR"
mkdir -p "$AGENTS_SKILLS_DIR"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Error: Node.js is required but not installed."
  echo "  Please install Node.js >= 18 (e.g. via nvm or fnm) and re-run."
  exit 1
fi
echo "✓ Node.js $(node -v) detected."

# 2. Check / Install Beads (bd)
if ! command -v bd >/dev/null 2>&1; then
  echo "⚠ 'bd' (Beads CLI) not found. Installing via official script..."
  curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash || {
    echo "⚠ curl installer failed, trying npm install -g @beads/bd..."
    npm install -g @beads/bd || echo "✗ Failed to install bd automatically. Please install it manually."
  }
fi

if command -v bd >/dev/null 2>&1; then
  echo "✓ bd detected: $(bd --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ bd still not detected on PATH. Make sure ~/.local/bin or npm bin is in your PATH."
fi

# 3. Check / Install Pi
if ! command -v pi >/dev/null 2>&1; then
  echo "⚠ 'pi' command not found. Installing @earendil-works/pi-coding-agent globally..."
  npm install -g @earendil-works/pi-coding-agent || {
    echo "✗ Failed to install pi automatically. Please install pi manually:"
    echo "  npm install -g @earendil-works/pi-coding-agent"
  }
fi

if command -v pi >/dev/null 2>&1; then
  echo "✓ pi detected: $(pi --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ Continuing without pi on PATH. You can install it later."
fi

# 4. Install Cairn Extension into Pi
echo ""
echo "--> Installing Cairn extension into Pi..."
if command -v pi >/dev/null 2>&1; then
  pi install "$SCRIPT_DIR/cairn/pi-extension" || echo "⚠ pi install cairn failed; check pi status"
else
  echo "  Skipped 'pi install' because pi is not yet installed."
fi

# 5. Install Sidekick Extension into Pi
echo ""
echo "--> Installing Pi Sidekick extension into Pi..."
if command -v pi >/dev/null 2>&1; then
  pi install "$SCRIPT_DIR/sidekick" || echo "⚠ pi install sidekick failed"
fi

# 5b. Install Ecosystem Extensions into Pi
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

# 6. Link Cairn CLI binary to ~/.local/bin
echo ""
echo "--> Linking cairn CLI tool to $BIN_DIR..."
ln -sf "$SCRIPT_DIR/cairn/bin/cairn" "$BIN_DIR/cairn"
chmod +x "$SCRIPT_DIR/cairn/bin/cairn"
echo "✓ Linked 'cairn' to $BIN_DIR"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "  Note: Ensure $BIN_DIR is in your PATH (e.g. export PATH=\"\$HOME/.local/bin:\$PATH\")"
fi

# 7. Install Skills
echo ""
echo "--> Installing Skills into $AGENTS_SKILLS_DIR and $PI_AGENT_DIR/skills..."
mkdir -p "$PI_AGENT_DIR/skills"
for skill_dir in "$SCRIPT_DIR/skills"/*; do
  if [ -d "$skill_dir" ]; then
    skill_name="$(basename "$skill_dir")"
    cp -rf "$skill_dir" "$AGENTS_SKILLS_DIR/"
    cp -rf "$skill_dir" "$PI_AGENT_DIR/skills/"
    echo "  ✓ Installed skill: $skill_name"
  fi
done

# 8. Setup Pi Config (AGENTS.md, APPEND_SYSTEM.md, clean settings)
echo ""
echo "--> Setting up Pi Configuration in $PI_AGENT_DIR..."
if [ ! -f "$PI_AGENT_DIR/settings.json" ]; then
  cp "$SCRIPT_DIR/pi/settings.clean.json" "$PI_AGENT_DIR/settings.json"
  echo "  ✓ Initialized $PI_AGENT_DIR/settings.json"
else
  echo "  ✓ $PI_AGENT_DIR/settings.json already exists (left untouched)"
fi

if [ ! -f "$PI_AGENT_DIR/AGENTS.md" ]; then
  cp "$SCRIPT_DIR/pi/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md"
  echo "  ✓ Installed $PI_AGENT_DIR/AGENTS.md"
fi

if [ ! -f "$PI_AGENT_DIR/APPEND_SYSTEM.md" ]; then
  cp "$SCRIPT_DIR/pi/APPEND_SYSTEM.md" "$PI_AGENT_DIR/APPEND_SYSTEM.md"
  echo "  ✓ Installed $PI_AGENT_DIR/APPEND_SYSTEM.md"
fi

for cfg in open-tui.json optimizer.json sol-pi.json; do
  if [ ! -f "$PI_AGENT_DIR/$cfg" ] && [ -f "$SCRIPT_DIR/pi/$cfg" ]; then
    cp "$SCRIPT_DIR/pi/$cfg" "$PI_AGENT_DIR/$cfg"
    echo "  ✓ Installed $PI_AGENT_DIR/$cfg"
  fi
done

# 9. Install VS Code / Cursor Extension
echo ""
echo "--> Installing Cairn VS Code extension..."
VSIX_FILE="$SCRIPT_DIR/vscode/cairn-0.2.1.vsix"
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

# 10. Verification
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
echo "   will be loaded automatically without needing to read source code."
echo ""
echo "3. Open the project in VS Code / Cursor:"
echo "   Click on the Cairn icon in the activity bar to view"
echo "   the interactive issue tree, decision graph, and kanban board."
echo "========================================================"
