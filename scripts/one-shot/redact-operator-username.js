"use strict";

/**
 * One-shot operator-username redaction for committed research artifacts.
 *
 * Replaces the literal username `jason` with the placeholder `<user>` ONLY
 * within path-shaped contexts:
 *
 *   C:/Users/jason/...        -> C:/Users/<user>/...
 *   C:\Users\jason\...        -> C:\Users\<user>\...
 *   /c/Users/jason/...        -> /c/Users/<user>/...
 *   /Users/jason/...          -> /Users/<user>/...
 *   C--Users-jason-...        -> C--Users-<user>-... (Claude project-hash form)
 *
 * Does NOT touch:
 *   - The project name `JASON-OS` / `jason-os` (case-insensitive token boundary check)
 *   - The user's name in prose ("Jason said …", "Jason's preferences")
 *   - Email addresses containing `jason`
 *   - Any `jason` token that isn't sandwiched between path separators
 *
 * Used once for PR #12 R2 to clear ~255 instances across 37 committed
 * research files. Kept as a discoverable artifact under scripts/one-shot/
 * so the change is reproducible from history.
 *
 * Usage: node scripts/one-shot/redact-operator-username.js [--dry-run]
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DRY_RUN = process.argv.includes("--dry-run");

// The script contains the literal username token inside its regex literals,
// which means running the script against itself would rewrite those literals
// and break future invocations. Compute the script's own repo-relative path
// so we can skip it explicitly during the file walk.
const SELF_REL = path
  .relative(PROJECT_ROOT, __filename)
  .split(path.sep)
  .join("/");

// Path-shaped replacement patterns. Order matters: the most specific patterns
// (with explicit separators on both sides) come first so we never replace a
// `jason` token that isn't unambiguously a username slot. The trailing
// boundary uses `\b` instead of a literal separator so paths terminating at
// commas, quotes, parens, or end-of-line still match (e.g.,
// `C:/Users/jason, C:/Users/jbell`).
const REPLACEMENTS = [
  // Windows forward-slash form: C:/Users/jason{/,end-of-id}
  { re: /([A-Z]:\/Users\/)jason\b/g, fn: (_m, p1) => `${p1}<user>` },
  // Windows backslash form: C:\Users\jason{\,end-of-id}
  { re: /([A-Z]:\\Users\\)jason\b/g, fn: (_m, p1) => `${p1}<user>` },
  // Git Bash / MSYS form: /c/Users/jason{/,end-of-id}
  { re: /(\/[a-z]\/Users\/)jason\b/g, fn: (_m, p1) => `${p1}<user>` },
  // Unix Users form: /Users/jason{/,end-of-id}
  { re: /(\/Users\/)jason\b/g, fn: (_m, p1) => `${p1}<user>` },
  // Claude Code project-hash form: {C,c}--Users-jason{-,end-of-id}
  // The hash is path-derived (slashes -> dashes). Case can be lower or upper
  // depending on how the original path was created on the case-insensitive
  // Windows filesystem (`c--Users-jason-` vs `C--Users-jason-`). Word
  // boundary trailing anchor handles truncated references in tables.
  { re: /([Cc]--Users-)jason\b/g, fn: (_m, p1) => `${p1}<user>` },
];

function listTrackedFiles() {
  // -z emits NUL-delimited paths so filenames containing newlines or other
  // whitespace round-trip cleanly. Defends against a class of repo content
  // that the older `\n` split would mis-handle.
  const out = execSync("git ls-files -z", { cwd: PROJECT_ROOT, encoding: "utf8" });
  return out
    .split("\0")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function applyReplacements(text) {
  let out = text;
  for (const { re, fn } of REPLACEMENTS) {
    out = out.replace(re, fn);
  }
  return out;
}

function readUtf8OrNull(abs) {
  try {
    const buf = fs.readFileSync(abs);
    // Skip binaries — quick heuristic: NUL byte in first 1024 bytes.
    if (buf.subarray(0, 1024).includes(0)) return null;
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function countOccurrences(text) {
  let count = 0;
  for (const { re } of REPLACEMENTS) {
    const matches = text.match(new RegExp(re.source, re.flags));
    if (matches) count += matches.length;
  }
  return count;
}

function processFile(rel) {
  // Never rewrite the script itself — its regex literals contain the
  // username token by design.
  if (rel === SELF_REL) return { touched: false, occurrences: 0 };

  const abs = path.join(PROJECT_ROOT, rel);
  const original = readUtf8OrNull(abs);
  if (original === null) return { touched: false, occurrences: 0 };

  const updated = applyReplacements(original);
  if (updated === original) return { touched: false, occurrences: 0 };

  const occurrences = countOccurrences(original);
  console.log(`${DRY_RUN ? "[dry-run] " : ""}${rel} (${occurrences} replacement${occurrences === 1 ? "" : "s"})`);
  if (!DRY_RUN) {
    fs.writeFileSync(abs, updated);
  }
  return { touched: true, occurrences };
}

function main() {
  const files = listTrackedFiles();
  let touched = 0;
  let totalOccurrences = 0;

  for (const rel of files) {
    const result = processFile(rel);
    if (result.touched) {
      touched += 1;
      totalOccurrences += result.occurrences;
    }
  }

  console.log(`\n${DRY_RUN ? "[dry-run] " : ""}Total: ${touched} files touched, ${totalOccurrences} occurrences replaced.`);
}

main();
