#!/usr/bin/env node
/**
 * label-post-tool-use.js — delegator for the PostToolUse label hook.
 *
 * The real hook implementation lives at
 * `.claude/sync/label/hooks/post-tool-use-label.js`. The Claude Code
 * `run-node.sh` wrapper restricts script invocations to files under
 * `.claude/hooks/` (security guard against path traversal), so this
 * thin delegator re-exposes the implementation from the canonical
 * location without duplicating its body.
 *
 * Piece 3 structural-fix D7.1 + D7.4.
 */

"use strict";

const path = require("node:path");

// Delegation is a plain require — the sync/label hook module executes its
// entry logic (reads stdin, processes, exits) on load, matching the hook
// invocation contract.
require(path.join(
  __dirname,
  "..",
  "sync",
  "label",
  "hooks",
  "post-tool-use-label.js"
));
