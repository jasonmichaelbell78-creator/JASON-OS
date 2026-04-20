/**
 * catalog-io.js — Atomic JSONL read/write for label catalogs.
 *
 * Single point of change for Piece 4 if the catalog format / path ever moves
 * (TOML, SQLite, merged shared+local file, etc.). All Piece 3 reads and
 * writes go through this module.
 *
 * Guarantees:
 *   - Reads: handle missing file (returns []), skip blank lines, sanitized
 *     error on malformed JSON (line number included).
 *   - Writes: atomic — write to tmp, rename to final (via safe-fs.js).
 *   - updateRecord: read-modify-write under an advisory lock (withLock).
 *
 * Record shape is whatever Piece 3 writes per CATALOG_SHAPE.md — this module
 * is schema-agnostic. Validation lives in validate-catalog.js.
 */

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT_SENTINEL = path.join(__dirname, "..", "..", "..", "..");
const {
  safeAtomicWriteSync,
  readTextWithSizeGuard,
  streamLinesSync,
  withLock,
} = require(path.join(REPO_ROOT_SENTINEL, "scripts", "lib", "safe-fs.js"));
const { sanitize } = require("./sanitize");

// Catalog files can grow past the 2 MiB default read ceiling once JASON-OS
// + SoNash are both populated. Use streaming reads so we don't cap at 2 MiB.
const STREAMING_THRESHOLD_BYTES = 1 * 1024 * 1024;

/**
 * Read a JSONL catalog. Missing file → empty array. Blank lines skipped.
 * Malformed JSON lines throw with line number and sanitized detail.
 *
 * @param {string} catalogPath - Absolute or repo-relative path
 * @returns {object[]} Parsed records, one per non-blank line
 */
function readCatalog(catalogPath) {
  const abs = path.resolve(catalogPath);
  if (!fs.existsSync(abs)) return [];

  let size;
  try {
    size = fs.statSync(abs).size;
  } catch (err) {
    throw new Error(`catalog-io.readCatalog: stat failed: ${sanitize(err)}`);
  }
  if (size === 0) return [];

  const records = [];
  let lineNo = 0;

  if (size < STREAMING_THRESHOLD_BYTES) {
    let text;
    try {
      text = readTextWithSizeGuard(abs);
    } catch (err) {
      throw new Error(`catalog-io.readCatalog: read failed: ${sanitize(err)}`);
    }
    for (const rawLine of text.split("\n")) {
      lineNo += 1;
      const line = rawLine.trim();
      if (line.length === 0) continue;
      records.push(parseLine(line, lineNo, catalogPath));
    }
    return records;
  }

  try {
    streamLinesSync(abs, (rawLine) => {
      lineNo += 1;
      const line = rawLine.trim();
      if (line.length === 0) return;
      records.push(parseLine(line, lineNo, catalogPath));
    });
  } catch (err) {
    throw new Error(`catalog-io.readCatalog: streaming read failed: ${sanitize(err)}`);
  }
  return records;
}

function parseLine(line, lineNo, catalogPath) {
  try {
    return JSON.parse(line);
  } catch (err) {
    throw new Error(
      `catalog-io.readCatalog: ${path.basename(catalogPath)} line ${lineNo} malformed JSON: ${sanitize(err)}`
    );
  }
}

/**
 * Atomic JSONL write: serialize records one-per-line, then safe-atomic-write.
 * Overwrites any existing catalog. Use updateRecord() for read-modify-write.
 *
 * @param {string} catalogPath
 * @param {object[]} records
 */
function writeCatalog(catalogPath, records) {
  if (!Array.isArray(records)) {
    throw new TypeError("catalog-io.writeCatalog: records must be an array");
  }
  const abs = path.resolve(catalogPath);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`catalog-io.writeCatalog: mkdir failed: ${sanitize(err)}`);
  }

  const lines = records.map((record, idx) => {
    try {
      return JSON.stringify(record);
    } catch (err) {
      throw new Error(
        `catalog-io.writeCatalog: record ${idx} not JSON-serializable: ${sanitize(err)}`
      );
    }
  });
  // Terminal newline so appenders/concat tools work cleanly.
  const payload = lines.length === 0 ? "" : `${lines.join("\n")}\n`;

  try {
    safeAtomicWriteSync(abs, payload, { encoding: "utf8" });
  } catch (err) {
    throw new Error(`catalog-io.writeCatalog: atomic write failed: ${sanitize(err)}`);
  }
}

/**
 * Read-modify-write under an advisory lock. `updater(record | null) → record`
 * is called with the current record for the given key (or null if none),
 * and must return the new record (or null to delete).
 *
 * @param {string} catalogPath
 * @param {string} primaryKey - The `path` value identifying the record
 * @param {(record: object | null) => object | null} updater
 * @returns {object | null} The updated record (or null on delete)
 */
function updateRecord(catalogPath, primaryKey, updater) {
  if (typeof primaryKey !== "string" || primaryKey.length === 0) {
    throw new TypeError("catalog-io.updateRecord: primaryKey must be a non-empty string");
  }
  if (typeof updater !== "function") {
    throw new TypeError("catalog-io.updateRecord: updater must be a function");
  }
  const abs = path.resolve(catalogPath);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`catalog-io.updateRecord: mkdir failed: ${sanitize(err)}`);
  }

  return withLock(abs, () => {
    const records = readCatalog(abs);
    const idx = records.findIndex((r) => r && r.path === primaryKey);
    const current = idx >= 0 ? records[idx] : null;
    const next = updater(current);
    if (next === null) {
      if (idx >= 0) records.splice(idx, 1);
    } else if (!next || typeof next !== "object") {
      throw new TypeError(
        "catalog-io.updateRecord: updater must return an object or null"
      );
    } else {
      if (next.path !== primaryKey) {
        throw new Error(
          "catalog-io.updateRecord: updater must not change `path` (primary key)"
        );
      }
      if (idx >= 0) records[idx] = next;
      else records.push(next);
    }
    writeCatalog(abs, records);
    return next;
  });
}

/**
 * Look up a single record by its `path` primary key. Returns null if missing.
 * Non-locking read — for read-modify-write use updateRecord().
 *
 * @param {string} catalogPath
 * @param {string} primaryKey
 * @returns {object | null}
 */
function findRecord(catalogPath, primaryKey) {
  const records = readCatalog(catalogPath);
  return records.find((r) => r && r.path === primaryKey) ?? null;
}

module.exports = {
  readCatalog,
  writeCatalog,
  updateRecord,
  findRecord,
};
