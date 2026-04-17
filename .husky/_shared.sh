#!/bin/sh
# _shared.sh — shared hook infrastructure for husky hooks.
# Sourced by .husky/pre-commit and .husky/pre-push.
#
# Sanitized minimal version based on SoNash's .husky/_shared.sh. Includes
# SKIP_CHECKS helpers (honoring CLAUDE.md §4.14 — SKIP_REASON discipline)
# and a POSIX-safe EXIT trap chain for cleanup composition.

# --- EXIT trap chaining (POSIX-safe) ---
# Appends cleanup commands without overwriting prior traps.
add_exit_trap() {
  EXIT_TRAP_CHAIN="${EXIT_TRAP_CHAIN:+$EXIT_TRAP_CHAIN; }$1"
  trap "$EXIT_TRAP_CHAIN" EXIT
}

# --- SKIP_CHECKS helpers ---
# Check if a named check is in the comma-separated $SKIP_CHECKS list.
# Usage: if is_skipped "check-name"; then ...
is_skipped() {
  case ",$SKIP_CHECKS," in *",$1,"*) return 0 ;; esac
  return 1
}

# Enforce SKIP_REASON discipline — any SKIP_ override requires a reason.
# Rejects empty / multi-line / control-character reasons to prevent log
# injection. Per CLAUDE.md §4.14: "Never set SKIP_REASON autonomously.
# User must authorize exact wording."
require_skip_reason() {
  if [ -z "${SKIP_REASON:-}" ]; then
    echo "  SKIP_REASON is required when overriding checks" >&2
    echo "  Usage: SKIP_REASON=\"your reason\" $1 git <command>" >&2
    echo "  The audit trail is useless without a reason." >&2
    exit 1
  fi
  cr="$(printf '\r')"
  if [ "$(printf '%s' "$SKIP_REASON" | wc -l | tr -d ' ')" -gt 1 ] \
     || printf '%s' "$SKIP_REASON" | grep -q "$cr"; then
    echo "  SKIP_REASON must be a single line (no CR/LF)" >&2
    exit 1
  fi
  if printf '%s' "$SKIP_REASON" | LC_ALL=C grep -q '[[:cntrl:]]'; then
    echo "  SKIP_REASON must not contain control characters" >&2
    exit 1
  fi
  if [ ${#SKIP_REASON} -gt 500 ]; then
    echo "  SKIP_REASON must be <= 500 characters" >&2
    exit 1
  fi
}

# --- Log target ---
# Hooks append per-check status lines here for post-run audit.
# .git/ is always local, never committed, always writable.
HOOK_OUTPUT_LOG="$(git rev-parse --show-toplevel 2>/dev/null || echo .)/.git/hook-output.log"
