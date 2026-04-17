/**
 * read-jsonl.js — Shared JSONL parser for planning scripts.
 *
 * Handles:
 * - Comment lines (// at any indent level)
 * - Empty lines
 * - CRLF line endings
 * - Parse error warnings (non-fatal)
 * - Fatal read errors (process.exit)
 *
 * Uses a synchronous chunk-streaming helper so this library caller can tolerate
 * arbitrary input size without a 2 MiB whole-file ceiling.
 */

import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { streamLinesSync } = require("../../lib/safe-fs");
const { sanitizeError } = require("../../lib/sanitize-error.cjs");

/**
 * Read and parse a JSONL file from the planning directory.
 *
 * @param {string} planningDir - Absolute path to the planning directory
 * @param {string} filename - JSONL filename relative to planningDir
 * @returns {object[]} Parsed JSON objects
 */
export function readJsonl(planningDir, filename) {
  const filepath = join(planningDir, filename);
  const results = [];
  let lineNum = 0;
  // PR #3 R2 (N4): cap parse-error warnings to prevent log DoS on heavily
  // corrupted JSONL. After MAX_WARNINGS, emit one summary warning and suppress.
  let warned = 0;
  const MAX_WARNINGS = 25;
  try {
    streamLinesSync(filepath, (rawLine) => {
      lineNum++;
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith("//")) return;
      try {
        results.push(JSON.parse(trimmed));
      } catch (err) {
        if (warned < MAX_WARNINGS) {
          // CLAUDE.md §5: never log raw err.message — sanitize first.
          console.warn(
            `WARNING: ${filename} line ${lineNum}: parse error — ${sanitizeError(err)}`
          );
          warned++;
        } else if (warned === MAX_WARNINGS) {
          console.warn(
            `WARNING: ${filename}: too many parse errors; suppressing further warnings`
          );
          warned++;
        }
      }
    });
    return results;
  } catch (err) {
    // CLAUDE.md §5: never log raw err.message — sanitize first.
    console.error(`FATAL: Cannot read ${filename}: ${sanitizeError(err)}`);
    process.exit(1);
  }
}

/**
 * Escape a string for use in a Markdown table cell.
 * Escapes backslashes first, then pipes, then normalizes newlines.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for MD table cells
 */
export function escapeCell(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", String.raw`\|`)
    .replaceAll("\r", "")
    .replaceAll("\n", " ");
}
