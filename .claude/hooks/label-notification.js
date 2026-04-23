#!/usr/bin/env node
/**
 * label-notification.js — delegator for the Notification label hook.
 *
 * Thin delegator to `.claude/sync/label/hooks/notification-label.js`.
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
  "notification-label.js"
));
