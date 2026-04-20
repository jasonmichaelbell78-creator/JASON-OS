#!/usr/bin/env node
/**
 * notification-label.js — OS-level desktop notifications (PLAN §S5).
 *
 * Implements D15 path 3. Two usage modes:
 *
 *   1. LIBRARY — other hooks `require(...).notify(...)` when they detect
 *      a label-system failure. This is the primary trigger path; the
 *      PostToolUse hook's Step 0 failure branch should call us directly
 *      once wiring lands so the user gets an immediate toast.
 *
 *   2. CLI — Claude Code's Notification event (dormant until settings.json
 *      wiring lands) can invoke this script directly. It reads stdin,
 *      checks the pending queue, and fires a summary notification if any
 *      failures are present. Never blocks — always exits 0.
 *
 * Transport: `node-notifier` (declared as devDep in S0.1) with
 * platform-specific shell fallback (PowerShell toast / osascript /
 * notify-send). If both paths fail, emit a sanitized stderr warning so the
 * failure surfaces via D15 path 1 instead of being silently dropped.
 */

const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const LABEL_ROOT = path.resolve(__dirname, "..");

let helpers;
function loadHelpers() {
  if (helpers) return helpers;
  const { sanitize, logger } = require(path.join(LABEL_ROOT, "lib", "sanitize"));
  const agentRunner = require(path.join(LABEL_ROOT, "lib", "agent-runner"));
  helpers = { sanitize, logger, agentRunner };
  return helpers;
}

const DEFAULT_TITLE = "JASON-OS label system";
const MAX_BODY_CHARS = 240; // OS toast limits vary; 240 is safe across Win/Mac/Linux.

/**
 * Fire an OS notification. Non-throwing: on transport failure, writes a
 * sanitized warning to stderr and returns `{ ok: false, via: "stderr" }`.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.body
 * @param {{nodeNotifier?: object, shellRunner?: Function}} [args.injected]
 *   Test hook — inject a fake node-notifier module and/or a fake shell spawner.
 * @returns {{ok: boolean, via: "node-notifier" | "shell" | "stderr"}}
 */
function notify({ title, body, injected = {} } = {}) {
  const { sanitize } = loadHelpers();
  if (typeof title !== "string" || title.length === 0) title = DEFAULT_TITLE;
  if (typeof body !== "string") body = "";
  const truncatedBody = body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS - 1)}…` : body;

  // 1. node-notifier path
  const nn = injected.nodeNotifier ?? tryLoadNodeNotifier();
  if (nn) {
    try {
      nn.notify({ title, message: truncatedBody });
      return { ok: true, via: "node-notifier" };
    } catch (err) {
      process.stderr.write(`[label-notify] node-notifier failed: ${sanitize(err)}\n`);
      // fall through to shell
    }
  }

  // 2. Platform shell fallback
  const shellRunner = injected.shellRunner ?? defaultShellRunner;
  try {
    const ok = shellRunner({ title, body: truncatedBody });
    if (ok) return { ok: true, via: "shell" };
  } catch (err) {
    process.stderr.write(`[label-notify] shell fallback failed: ${sanitize(err)}\n`);
  }

  // 3. Final fallback — stderr
  process.stderr.write(
    `[label-notify] no transport available; falling back to stderr: ${title} — ${truncatedBody}\n`
  );
  return { ok: false, via: "stderr" };
}

function tryLoadNodeNotifier() {
  try {
    // node-notifier is a devDep (package.json). Load lazily so the module
    // still works if the dep is missing at runtime.
    return require("node-notifier");
  } catch {
    return null;
  }
}

/**
 * Platform-dispatched shell-based notification.
 * Returns true if the fallback transport was invoked successfully,
 * false if the platform isn't supported.
 *
 * @param {{title: string, body: string}} args
 * @returns {boolean}
 */
function defaultShellRunner({ title, body }) {
  const platform = os.platform();
  if (platform === "win32") return runPowerShellToast(title, body);
  if (platform === "darwin") return runOsascript(title, body);
  if (platform === "linux") return runNotifySend(title, body);
  return false;
}

function runPowerShellToast(title, body) {
  // BurntToast isn't universally installed; plain msg.exe always works on
  // Windows 10+. Message popup is blocking-on-user for 5s, which is fine
  // for failure surfacing.
  const safeTitle = title.replace(/["`$]/g, "");
  const safeBody = body.replace(/["`$]/g, "");
  const child = spawn(
    "msg.exe",
    ["*", "/TIME:5", `${safeTitle}: ${safeBody}`],
    { stdio: "ignore", windowsHide: true }
  );
  child.unref();
  return true;
}

function runOsascript(title, body) {
  const safeTitle = title.replace(/"/g, '\\"');
  const safeBody = body.replace(/"/g, '\\"');
  const script = `display notification "${safeBody}" with title "${safeTitle}"`;
  const child = spawn("osascript", ["-e", script], { stdio: "ignore" });
  child.unref();
  return true;
}

function runNotifySend(title, body) {
  const child = spawn("notify-send", [title, body], { stdio: "ignore" });
  child.unref();
  return true;
}

/**
 * Summarize the pending-failures queue into a notification body.
 * @param {string} [queuePath]
 * @returns {string | null} null when nothing to notify about
 */
function summarizePendingForNotification(queuePath) {
  const { agentRunner } = loadHelpers();
  const entries =
    queuePath !== undefined ? agentRunner.readQueue(queuePath) : agentRunner.readQueue();
  if (entries.length === 0) return null;
  const failures = entries
    .map((entry) => ({ entry, verdict: agentRunner.classifyJob(entry) }))
    .filter((r) => r.verdict === "failed" || r.verdict === "timed_out");
  if (failures.length === 0) return null;
  const first = failures[0].entry;
  const file = typeof first.file_path === "string" ? first.file_path : "<unknown>";
  const extra = failures.length > 1 ? ` (+${failures.length - 1} more)` : "";
  return `${failures.length} pending label-system failure(s). Oldest: ${file}${extra}`;
}

/**
 * CLI entry point — reads stdin (Claude Code Notification payload),
 * checks the queue, and fires a summary notification if needed.
 */
function readStdinAndHandle() {
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("error", () => process.exit(0));
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
  });
  process.stdin.on("end", () => {
    if (buffer.trim().length > 0) {
      try {
        JSON.parse(buffer);
      } catch {
        // Don't block on bad stdin.
        process.exit(0);
      }
    }
    try {
      const queuePath = process.env.LABEL_PENDING_QUEUE_OVERRIDE;
      const body = summarizePendingForNotification(queuePath);
      if (body === null) process.exit(0);
      notify({ title: DEFAULT_TITLE, body });
    } catch (err) {
      const { sanitize } = loadHelpers();
      process.stderr.write(`notification-label: ${sanitize(err)}\n`);
    }
    process.exit(0);
  });
}

if (require.main === module) {
  readStdinAndHandle();
}

module.exports = {
  DEFAULT_TITLE,
  MAX_BODY_CHARS,
  notify,
  tryLoadNodeNotifier,
  defaultShellRunner,
  summarizePendingForNotification,
};
