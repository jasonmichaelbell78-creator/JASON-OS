#!/usr/bin/env node
/**
 * plain-language-reminder.js — UserPromptSubmit hook.
 *
 * Injects a short reminder of the JASON-OS conversational/plain-language
 * tenet at the top of every user turn so it stays salient without
 * relying on memory recall.
 *
 * stdout from a UserPromptSubmit hook is appended to the user's prompt
 * as additional context. No stdin is read; no file I/O; no errors to
 * sanitize. Safe to run on every prompt.
 *
 * Source-of-truth memory:
 *   ~/.claude/projects/.../memory/tenet_conversational_explanatory.md
 *   ~/.claude/projects/.../memory/feedback_plain_english_over_research_labels.md
 */

"use strict";

const reminder = [
  "[JASON-OS tenet — conversational, plain language, explanatory]",
  "Talk to the user as a collaborator. Prose is the default; tables and lists earn their place.",
  "Lead with concepts in plain English. Don't front-load D-codes, C-codes, OTB labels, or other research shorthand — translate them first, label only if useful for cross-reference.",
  "Always frame the WHY alongside the WHAT. Never present options without rationale per option, including weaknesses of the preferred option.",
].join("\n");

process.stdout.write(reminder + "\n");
process.exit(0);
