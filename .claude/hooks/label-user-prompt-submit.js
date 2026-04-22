#!/usr/bin/env node
/**
 * label-user-prompt-submit.js — delegator for the UserPromptSubmit label hook.
 *
 * Thin delegator to `.claude/sync/label/hooks/user-prompt-submit-label.js`.
 * See the companion delegator `label-post-tool-use.js` for the rationale
 * (run-node.sh HOOKS_DIR confinement).
 *
 * Piece 3 structural-fix D7.4.
 */

"use strict";

const path = require("node:path");

require(path.join(
  __dirname,
  "..",
  "sync",
  "label",
  "hooks",
  "user-prompt-submit-label.js"
));
