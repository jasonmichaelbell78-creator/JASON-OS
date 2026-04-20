#!/usr/bin/env node
/**
 * Session End Auto-Commit Script
 *
 * Purpose: Automatically commits and pushes session-end artifacts
 * (SESSION_CONTEXT.md + active plan files) so session-end is never forgotten.
 *
 * Usage:
 *   node scripts/session-end-commit.js [--no-push]
 *   npm run session:end
 *
 * Flags:
 *   --no-push  Run steps 1-3 (update + commit) but skip the push. Context
 *              is preserved locally. Matches the skill's --no-push contract.
 *
 * What it does:
 *   1. Updates SESSION_CONTEXT.md to mark "Uncommitted Work: No"
 *   2. Collects all modified files in the session-end allowlist:
 *      SESSION_CONTEXT.md, .planning/<topic>/PLAN.md,
 *      .planning/<topic>/PORT_ANALYSIS.md
 *   3. Commits the allowlisted files together (single atomic revert unit)
 *   4. Pushes to the current branch (unless --no-push)
 *
 * Scope note (T17): The commit is scoped via `--only -- <paths>` so unrelated
 * staged files still cannot slip into the session-end commit. Scope gating
 * for non-allowlisted files is the skill's Step 9 (pre-commit review)
 * responsibility.
 *
 * Created: Session #115 (2026-01-29)
 * Security: Review #217 - execFileSync with args arrays (no command injection)
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { safeWriteFileSync } = require("./lib/safe-fs");

// Colors for output (defined early for error messages)
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function log(msg, color = "") {
  console.log(color ? `${color}${msg}${colors.reset}` : msg);
}

/**
 * Safely extract error message (Review #217: pattern compliance)
 */
function getErrorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

// Review #217 R3/R4: Resolve from git repo root, not cwd (works from any subdirectory)
let REPO_ROOT = "";
try {
  REPO_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
} catch (err) {
  log("❌ session:end must be run inside a git repository.", colors.red);
  log(`   ${getErrorMessage(err)}`, colors.red);
  process.exit(2);
}

const SESSION_CONTEXT_PATH = path.join(REPO_ROOT, "SESSION_CONTEXT.md");

// T17: session-end commit allowlist. Matches the skill's "Expected v0
// session-end output files" contract (Step 9). Glob pathspecs use git's
// `:(glob)` magic signature so `**` matches across directories.
const SESSION_END_PATHSPECS = [
  "SESSION_CONTEXT.md",
  ":(glob).planning/**/PLAN.md",
  ":(glob).planning/**/PORT_ANALYSIS.md",
];

/**
 * Run a git command using execFileSync (Review #217: no command injection)
 * @param {string[]} args - Git command arguments
 * @param {object} options - Custom options (silent, ignoreError) + execFileSync options (cwd, etc.)
 */
function runGit(args, options = {}) {
  // Review #217 R4: Extract custom options before passing to execFileSync
  const { silent, ignoreError, ...execOptions } = options;

  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: silent ? "pipe" : "inherit",
      cwd: REPO_ROOT, // Default to repo root for subdirectory support
      ...execOptions,
    });
  } catch (err) {
    if (!ignoreError) {
      throw err;
    }
    return null;
  }
}

function getCurrentBranch() {
  const branch = runGit(["branch", "--show-current"], { silent: true });
  return branch ? branch.trim() : "";
}

/**
 * Return repo-relative paths of every file in the session-end allowlist
 * that currently has working-tree or index changes (or is untracked).
 *
 * T17: replaces the legacy SESSION_CONTEXT-only check so plan files edited
 * during skill Step 3 land in the same commit. Scope stays narrow via
 * SESSION_END_PATHSPECS — other staged/modified files are still ignored
 * here and remain the skill's Step 9 review responsibility.
 *
 * Review #217 R2/R4/R5: narrow pathspec, repo-relative, cwd: REPO_ROOT.
 */
function getModifiedSessionEndFiles() {
  const status = runGit(
    ["status", "--porcelain", "--", ...SESSION_END_PATHSPECS],
    { silent: true, cwd: REPO_ROOT }
  );
  if (!status?.trim()) return [];

  const files = [];
  for (const rawLine of status.split("\n")) {
    if (!rawLine.trim()) continue;
    // Porcelain v1: "XY path" (2-char status, space, path).
    // Renames render as "XY old -> new" — take the right-hand side.
    const rest = rawLine.slice(3);
    const arrowIdx = rest.indexOf(" -> ");
    files.push(arrowIdx >= 0 ? rest.slice(arrowIdx + 4) : rest);
  }
  return files;
}

function updateSessionContext() {
  if (!fs.existsSync(SESSION_CONTEXT_PATH)) {
    log("SESSION_CONTEXT.md not found", colors.yellow);
    return false;
  }

  // Review #217: Wrap readFileSync in try/catch (TOCTOU + permission errors)
  let content;
  try {
    content = fs.readFileSync(SESSION_CONTEXT_PATH, "utf8");
  } catch (err) {
    log(`❌ Failed to read SESSION_CONTEXT.md: ${getErrorMessage(err)}`, colors.red);
    return false;
  }

  // Match BOTH the D12 5-field heading format ("## Uncommitted Work\n<value>")
  // and the legacy SoNash inline-bold format ("**Uncommitted Work**: <value>").
  // Group 1 captures the prefix (preserved on rewrite); group 2 captures Yes/No.
  // Closes T14 from the /todo backlog.
  const uncommittedWorkPattern =
    /(\*\*Uncommitted Work\*\*:\s*|##\s*Uncommitted Work\s*\n)(Yes|No)/i;
  const match = content.match(uncommittedWorkPattern);

  if (!match) {
    log("⚠ Could not find Uncommitted Work field", colors.yellow);
    return false;
  }

  const [, prefix, value] = match;

  if (/^no$/i.test(value)) {
    log("✓ SESSION_CONTEXT.md already up to date", colors.green);
    return false;
  }

  // value is "Yes" — rewrite to "No" while preserving the matched prefix
  content = content.replace(uncommittedWorkPattern, `${prefix}No`);
  try {
    safeWriteFileSync(SESSION_CONTEXT_PATH, content);
  } catch (err) {
    log(`❌ Failed to write SESSION_CONTEXT.md: ${getErrorMessage(err)}`, colors.red);
    return false;
  }
  log("✓ Updated SESSION_CONTEXT.md (Uncommitted Work: No)", colors.green);
  return true;
}

/**
 * Check if SESSION_CONTEXT.md was meaningfully updated during this session.
 * Warns if only trivial changes (or none) were made to key sections.
 */
function validateSessionContextUpdated() {
  // Check git diff of SESSION_CONTEXT.md against HEAD
  const diff = runGit(["diff", "HEAD", "--", "SESSION_CONTEXT.md"], { silent: true });

  if (!diff || diff.trim().length === 0) {
    log("⚠️  SESSION_CONTEXT.md has NO changes.", colors.yellow);
    log("   Did you update Quick Status, Next Session Goals, and Session Summary?", colors.yellow);
    log("   Skipping this causes stale context for the next session.", colors.yellow);
    return false;
  }

  // Check if key sections were touched
  const warnings = [];
  if (!diff.includes("Quick Status") && !diff.includes("Progress")) {
    warnings.push("Quick Status table may not have been updated");
  }
  if (!diff.includes("Next Session Goals") && !diff.includes("Immediate Priority")) {
    warnings.push("Next Session Goals may not have been updated");
  }
  if (!diff.includes("Session #") && !diff.includes("Summary")) {
    warnings.push("Session summary may not have been added");
  }

  if (warnings.length > 0) {
    log("⚠️  SESSION_CONTEXT.md may be incomplete:", colors.yellow);
    for (const w of warnings) {
      log(`   - ${w}`, colors.yellow);
    }
    log("   Review Step 3b of /session-end before committing.", colors.yellow);
  }

  return true;
}

function main() {
  log("\n📋 Session End Auto-Commit\n", colors.cyan);

  // Parse CLI flags. `--no-push` honors the skill contract: all prior steps
  // run, only the final push is skipped so context is preserved locally.
  const noPush = process.argv.slice(2).includes("--no-push");

  const branch = getCurrentBranch();

  // Review #217: Check for detached HEAD state
  if (!branch) {
    log("❌ Could not determine current branch (detached HEAD?)", colors.red);
    log("   Please checkout a branch before running session:end", colors.yellow);
    process.exit(1);
  }

  log(`Branch: ${branch}`);

  // Step 0: Validate SESSION_CONTEXT.md was meaningfully updated
  validateSessionContextUpdated();

  // Step 1: Update SESSION_CONTEXT.md
  updateSessionContext();

  // Step 2: Collect all session-end allowlisted files with pending changes
  // (SESSION_CONTEXT.md + active plan files). T17.
  const stagableFiles = getModifiedSessionEndFiles();
  if (stagableFiles.length === 0) {
    log("\n✅ No session-end files changed - session end already complete", colors.green);
    return;
  }

  log(`\nFiles to commit (${stagableFiles.length}):`);
  for (const f of stagableFiles) log(`  • ${f}`);

  // Step 3: Commit
  log("\n📝 Committing session-end...", colors.cyan);
  try {
    runGit(["add", "--", ...stagableFiles]);

    // Log the hard-coded skips for audit trail
    // m2: use process.execPath for consistent node resolution, resolve script
    // path absolute via REPO_ROOT, and pass cwd: REPO_ROOT for parity with runGit.
    const logOverrideScript = path.join(REPO_ROOT, "scripts", "log-override.js");
    try {
      execFileSync(
        process.execPath,
        [
          logOverrideScript,
          "--quick",
          "--check=doc-index",
          "--reason=Automated session-end commit",
        ],
        { cwd: REPO_ROOT, timeout: 3000, stdio: "pipe" }
      );
      execFileSync(
        process.execPath,
        [
          logOverrideScript,
          "--quick",
          "--check=doc-header",
          "--reason=Automated session-end commit",
        ],
        { cwd: REPO_ROOT, timeout: 3000, stdio: "pipe" }
      );
    } catch {
      /* non-blocking */
    }

    // Review #217 R2/R3/R4 + T17: Commit ONLY the session-end allowlist paths
    // to prevent accidental commits of other staged files. --only scoped to
    // the explicit allowlist keeps the safety even when plan files join the
    // commit. Use SKIP flags via env to avoid blocking on doc index/header
    // checks.
    //
    // SonarCloud javascript:S4036: `git` is resolved via $PATH rather than an
    // absolute path. This is intentional — git is an expected, operator-
    // controlled PATH binary on all supported platforms; hard-coding an
    // absolute path would break cross-platform portability. Marked Safe in
    // SonarCloud UI (PR #8 R1).
    const commitMessage = "docs: session end - mark complete\n\nhttps://claude.ai/code";
    execFileSync(
      "git",
      ["commit", "--only", "-m", commitMessage, "--", ...stagableFiles],
      {
        cwd: REPO_ROOT, // Review #217 R4: Works from any subdirectory
        encoding: "utf8",
        stdio: "inherit",
        env: {
          ...process.env,
          SKIP_DOC_INDEX_CHECK: "1",
          SKIP_DOC_HEADER_CHECK: "1",
          SKIP_REASON: "automated session-end commit — allowlisted paths only",
        },
      }
    );
    log("✓ Committed session-end changes", colors.green);
  } catch (err) {
    log("❌ Commit failed - may need manual intervention", colors.red);
    console.error(getErrorMessage(err));
    process.exit(1);
  }

  // Step 4: Push (Review #217: args array prevents branch name injection)
  if (noPush) {
    log("\n⏸  --no-push specified — skipping push. Context preserved locally.", colors.yellow);
    log("\n✅ Session end complete (local only)!", colors.green);
    return;
  }

  log("\n🚀 Pushing to remote...", colors.cyan);
  try {
    runGit(["push", "-u", "origin", branch]);
    log("✓ Pushed to remote", colors.green);
  } catch (err) {
    log("❌ Push failed - may need manual push", colors.red);
    console.error(getErrorMessage(err));
    process.exit(1);
  }

  log("\n✅ Session end complete!", colors.green);
}

main();
