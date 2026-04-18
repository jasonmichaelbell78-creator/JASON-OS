#!/usr/bin/env bash
# Claude Code statusLine shim — execs the installed jason-statusline binary.
# Stdin (Claude Code JSON payload) is passed through.
# If the binary is missing, prints a one-line hint to run the build.

# Determine HOME on Windows Git Bash (only USERPROFILE set by default)
if [[ -z "${HOME:-}" ]]; then
  if [[ -n "${USERPROFILE:-}" ]]; then
    if command -v cygpath &>/dev/null; then
      HOME="$(cygpath -u "$USERPROFILE")"
    else
      HOME="${USERPROFILE//\\//}"
    fi
    export HOME
  fi
fi

BIN="$HOME/.claude/statusline/jason-statusline-v2.exe"

if [[ -x "$BIN" ]]; then
  exec "$BIN"
fi

# Fallback: binary not built (e.g., fresh clone pre-build).
# Drain stdin so Claude Code doesn't block, then emit a hint.
cat >/dev/null
printf 'jason-statusline not built — cd tools/statusline && bash build.sh'
