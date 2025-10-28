#!/usr/bin/env bash
set -euo pipefail

# Installs obra/superpowers into ~/.codex and bootstraps a working CLI.

HOME_DIR="${HOME:-$PWD}"
CODEX_DIR="$HOME_DIR/.codex"
SP_DIR="$CODEX_DIR/superpowers"
SP_CLI_DIR="$SP_DIR/.codex"
SKILLS_DIR="$CODEX_DIR/skills"
AGENTS_FILE="$CODEX_DIR/AGENTS.md"

echo "[superpowers] Installing into $CODEX_DIR"
mkdir -p "$CODEX_DIR"

if [ ! -d "$SP_DIR/.git" ]; then
  echo "[superpowers] Cloning obra/superpowers to $SP_DIR"
  git clone https://github.com/obra/superpowers.git "$SP_DIR"
else
  echo "[superpowers] Updating existing repo at $SP_DIR"
  git -C "$SP_DIR" pull --ff-only
fi

mkdir -p "$SKILLS_DIR"

# Ensure AGENTS.md contains the Superpowers section
if ! grep -q 'Superpowers System' "$AGENTS_FILE" 2>/dev/null; then
  echo "[superpowers] Appending Superpowers block to $AGENTS_FILE"
  cat >> "$AGENTS_FILE" <<'EOF'
## Superpowers System

<EXTREMELY_IMPORTANT>
You have superpowers. Superpowers teach you new skills and capabilities. RIGHT NOW run: `~/.codex/superpowers/.codex/superpowers-codex bootstrap` and follow the instructions it returns.
</EXTREMELY_IMPORTANT>
EOF
else
  echo "[superpowers] Superpowers block already present in $AGENTS_FILE"
fi

# Node 24+ may treat extensionless files as ESM and break require().
# Provide a .cjs copy and a small wrapper if needed.
if [ -f "$SP_CLI_DIR/superpowers-codex" ] && [ ! -f "$SP_CLI_DIR/superpowers-codex.cjs" ]; then
  echo "[superpowers] Creating CJS copy of CLI"
  cp "$SP_CLI_DIR/superpowers-codex" "$SP_CLI_DIR/superpowers-codex.cjs"
fi

NEEDS_WRAP=0
if "$SP_CLI_DIR/superpowers-codex" -h >/dev/null 2>&1; then
  echo "[superpowers] CLI runs without wrapper"
else
  NEEDS_WRAP=1
fi

if [ "$NEEDS_WRAP" -eq 1 ]; then
  echo "[superpowers] Installing wrapper for CommonJS CLI"
  mv "$SP_CLI_DIR/superpowers-codex" "$SP_CLI_DIR/superpowers-codex.orig" 2>/dev/null || true
  cat > "$SP_CLI_DIR/superpowers-codex" <<'WRAP'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/superpowers-codex.cjs" "$@"
WRAP
  chmod +x "$SP_CLI_DIR/superpowers-codex"
fi

echo "[superpowers] Install complete. Verify with:"
echo "  $SP_CLI_DIR/superpowers-codex bootstrap"

