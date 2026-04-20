/**
 * notification.test.js — Smoke tests for notification-label.js.
 *
 * Uses dependency injection so tests never fire real OS notifications.
 *
 * Run: node --test .claude/sync/label/hooks/__tests__/notification.test.js
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LABEL_ROOT = path.join(__dirname, "..", "..");
const HOOK_PATH = path.join(LABEL_ROOT, "hooks", "notification-label.js");

test("notify: uses injected node-notifier when available", () => {
  const { notify } = require(HOOK_PATH);
  let called = 0;
  let received;
  const fakeNN = {
    notify(args) {
      called += 1;
      received = args;
    },
  };
  const result = notify({ title: "T", body: "B", injected: { nodeNotifier: fakeNN } });
  assert.equal(result.ok, true);
  assert.equal(result.via, "node-notifier");
  assert.equal(called, 1);
  assert.equal(received.title, "T");
  assert.equal(received.message, "B");
});

test("notify: falls through to shellRunner when node-notifier throws", () => {
  const { notify } = require(HOOK_PATH);
  const throwingNN = {
    notify() {
      throw new Error("boom");
    },
  };
  let shellCalled = 0;
  const fakeShell = () => {
    shellCalled += 1;
    return true;
  };
  const result = notify({
    title: "T",
    body: "B",
    injected: { nodeNotifier: throwingNN, shellRunner: fakeShell },
  });
  assert.equal(result.ok, true);
  assert.equal(result.via, "shell");
  assert.equal(shellCalled, 1);
});

test("notify: stderr fallback when both paths fail", () => {
  const { notify } = require(HOOK_PATH);
  const throwingNN = {
    notify() {
      throw new Error("nn-boom");
    },
  };
  const failingShell = () => false; // unsupported platform
  const result = notify({
    title: "T",
    body: "B",
    injected: { nodeNotifier: throwingNN, shellRunner: failingShell },
  });
  assert.equal(result.ok, false);
  assert.equal(result.via, "stderr");
});

test("notify: truncates long body to MAX_BODY_CHARS", () => {
  const { notify, MAX_BODY_CHARS } = require(HOOK_PATH);
  let captured;
  const fakeNN = {
    notify(args) {
      captured = args;
    },
  };
  const longBody = "x".repeat(500);
  notify({ title: "T", body: longBody, injected: { nodeNotifier: fakeNN } });
  assert.equal(captured.message.length, MAX_BODY_CHARS);
  assert.ok(captured.message.endsWith("…"));
});

test("notify: defaults title when title missing", () => {
  const { notify, DEFAULT_TITLE } = require(HOOK_PATH);
  let captured;
  const fakeNN = {
    notify(args) {
      captured = args;
    },
  };
  notify({ body: "B", injected: { nodeNotifier: fakeNN } });
  assert.equal(captured.title, DEFAULT_TITLE);
});

test("summarizePendingForNotification: null on empty queue", () => {
  const { summarizePendingForNotification } = require(HOOK_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-notify-empty-"));
  const queuePath = path.join(tmpDir, "queue.jsonl");
  assert.equal(summarizePendingForNotification(queuePath), null);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("summarizePendingForNotification: null when all running", () => {
  const { summarizePendingForNotification } = require(HOOK_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-notify-running-"));
  const queuePath = path.join(tmpDir, "queue.jsonl");
  const entry = {
    job_id: "j1",
    file_path: "foo.md",
    output_path: path.join(tmpDir, "nope.json"),
    spawned_at: Date.now(),
    timeout_ms: 120_000,
    status: "pending",
  };
  fs.writeFileSync(queuePath, `${JSON.stringify(entry)}\n`);
  assert.equal(summarizePendingForNotification(queuePath), null);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("summarizePendingForNotification: summarizes failures", () => {
  const { summarizePendingForNotification } = require(HOOK_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-notify-fails-"));
  const queuePath = path.join(tmpDir, "queue.jsonl");
  const stale = Date.now() - 10 * 60 * 1000;
  const e1 = {
    job_id: "oldest",
    file_path: "first.md",
    output_path: path.join(tmpDir, "a.json"),
    spawned_at: stale,
    timeout_ms: 120_000,
    status: "pending",
  };
  const e2 = {
    job_id: "newer",
    file_path: "second.md",
    output_path: path.join(tmpDir, "b.json"),
    spawned_at: stale + 1000,
    timeout_ms: 120_000,
    status: "pending",
  };
  fs.writeFileSync(queuePath, `${JSON.stringify(e1)}\n${JSON.stringify(e2)}\n`);
  const summary = summarizePendingForNotification(queuePath);
  assert.ok(summary);
  assert.ok(summary.includes("2 pending"));
  assert.ok(summary.includes("first.md"));
  assert.ok(summary.includes("+1 more"));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("subprocess: empty stdin exits 0 silently", (_t, done) => {
  const { spawn } = require("node:child_process");
  const proc = spawn(process.execPath, [HOOK_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      // Point the hook at a nonexistent queue so the CLI path finds no
      // failures and exits silently instead of firing a real toast.
      LABEL_PENDING_QUEUE_OVERRIDE: path.join(os.tmpdir(), "definitely-does-not-exist.jsonl"),
    },
  });
  proc.on("close", (code) => {
    assert.equal(code, 0);
    done();
  });
  proc.stdin.end();
});
