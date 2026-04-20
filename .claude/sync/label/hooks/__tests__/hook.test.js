/**
 * hook.test.js — Smoke tests for post-tool-use-label.js + scope-matcher.js.
 *
 * Run with: node --test .claude/sync/label/hooks/__tests__/hook.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LABEL_ROOT = path.join(__dirname, "..", "..");
const SCOPE_MATCHER = path.join(LABEL_ROOT, "lib", "scope-matcher");
const HOOK = path.join(LABEL_ROOT, "hooks", "post-tool-use-label");

// -------------------- scope-matcher --------------------

test("scope-matcher: globToRegex basic semantics", () => {
  const { globToRegex } = require(SCOPE_MATCHER);
  const r1 = globToRegex(".claude/skills/**/*.md");
  assert.equal(r1.test(".claude/skills/foo/SKILL.md"), true);
  assert.equal(r1.test(".claude/skills/foo/bar/SKILL.md"), true);
  assert.equal(r1.test(".claude/skills/foo/SKILL.js"), false);

  const r2 = globToRegex("scripts/*.js");
  assert.equal(r2.test("scripts/foo.js"), true);
  assert.equal(r2.test("scripts/lib/foo.js"), false);

  const r3 = globToRegex("CLAUDE.md");
  assert.equal(r3.test("CLAUDE.md"), true);
  assert.equal(r3.test("x/CLAUDE.md"), false);
});

test("scope-matcher: compileScope include + exclude", () => {
  const { compileScope } = require(SCOPE_MATCHER);
  const { matches } = compileScope({
    include: [".claude/skills/**/*.md", "scripts/**/*.js"],
    exclude: ["**/__tests__/**", "**/*.test.js"],
  });
  assert.equal(matches(".claude/skills/foo/SKILL.md"), true);
  assert.equal(matches("scripts/foo.js"), true);
  assert.equal(matches("scripts/__tests__/foo.js"), false);
  assert.equal(matches("scripts/foo.test.js"), false);
  assert.equal(matches("README.md"), false);
});

test("scope-matcher: loads real scope.json from repo root", () => {
  const { loadScope, DEFAULT_SCOPE_PATH } = require(SCOPE_MATCHER);
  assert.ok(fs.existsSync(DEFAULT_SCOPE_PATH), "scope.json must exist at the default path");
  const scope = loadScope();
  assert.equal(typeof scope.matches, "function");
  assert.equal(scope.matches("CLAUDE.md"), true);
  assert.equal(scope.matches(".claude/sync/label/lib/derive.js"), true);
  assert.equal(scope.matches(".claude/state/handoff.json"), false);
  assert.equal(scope.matches("node_modules/foo/index.js"), false);
});

// -------------------- hook classification + merge --------------------

test("hook: classifyEdit NEW when no existing record", () => {
  const { classifyEdit } = require(HOOK);
  const cheap = { type: "skill", file_size: 1000, fingerprint: "sha256:a" };
  assert.equal(classifyEdit(null, cheap), "NEW");
});

test("hook: classifyEdit MAJOR on type change", () => {
  const { classifyEdit } = require(HOOK);
  const existing = { type: "skill", file_size: 1000, fingerprint: "sha256:a" };
  const cheap = { type: "doc", file_size: 1000, fingerprint: "sha256:a" };
  assert.equal(classifyEdit(existing, cheap), "MAJOR");
});

test("hook: classifyEdit MAJOR on >20% size change", () => {
  const { classifyEdit, MAJOR_EDIT_LENGTH_RATIO } = require(HOOK);
  assert.equal(MAJOR_EDIT_LENGTH_RATIO, 0.2);
  const existing = { type: "doc", file_size: 1000, fingerprint: "sha256:a" };
  const cheap = { type: "doc", file_size: 1500, fingerprint: "sha256:b" };
  assert.equal(classifyEdit(existing, cheap), "MAJOR");
});

test("hook: classifyEdit MINOR on small size change + new fingerprint", () => {
  const { classifyEdit } = require(HOOK);
  const existing = { type: "doc", file_size: 1000, fingerprint: "sha256:a" };
  const cheap = { type: "doc", file_size: 1050, fingerprint: "sha256:b" };
  assert.equal(classifyEdit(existing, cheap), "MINOR");
});

test("hook: mergeRecord respects manual_override", () => {
  const { mergeRecord } = require(HOOK);
  const existing = {
    path: "foo.md",
    type: "doc",
    manual_override: ["type"],
    needs_review: [],
    status: "active",
  };
  const cheap = { path: "foo.md", type: "skill", fingerprint: "sha256:z", file_size: 42 };
  const merged = mergeRecord(existing, cheap, "MINOR");
  assert.equal(merged.type, "doc", "manual_override should prevent type overwrite");
  assert.equal(merged.content_hash, "sha256:z");
  assert.equal(merged.pending_agent_fill, false);
  assert.equal(typeof merged.last_hook_fire, "string");
});

test("hook: extractFilePath handles missing payload", () => {
  const { extractFilePath } = require(HOOK);
  assert.equal(extractFilePath(null), null);
  assert.equal(extractFilePath({}), null);
  assert.equal(extractFilePath({ tool_input: {} }), null);
  assert.equal(extractFilePath({ tool_input: { file_path: "x.md" } }), "x.md");
});

test("hook: toRepoRelative rejects parent-traversal", () => {
  const { toRepoRelative } = require(HOOK);
  assert.equal(toRepoRelative("../../../etc/passwd"), null);
  const good = toRepoRelative("CLAUDE.md");
  assert.equal(good, "CLAUDE.md");
});

// -------------------- end-to-end: subprocess invocation --------------------

test("hook subprocess: out-of-scope stdin exits 0 silently", (_t, done) => {
  const { spawn } = require("node:child_process");
  const hookPath = path.join(LABEL_ROOT, "hooks", "post-tool-use-label.js");
  const proc = spawn(process.execPath, [hookPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const payload = JSON.stringify({
    tool_input: { file_path: path.join(os.tmpdir(), "out-of-scope.xyz") },
  });
  let stderr = "";
  proc.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  proc.on("close", (code) => {
    assert.equal(code, 0, `expected exit 0, got ${code}. stderr: ${stderr}`);
    done();
  });
  proc.stdin.write(payload);
  proc.stdin.end();
});

test("hook subprocess: empty stdin exits 0 silently", (_t, done) => {
  const { spawn } = require("node:child_process");
  const hookPath = path.join(LABEL_ROOT, "hooks", "post-tool-use-label.js");
  const proc = spawn(process.execPath, [hookPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.on("close", (code) => {
    assert.equal(code, 0);
    done();
  });
  proc.stdin.end();
});
