#!/usr/bin/env bash
# Claude Code statusLine shim — execs the installed jason-statusline binary.
# Stdin (Claude Code JSON payload) is passed through.
# If the binary is missing, prints a one-line hint to run the build.

# Determine HOME on Windows Git Bash (only USERPROFILE set by default)
if [[ -z "${HOME:-}" && -n "${USERPROFILE:-}" ]]; then
  if command -v cygpath &>/dev/null; then
    HOME="$(cygpath -u "$USERPROFILE")"
  else
    HOME="${USERPROFILE//\\//}"
  fi
  export HOME
fi

# Fail fast if neither HOME nor USERPROFILE resolved a usable value —
# otherwise we'd construct /.claude/... and fall through to the fallback.
if [[ -z "${HOME:-}" ]]; then
  cat >/dev/null
  printf 'jason-statusline: HOME unset (no USERPROFILE either)'
  exit 0
fi

# Probe both extension-less (Linux/macOS) and .exe (Windows) variants —
# build.sh only appends .exe when go env GOOS is windows, so a hardcoded
# extension breaks one platform or the other.
BIN_BASE="$HOME/.claude/statusline/jason-statusline-v2"

if [[ -x "$BIN_BASE" ]]; then
  exec "$BIN_BASE"
elif [[ -x "${BIN_BASE}.exe" ]]; then
  exec "${BIN_BASE}.exe"
fi

# Fallback: binary not built (e.g., fresh clone pre-build).
# Drain stdin so Claude Code doesn't block, then emit a hint.
cat >/dev/null
printf 'jason-statusline not built — cd tools/statusline && bash build.sh'
