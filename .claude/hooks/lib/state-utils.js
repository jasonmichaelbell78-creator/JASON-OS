/* eslint-disable */
/**
 * Shared JSON state persistence utilities for hooks.
 * Extracted from post-read-handler.js, pre-compaction-save.js
 *
 * Features:
 *   - Atomic write with tmp+backup strategy
 *   - Symlink guard integration (optional, used when available)
 *   - Cross-drive fallback (Windows)
 */
const fs = require("node:fs");
const path = require("node:path");

// PR #3 R1 (M4): route file I/O through safe-fs helpers per CLAUDE.md §5.
let safeWriteFileSync, safeRenameSync, readUtf8Sync;
try {
  ({ safeWriteFileSync, safeRenameSync, readUtf8Sync } = require(
    path.join(__dirname, "..", "..", "..", "scripts", "lib", "safe-fs")
  ));
} catch {
  // Fallback shim: direct fs (preserves prior behavior if safe-fs unavailable).
  // The isSafeToWrite check below still gates writes against symlinks.
  safeWriteFileSync = (p, d, o) => fs.writeFileSync(p, d, o);
  safeRenameSync = (s, d) => fs.renameSync(s, d);
  readUtf8Sync = (p) => fs.readFileSync(p, "utf8");
}

let isSafeToWrite;
try {
  ({ isSafeToWrite } = require("./symlink-guard"));
} catch {
  // Fail-closed: only allow writes within known .claude subdirectories
  isSafeToWrite = (p) => {
    try {
      const claudeDir = path.resolve(__dirname, "..", "..");
      const claudeReal = fs.realpathSync(claudeDir);

      // Don't require state/hooks dirs to exist yet (fresh repo); saveJson will mkdirSync them.
      const stateRoot = path.resolve(claudeReal, "state");
      const hooksRoot = path.resolve(claudeReal, "hooks");

      const abs = path.resolve(p);
      // For new files (.tmp, .bak), realpath the parent dir and validate containment
      const parentReal = fs.realpathSync(path.dirname(abs));

      const norm = (x) => (process.platform === "win32" ? x.toLowerCase() : x);
      const isUnder = (dir, root) => {
        const dirNorm = norm(dir);
        const rootNorm = norm(root);
        return dirNorm === rootNorm || dirNorm.startsWith(rootNorm + path.sep);
      };

      return isUnder(parentReal, stateRoot) || isUnder(parentReal, hooksRoot);
    } catch {
      return false;
    }
  };
}

/**
 * Load and parse a JSON file. Returns null on any error.
 * @param {string} filePath
 * @returns {any|null}
 */
function loadJson(filePath) {
  try {
    return JSON.parse(readUtf8Sync(filePath));
  } catch {
    return null;
  }
}

/** Remove file silently (best-effort). */
function silentRm(p) {
  try {
    fs.rmSync(p, { force: true });
  } catch {
    /* ignore */
  }
}

/** Atomic backup-swap: move existing dest to .bak, rename tmp to dest. */
function backupSwap(filePath, tmpPath, bakPath) {
  silentRm(bakPath);
  if (fs.existsSync(filePath)) {
    try {
      safeRenameSync(filePath, bakPath);
    } catch {
      // Don't delete original on backup failure; best-effort copy instead
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
    // Restore backup if rename failed to prevent data loss
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
 * Save data as JSON with atomic write (tmp+backup strategy).
 * @param {string} filePath
 * @param {any} data
 * @returns {boolean} true on success
 */
function saveJson(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  const bakPath = `${filePath}.bak`;
  let safeToWrite = false;
  try {
    // PR #3 R2 (N2): pre-check parent dir against allowed roots BEFORE mkdirSync,
    // so an attacker-controlled filePath can't cause directory creation outside .claude/.
    const claudeDir = path.resolve(__dirname, "..", "..");
    const allowedRoots = [path.resolve(claudeDir, "state"), path.resolve(claudeDir, "hooks")];
    const absDir = path.dirname(path.resolve(filePath));
    const norm = (x) => (process.platform === "win32" ? x.toLowerCase() : x);
    const isUnder = (dir, root) => {
      const dirN = norm(dir);
      const rootN = norm(root);
      return dirN === rootN || dirN.startsWith(rootN + path.sep);
    };
    if (!allowedRoots.some((r) => isUnder(absDir, r))) return false;

    // Ensure parent dir exists before isSafeToWrite (which needs realpathSync)
    fs.mkdirSync(absDir, { recursive: true });
    safeToWrite = isSafeToWrite(filePath) && isSafeToWrite(tmpPath) && isSafeToWrite(bakPath);
    if (!safeToWrite) return false;
    safeWriteFileSync(tmpPath, JSON.stringify(data, null, 2));
    backupSwap(filePath, tmpPath, bakPath);
    return true;
  } catch {
    // Rollback: restore backup if dest was moved but tmp rename failed
    try {
      if (fs.existsSync(bakPath) && !fs.existsSync(filePath)) {
        safeRenameSync(bakPath, filePath);
      }
    } catch {
      /* ignore */
    }
    // Fallback: direct write if rename fails (Windows cross-drive)
    if (!safeToWrite) return false;
    try {
      safeWriteFileSync(filePath, JSON.stringify(data, null, 2));
      silentRm(tmpPath);
      silentRm(bakPath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { loadJson, saveJson };
