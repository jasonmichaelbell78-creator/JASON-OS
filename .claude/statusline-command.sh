#!/usr/bin/env bash
# Claude Code statusLine script — mirrors Starship config
# Reads JSON from stdin, outputs a status line

input=$(cat)

# --- Directory (truncate to 3 parts, like Starship truncation_length=3) ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
if [ -n "$cwd" ]; then
  # Normalize backslashes to forward slashes
  cwd="${cwd//\\//}"
  # Truncate to last 3 path components
  dir=$(echo "$cwd" | awk -F'/' '{
    n = split($0, parts, "/");
    if (n <= 3) { print $0 }
    else { print "…/" parts[n-2] "/" parts[n-1] "/" parts[n] }
  }')
else
  dir=""
fi

# --- Git branch and status ---
git_branch=""
git_status=""
if command -v git >/dev/null 2>&1 && [ -n "$cwd" ]; then
  branch=$(git -C "$cwd" --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    git_branch="$branch"
    # Collect status flags
    status_output=$(git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null)
    flags=""
    echo "$status_output" | grep -q '^[MADRCU]' && flags="${flags}+"   # staged
    echo "$status_output" | grep -q '^.[MD]'     && flags="${flags}!"   # modified
    echo "$status_output" | grep -q '^?'         && flags="${flags}?"   # untracked
    ahead=$(git -C "$cwd" --no-optional-locks rev-list @{u}..HEAD 2>/dev/null | wc -l | tr -d ' ')
    behind=$(git -C "$cwd" --no-optional-locks rev-list HEAD..@{u} 2>/dev/null | wc -l | tr -d ' ')
    [ "$ahead" -gt 0 ] 2>/dev/null   && flags="${flags}⇡${ahead}"
    [ "$behind" -gt 0 ] 2>/dev/null  && flags="${flags}⇣${behind}"
    [ -n "$flags" ] && git_status="[$flags]"
  fi
fi

# --- Node version ---
node_ver=""
if command -v node >/dev/null 2>&1; then
  node_ver=$(node --version 2>/dev/null)
fi

# --- Claude model ---
model=$(echo "$input" | jq -r '.model.display_name // ""')

# --- Context usage ---
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# --- Assemble output ---
parts=()
[ -n "$dir" ]       && parts+=("$dir")
[ -n "$git_branch" ] && parts+=("${git_branch}${git_status:+ $git_status}")
[ -n "$node_ver" ]  && parts+=("node:$node_ver")
[ -n "$model" ]     && parts+=("[$model]")
[ -n "$used_pct" ]  && parts+=("ctx:$(printf '%.0f' "$used_pct")%")

printf '%s' "$(IFS=' '; echo "${parts[*]}")"
