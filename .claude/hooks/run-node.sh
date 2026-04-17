#!/usr/bin/env bash
# run-node.sh — portable node resolver for Claude Code hooks.
#
# Claude Code spawns hooks via /usr/bin/bash with a stripped PATH, so
# `node` may not resolve even when the interactive shell finds it.
# This wrapper probes the common install locations in priority order
# and execs node with the script + args passed through.
#
# Usage (from .claude/settings.json hooks):
#   "command": "bash .claude/hooks/run-node.sh <script-relative-to-hooks-dir> [args...]"
#
# Exit codes:
#   127 — node not found anywhere we looked (hook should mark continueOnError)
#   *   — whatever the underlying node script returns

set -u

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_REL="${1:-}"
if [[ -z "$SCRIPT_REL" ]]; then
  echo "run-node.sh: missing script argument" >&2
  exit 2
fi
shift

# Path-traversal guard: reject absolute paths, `..` segments, and backslashes
# so SCRIPT_REL can only address files under HOOKS_DIR.
case "$SCRIPT_REL" in
  /*|*..*|*'\'*)
    echo "run-node.sh: invalid script path (must be relative; no .. or \\): $SCRIPT_REL" >&2
    exit 2
    ;;
esac

SCRIPT_PATH="$HOOKS_DIR/$SCRIPT_REL"
if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "run-node.sh: script not found: $SCRIPT_PATH" >&2
  exit 2
fi

resolve_node() {
  # 1. Already on PATH
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  # 2. Common fixed Windows install (node-vX.Y.Z-win-x64)
  local home_unix
  home_unix="${HOME:-}"
  if [[ -n "$home_unix" ]]; then
    local candidate
    for candidate in "$home_unix"/nodejs/*/node.exe; do
      [[ -x "$candidate" ]] && { echo "$candidate"; return 0; }
    done
    # 3. ~/bin/node.cmd wrapper
    if [[ -x "$home_unix/bin/node.cmd" ]]; then
      echo "$home_unix/bin/node.cmd"
      return 0
    fi
    if [[ -x "$home_unix/bin/node" ]]; then
      echo "$home_unix/bin/node"
      return 0
    fi
  fi

  # 4. fnm multishells (pick most recently modified)
  # Build fnm_root defensively: under `set -u`, referencing $HOME in a default
  # expansion crashes when both LOCALAPPDATA and HOME are unset. Resolve each
  # candidate explicitly with safe fallbacks instead.
  local fnm_root=""
  if [[ -n "${LOCALAPPDATA:-}" ]]; then
    fnm_root="$LOCALAPPDATA/fnm_multishells"
  elif [[ -n "$home_unix" ]]; then
    fnm_root="$home_unix/AppData/Local/fnm_multishells"
  fi
  if [[ -n "$fnm_root" && -d "$fnm_root" ]]; then
    local latest
    latest="$(ls -t "$fnm_root" 2>/dev/null | head -1)"
    if [[ -n "$latest" && -x "$fnm_root/$latest/node.exe" ]]; then
      echo "$fnm_root/$latest/node.exe"
      return 0
    fi
    if [[ -n "$latest" && -x "$fnm_root/$latest/node" ]]; then
      echo "$fnm_root/$latest/node"
      return 0
    fi
  fi

  # 5. nvm-windows default symlink
  if [[ -x "/c/Program Files/nodejs/node.exe" ]]; then
    echo "/c/Program Files/nodejs/node.exe"
    return 0
  fi

  # 6. macOS/Linux common spots
  local p
  for p in /usr/local/bin/node /opt/homebrew/bin/node /usr/bin/node; do
    [[ -x "$p" ]] && { echo "$p"; return 0; }
  done

  return 1
}

NODE_BIN="$(resolve_node)" || {
  echo "run-node.sh: node not found on PATH or in known install locations" >&2
  echo "run-node.sh: searched PATH, ~/nodejs/*, ~/bin/node[.cmd], fnm_multishells, Program Files, /usr/local/bin" >&2
  exit 127
}

exec "$NODE_BIN" "$SCRIPT_PATH" "$@"
