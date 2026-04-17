/* global module, require, __dirname, process */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * rotate-state.js - Shared state file rotation helpers
 *
 * Reusable functions for capping JSONL log files, pruning JSON arrays,
 * and expiring stale entries. Used by hooks and scripts that manage
 * append-only state files.
 *
 * Session #160: Wave 2 of AI Optimization Audit (State File Rotation)
 */

const fs = require("node:fs");
const path = require("node:path");
const { safeParseLine } = require("../../../scripts/lib/parse-jsonl-line");
let sanitizeError;
try {
  ({ sanitizeError } = require(
    path.join(__dirname, "..", "..", "..", "scripts", "lib", "security-helpers.js")
  ));
} catch {
  sanitizeError = (e) => (e instanceof Error ? e.constructor.name : "unknown error");
}
// PR #3 R1 (M4): route file I/O through safe-fs helpers (symlink-guarded
// writes, EXDEV-aware rename, BOM-stripping reads) per CLAUDE.md §5.
let safeAppendFileSync, safeWriteFileSync, readUtf8Sync, safeRenameSync;
try {
  ({ safeAppendFileSync, safeWriteFileSync, readUtf8Sync, safeRenameSync } = require(
    path.join(__dirname, "..", "..", "..", "scripts", "lib", "safe-fs")
  ));
} catch {
  // Fallback shim: direct fs (preserves prior behavior if safe-fs unavailable).
  // The local isSafeToWrite check below still gates writes against symlinks.
  safeAppendFileSync = (p, d, o) => fs.appendFileSync(p, d, o);
  safeWriteFileSync = (p, d, o) => fs.writeFileSync(p, d, o);
  readUtf8Sync = (p) => fs.readFileSync(p, "utf8");
  safeRenameSync = (s, d) => fs.renameSync(s, d);
}
let isSafeToWrite;
try {
  ({ isSafeToWrite } = require("./symlink-guard"));
} catch (err) {
  process.stderr.write(`[rotate-state] symlink-guard unavailable: ${sanitizeError(err)}\n`);
  /**
   * Check if a single path component is a symlink.
   * Returns false if it's a symlink, true if safe, false on unexpected errors.
   */
  const isPathComponentSafe = (targetPath) => {
    try {
      if (fs.lstatSync(targetPath).isSymbolicLink()) return false;
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      if (code !== "ENOENT") return false;
    }
    return true;
  };

  isSafeToWrite = (filePath) => {
    try {
      // Check leaf path
      if (!isPathComponentSafe(filePath)) return false;

      // Reject any symlinked parent directory
      let dir = path.resolve(path.dirname(filePath));
      for (;;) {
        if (!isPathComponentSafe(dir)) return false;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }

      return true;
    } catch {
      return false;
    }
  };
}

/** Best-effort rm — never throws. */
function silentRm(p) {
  try {
    fs.rmSync(p, { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * PR #3 R1 (M3): Atomic backup-swap with rollback.
 *
 * Mirrors backupSwap() in state-utils.js. Used by rotateJsonl (and by other
 * rotation paths that overwrite an existing state file) instead of the prior
 * rmSync+renameSync sequence, which created a window where the destination
 * could be missing if rename failed — unacceptable for state files used in
 * compaction recovery.
 *
 * Protocol:
 *   1. Caller has already written `tmpPath`.
 *   2. If `filePath` exists, rename it to `bakPath` (copyFileSync fallback
 *      on rename failure so we never lose the original).
 *   3. Rename `tmpPath` → `filePath`. On failure, restore from `bakPath`.
 *   4. On success, remove `bakPath`.
 *
 * Throws on unrecoverable failure; caller is responsible for tmp cleanup.
 */
function backupSwap(filePath, tmpPath, bakPath) {
  silentRm(bakPath);
  if (fs.existsSync(filePath)) {
    try {
      safeRenameSync(filePath, bakPath);
    } catch {
      // Don't delete original on backup failure; best-effort copy instead.
      try {
        fs.copyFileSync(filePath, bakPath);
      } catch {
        /* best effort */
      }
    }
  }
  try {
    safeRenameSync(tmpPath, filePath);
  } catch (err) {
    // Restore backup if rename failed to prevent data loss.
    if (fs.existsSync(bakPath) && !fs.existsSync(filePath)) {
      try {
        safeRenameSync(bakPath, filePath);
      } catch {
        /* best effort */
      }
    }
    throw err;
  }
  silentRm(bakPath);
}

/**
 * Rotate a JSONL file to keep only the newest N entries.
 * Reads all lines, keeps the last `keepCount`, writes back atomically.
 *
 * PR #3 R1 (M2/M3): Replaced the prior `rmSync(filePath) + renameSync(tmp)`
 * sequence with a backup-swap. `renameSync` overwrites atomically on POSIX
 * and Windows; the explicit pre-rename rmSync created a window where the
 * destination could vanish if rename failed. Backup-swap goes further by
 * preserving the prior contents in `${filePath}.bak` until the swap is
 * confirmed, allowing rollback on rename failure. State files survive
 * compaction recovery; permanent loss is unacceptable.
 *
 * @param {string} filePath - Absolute path to JSONL file
 * @param {number} maxEntries - Trigger rotation when line count exceeds this
 * @param {number} [keepCount] - Lines to keep after rotation (default: 60% of maxEntries)
 * @returns {{ rotated: boolean, before: number, after: number }}
 */
function rotateJsonl(filePath, maxEntries, keepCount) {
  const keepRaw = keepCount || Math.floor(maxEntries * 0.6);
  const keep = Math.max(1, keepRaw); // Prevent truncation to 0 (Review #289)
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;
  try {
    const content = readUtf8Sync(filePath);
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length <= maxEntries) {
      return { rotated: false, before: lines.length, after: lines.length };
    }

    const kept = lines.slice(-keep);
    if (!isSafeToWrite(filePath) || !isSafeToWrite(tmpPath) || !isSafeToWrite(bakPath))
      return { rotated: false, before: lines.length, after: lines.length };
    safeWriteFileSync(tmpPath, kept.join("\n") + "\n", "utf-8");
    backupSwap(filePath, tmpPath, bakPath);

    return { rotated: true, before: lines.length, after: kept.length };
  } catch {
    silentRm(tmpPath);
    return { rotated: false, before: 0, after: 0 };
  }
}

/**
 * Prune an array field inside a JSON file to keep only the last N entries.
 *
 * @param {string} filePath - Absolute path to JSON file
 * @param {string} keyPath - Dot-separated path to the array (e.g., "git.recentCommits")
 * @param {number} maxEntries - Maximum entries to keep in the array
 * @returns {{ pruned: boolean, before: number, after: number }}
 */
// PR #3 R1 (M10): keys that walk into Object.prototype must be refused.
// Without this guard, a caller passing keyPath="__proto__.polluted" (or
// similar via attacker-controlled config) would mutate Object.prototype
// and corrupt every object in the process. We refuse the mutation entirely
// and return the no-op shape, matching the function's existing error paths.
const PROTO_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function pruneJsonKey(filePath, keyPath, maxEntries) {
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;
  try {
    const content = readUtf8Sync(filePath);
    const data = JSON.parse(content);

    // Navigate dot-separated path
    const keys = keyPath.split(".");
    let parent = data;
    for (let i = 0; i < keys.length - 1; i++) {
      // PR #3 R1 (M10): proto-pollution guard on intermediate keys.
      if (PROTO_POLLUTION_KEYS.has(keys[i])) {
        return { pruned: false, before: 0, after: 0 };
      }
      if (!parent || typeof parent !== "object") return { pruned: false, before: 0, after: 0 };
      parent = parent[keys[i]];
    }

    const lastKey = keys[keys.length - 1];
    // PR #3 R1 (M10): proto-pollution guard on final key.
    if (PROTO_POLLUTION_KEYS.has(lastKey)) {
      return { pruned: false, before: 0, after: 0 };
    }
    const arr = parent?.[lastKey];
    if (!Array.isArray(arr)) return { pruned: false, before: 0, after: 0 };

    const before = arr.length;
    if (before <= maxEntries) return { pruned: false, before, after: before };

    parent[lastKey] = arr.slice(-maxEntries);

    if (!isSafeToWrite(filePath) || !isSafeToWrite(tmpPath) || !isSafeToWrite(bakPath))
      return { pruned: false, before, after: before };
    safeWriteFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    backupSwap(filePath, tmpPath, bakPath);

    return { pruned: true, before, after: parent[lastKey].length };
  } catch {
    silentRm(tmpPath);
    return { pruned: false, before: 0, after: 0 };
  }
}

/**
 * Expire entries in a JSON object where values (timestamps) are older than maxDays.
 * Works for objects like warned-files.json where keys map to ISO timestamp strings.
 *
 * @param {string} filePath - Absolute path to JSON file
 * @param {number} maxDays - Remove entries older than this many days
 * @returns {{ expired: boolean, before: number, after: number }}
 */
function expireByAge(filePath, maxDays) {
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;
  try {
    const content = readUtf8Sync(filePath);
    const data = JSON.parse(content);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { expired: false, before: 0, after: 0 };
    }

    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    const keys = Object.keys(data);
    const before = keys.length;
    const kept = {};

    for (const key of keys) {
      const val = data[key];
      // Try parsing as ISO timestamp
      const ts = typeof val === "string" ? new Date(val).getTime() : 0;
      if (ts > cutoff || Number.isNaN(ts)) {
        kept[key] = val;
      }
    }

    const after = Object.keys(kept).length;
    if (after === before) return { expired: false, before, after };

    if (!isSafeToWrite(filePath) || !isSafeToWrite(tmpPath) || !isSafeToWrite(bakPath))
      return { expired: false, before, after: before };
    safeWriteFileSync(tmpPath, JSON.stringify(kept, null, 2), "utf-8");
    backupSwap(filePath, tmpPath, bakPath);

    return { expired: true, before, after };
  } catch {
    silentRm(tmpPath);
    return { expired: false, before: 0, after: 0 };
  }
}

/**
 * Expire entries in a JSONL file where a timestamp field is older than maxDays.
 *
 * @param {string} filePath - Absolute path to JSONL file
 * @param {number} maxDays - Remove entries older than this many days
 * @param {string} [timestampField="timestamp"] - Field name containing ISO timestamp
 * @returns {{ expired: boolean, before: number, after: number }}
 */
function expireJsonlByAge(filePath, maxDays, timestampField) {
  const field = timestampField || "timestamp";
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;
  try {
    const content = readUtf8Sync(filePath);
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    const before = lines.length;

    const kept = lines.filter((line) => {
      const entry = safeParseLine(line);
      if (!entry) return true; // Keep unparseable/blank lines
      const ts = new Date(entry[field]).getTime();
      return Number.isNaN(ts) || ts > cutoff;
    });

    const after = kept.length;
    if (after === before) return { expired: false, before, after };

    if (!isSafeToWrite(filePath) || !isSafeToWrite(tmpPath) || !isSafeToWrite(bakPath))
      return { expired: false, before, after: before };
    safeWriteFileSync(tmpPath, kept.join("\n") + "\n", "utf-8");
    backupSwap(filePath, tmpPath, bakPath);

    return { expired: true, before, after };
  } catch {
    silentRm(tmpPath);
    return { expired: false, before: 0, after: 0 };
  }
}

/**
 * Rotate a JSONL file, archiving discarded entries instead of deleting.
 * Appends evicted entries to `${filePath}.archive` (creates if missing).
 * Uses advisory file locking to prevent concurrent rotation races.
 *
 * @param {string} filePath - Absolute path to JSONL file
 * @param {number} maxEntries - Trigger rotation when line count exceeds this
 * @param {number} [keepCount] - Lines to keep after rotation (default: 60% of maxEntries)
 * @returns {{ rotated: boolean, before: number, after: number, archived: number }}
 */
function archiveRotateJsonl(filePath, maxEntries, keepCount) {
  const keepRaw = keepCount || Math.floor(maxEntries * 0.6);
  const keep = Math.max(1, keepRaw);
  try {
    // Import locking from safe-fs
    let withLock;
    try {
      ({ withLock } = require(path.join(__dirname, "..", "..", "..", "scripts", "lib", "safe-fs")));
    } catch {
      // Fallback: no locking (degrade gracefully)
      withLock = (_p, fn) => fn();
    }

    return withLock(filePath, () => {
      const content = readUtf8Sync(filePath);
      const lines = content.split("\n").filter((l) => l.trim().length > 0);

      if (lines.length <= maxEntries) {
        return { rotated: false, before: lines.length, after: lines.length, archived: 0 };
      }

      // Ack-aware rotation: if an ack file exists, preserve unacked entries.
      // Otherwise fall back to positional eviction (original behavior).
      const ackPath = filePath.replace(/\.jsonl$/, "").replace(/-log$/, "") + "-ack.json";
      let lastCleared = null;
      try {
        const ackRaw = readUtf8Sync(ackPath);
        const ack = JSON.parse(ackRaw);
        if (ack.lastCleared) {
          const lastClearedDate = new Date(ack.lastCleared);
          if (!Number.isNaN(lastClearedDate.getTime())) lastCleared = lastClearedDate;
        }
      } catch {
        // No ack file — use positional eviction
      }

      let evicted, kept;
      if (lastCleared) {
        const acked = [];
        const unacked = [];
        for (const line of lines) {
          let isUnacked = true;
          const entry = safeParseLine(line);
          if (entry && entry.timestamp) {
            const ts = new Date(entry.timestamp);
            if (!Number.isNaN(ts.getTime()) && ts <= lastCleared) isUnacked = false;
          }
          // malformed/blank lines treated as unacked (fall through)
          (isUnacked ? unacked : acked).push(line);
        }
        const ackedToKeep = Math.max(0, keep - unacked.length);
        const keptAcked = ackedToKeep > 0 ? acked.slice(-ackedToKeep) : [];
        evicted = acked.slice(0, Math.max(0, acked.length - ackedToKeep));
        kept = [...keptAcked, ...unacked];

        // Hard cap: if unacked alone exceeds keep, evict oldest unacked
        if (kept.length > keep) {
          const overflow = kept.length - keep;
          evicted = [...evicted, ...kept.slice(0, overflow)];
          kept = kept.slice(overflow);
        }
      } else {
        // No ack file — positional eviction
        evicted = lines.slice(0, -keep);
        kept = lines.slice(-keep);
      }

      // Archive evicted entries (append to .archive file)
      const archivePath = `${filePath}.archive`;
      if (evicted.length > 0) {
        const archiveData = evicted.join("\n") + "\n";
        if (isSafeToWrite(path.resolve(archivePath))) {
          safeAppendFileSync(archivePath, archiveData, "utf-8");
        }
      }

      // Atomic write for active file: PR #3 R1 (M3) backup-swap pattern.
      const tmpPath = `${filePath}.tmp`;
      const bakPath = `${filePath}.bak`;
      if (!isSafeToWrite(filePath) || !isSafeToWrite(tmpPath) || !isSafeToWrite(bakPath)) {
        return { rotated: false, before: lines.length, after: lines.length, archived: 0 };
      }
      try {
        safeWriteFileSync(tmpPath, kept.join("\n") + "\n", "utf-8");
        backupSwap(filePath, tmpPath, bakPath);
      } catch (swapErr) {
        silentRm(tmpPath);
        throw swapErr;
      }

      return { rotated: true, before: lines.length, after: kept.length, archived: evicted.length };
    });
  } catch (err) {
    const errDetail =
      err && typeof err === "object" && "code" in err ? err.code : sanitizeError(err);
    process.stderr.write(`[archiveRotateJsonl] Error rotating ${filePath}: ${errDetail}\n`);
    return { rotated: false, before: 0, after: 0, archived: 0 };
  }
}

module.exports = { rotateJsonl, pruneJsonKey, expireByAge, expireJsonlByAge, archiveRotateJsonl };
