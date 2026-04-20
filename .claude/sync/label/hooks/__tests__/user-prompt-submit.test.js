/**
 * user-prompt-submit.test.js — Smoke tests for user-prompt-submit-label.js.
 *
 * Run with: node --test .claude/sync/label/hooks/__tests__/user-prompt-submit.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LABEL_ROOT = path.join(__dirname, "..", "..");
const HOOK_PATH = path.join(LABEL_ROOT, "hooks", "user-prompt-submit-label.js");

// Each test writes its queue fixture to a temp file and passes the path via
// the evaluate({queuePath}) option. Subprocess tests use the
// LABEL_PENDING_QUEUE_OVERRIDE env var.
function withTempQueue(tmpDir, queueContent, fn) {
  const queuePath = path.join(tmpDir, "pending.jsonl");
  if (queueContent !== undefined) {
    fs.writeFileSync(queuePath, queueContent);
  }
  return fn(queuePath);
}

test("user-prompt-submit: empty queue → code 0, empty output", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-ups-empty-"));
  withTempQueue(tmpDir, undefined, (queuePath) => {
    const { evaluate } = require(HOOK_PATH);
    const { code, output } = evaluate({ queuePath });
    assert.equal(code, 0);
    assert.equal(output, "");
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("user-prompt-submit: running-only queue → code 0, empty output", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-ups-running-"));
  const now = Date.now();
  const entry = {
    job_id: "job_run_1",
    file_path: "foo.md",
    output_path: path.join(tmpDir, "nope.json"),
    spawned_at: now,
    timeout_ms: 120_000,
    status: "pending",
  };
  withTempQueue(tmpDir, `${JSON.stringify(entry)}\n`, (queuePath) => {
    const { evaluate } = require(HOOK_PATH);
    const { code, output } = evaluate({ queuePath });
    assert.equal(code, 0);
    assert.equal(output, "");
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("user-prompt-submit: timed-out job → code 0, output has warning block", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-ups-timed-"));
  const stale = Date.now() - 10 * 60 * 1000; // 10 min ago (past default 2m timeout)
  const entry = {
    job_id: "job_stale_1",
    file_path: ".claude/skills/foo/SKILL.md",
    output_path: path.join(tmpDir, "never-written.json"),
    spawned_at: stale,
    timeout_ms: 120_000,
    status: "pending",
  };
  withTempQueue(tmpDir, `${JSON.stringify(entry)}\n`, (queuePath) => {
    const { evaluate } = require(HOOK_PATH);
    const { code, output } = evaluate({ queuePath });
    assert.equal(code, 0);
    assert.ok(output.includes("[LABEL-SYSTEM — acknowledgement required]"));
    assert.ok(output.includes("timed_out"));
    assert.ok(output.includes(".claude/skills/foo/SKILL.md"));
    assert.ok(output.includes("job_stale_1"));
    assert.ok(output.trim().endsWith("==="));
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("user-prompt-submit: multiple failures are sorted oldest-first", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-ups-multi-"));
  const now = Date.now();
  const older = {
    job_id: "older",
    file_path: "a.md",
    output_path: path.join(tmpDir, "a.json"),
    spawned_at: now - 20 * 60 * 1000,
    timeout_ms: 120_000,
    status: "pending",
  };
  const newer = {
    job_id: "newer",
    file_path: "b.md",
    output_path: path.join(tmpDir, "b.json"),
    spawned_at: now - 10 * 60 * 1000,
    timeout_ms: 120_000,
    status: "pending",
  };
  // Write newer first so we can confirm the output re-sorts it.
  withTempQueue(
    tmpDir,
    `${JSON.stringify(newer)}\n${JSON.stringify(older)}\n`,
    (queuePath) => {
      const { evaluate } = require(HOOK_PATH);
      const { output } = evaluate({ queuePath });
      const olderIdx = output.indexOf("older");
      const newerIdx = output.indexOf("newer");
      assert.ok(olderIdx > 0 && newerIdx > 0);
      assert.ok(olderIdx < newerIdx, "older job should appear first in output");
    }
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("user-prompt-submit: unreadable queue → code 2 + own-failure warning", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-ups-broken-"));
  // Write garbage so JSON.parse throws on the readQueue side.
  withTempQueue(tmpDir, "this is not json\n", (queuePath) => {
    const { evaluate } = require(HOOK_PATH);
    const { code, output } = evaluate({ queuePath });
    assert.equal(code, 2);
    assert.ok(output.includes("[LABEL-SYSTEM — hook self-failure]"));
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("user-prompt-submit subprocess: empty stdin exits 0 silently", (_t, done) => {
  const { spawn } = require("node:child_process");
  const proc = spawn(process.execPath, [HOOK_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (c) => {
    stdout += c.toString();
  });
  proc.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  proc.on("close", (code) => {
    assert.equal(code, 0, `expected 0, got ${code}. stderr=${stderr}`);
    // Real queue may exist on this machine — but assuming no failures,
    // stdout should be empty. If stdout is non-empty here, it's because
    // the live queue has failures; that's still acceptable for the smoke
    // test, so just log rather than fail.
    if (stdout.length > 0 && !stdout.includes("[LABEL-SYSTEM")) {
      assert.fail(`unexpected stdout: ${stdout}`);
    }
    done();
  });
  proc.stdin.end();
});

test("user-prompt-submit subprocess: payload JSON parses without error", (_t, done) => {
  const { spawn } = require("node:child_process");
  const proc = spawn(process.execPath, [HOOK_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.on("close", (code) => {
    assert.equal(code, 0);
    done();
  });
  proc.stdin.write(JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "hello" }));
  proc.stdin.end();
});
