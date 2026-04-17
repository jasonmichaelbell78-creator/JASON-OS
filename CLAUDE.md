# AI Context & Rules for JASON-OS

**Document Version:** 0.1
**Last Updated:** 2026-04-15
**Status:** ACTIVE (bootstrap)

## Purpose

Core rules and constraints loaded on every AI turn. Kept minimal to reduce
token waste. Situational guidance lives in on-demand reference docs.

JASON-OS is a portable Claude Code operating system — skills, agents, hooks,
and workflows extracted from SoNash and sanitized to work in any project.

---

## 1. Stack

_TBD — stack not yet chosen. Add versions here once decided._

## 2. Security Rules

_TBD — populated when the stack and integration points are chosen._

## 3. Architecture

_TBD — populated as the OS structure solidifies._

## 4. Behavioral Guardrails

> [!CAUTION] Non-negotiable. Violating these wastes the user's time.

Annotations per research G4: `[GATE]` = automated hook/CI enforcement exists;
`[BEHAVIORAL: honor-only]` = no automated block, relies on in-context
compliance; `[MIXED]` = partially gated. `NEEDS_GATE: <hook>` flags rules
that should become `[GATE]` once the named hook lands.

1. **Ask on first confusion, not fourth.** Don't guess-and-retry.
   `[BEHAVIORAL: honor-only]`
2. **Never implement without explicit approval.** Present plan, wait for "go."
   `[BEHAVIORAL: honor-only]`
3. **Read SKILL.md before following any skill format.** Don't improvise from
   memory. `[BEHAVIORAL: honor-only]`
4. **"Stop and ask" = hard stop.** No action until clarification received.
   `[BEHAVIORAL: honor-only]`
5. **One correction = full stop.** Stop, ask what's wrong, confirm, then
   proceed. `[BEHAVIORAL: honor-only — NEEDS_GATE: user-prompt-handler frustrationDetection]`
6. **All surfaced data must force acknowledgment.** No fire-and-forget warnings.
   `[BEHAVIORAL: honor-only]`
7. **Never push without explicit approval.** `commit` is fine; `push` requires
   user say-so. `[GATE: block-push-to-main.js]`
8. **Respect declared platform/shell.** Check system prompt before shell
   commands. `[BEHAVIORAL: honor-only]`
9. **On pre-commit failure, use `/pre-commit-fixer`.** After 2 attempts, ask.
   `[BEHAVIORAL: honor-only — NEEDS_GATE: loop-detector.js]`
10. **Question batches: 5-8 max** (unless `/deep-plan` exhaustive mode).
    `[BEHAVIORAL: honor-only]`
11. **Verify no untracked files** before PR, branch completion, or
    `/session-end`. `[BEHAVIORAL: honor-only]`
12. **Verify file state against filesystem**, not docs/memory/conversation.
    `[BEHAVIORAL: honor-only]`
13. **Review hook summary after every commit/push.** Present warnings with
    remediation options. `[BEHAVIORAL: honor-only]`
14. **Never set SKIP_REASON autonomously.** User must authorize exact wording.
    `[MIXED: settings-guardian.js (settings.json write); git push args BEHAVIORAL]`
15. **Never accept empty agent results silently.** Windows 0-byte bug — check
    `<result>` field, report failures.
    `[BEHAVIORAL: honor-only — NEEDS_GATE: track-agent-invocation.js result-size check]`
16. **Follow skills exactly.** Never skip steps without explicit user approval.
    `[BEHAVIORAL: honor-only]`

## 5. Critical Anti-Patterns

Generic patterns that apply regardless of stack. Consult
`scripts/lib/security-helpers.js` and `scripts/lib/sanitize-error.js` when
writing shell scripts, hooks, or any code touching file I/O, CLI args, or
error output.

| Pattern            | Rule                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| Error sanitization | Use `scripts/lib/sanitize-error.js` — never log raw `error.message`          |
| Path traversal     | Use `/^\.\.(?:[\\/]&#124;$)/.test(rel)` NOT `startsWith('..')`               |
| File reads         | Wrap ALL in try/catch (existsSync race condition)                            |
| exec() loops       | `/g` flag REQUIRED on regex (no `/g` = infinite loop)                        |
| Regex two-strikes  | If a linter flags a regex twice, replace with string parsing — don't patch   |

## 6. Coding Standards

_Stack-specific rules TBD. Language-agnostic defaults:_

- Strict typing where the language supports it
- Functional composition over deep inheritance
- Runtime validation at system boundaries only (user input, external APIs)
- No broad `catch` that swallows errors — sanitize then re-throw or handle
  specifically

## 7. Agent/Skill Triggers

> [!CAUTION] Agents are REQUIRED when triggers match — not optional.

### PRE-TASK (before starting work)

| Trigger                         | Action                 | Tool  |
| ------------------------------- | ---------------------- | ----- |
| Creative exploration, ideation  | `brainstorm` skill     | Skill |
| Thorough planning requested     | `deep-plan` skill      | Skill |
| Domain/technology research      | `deep-research` skill  | Skill |
| Exploring unfamiliar code       | `Explore` agent        | Task  |
| Multi-step implementation       | `Plan` agent           | Task  |

**Session boundaries**: `/session-begin` at start. (`/session-end`, `/pr-review`, `/pr-retro` — deferred; see `.planning/jason-os/BOOTSTRAP_DEFERRED.md`.)
**Checkpoint**: `/checkpoint` before risky operations or compaction.
**Todos**: `/todo` for cross-session task tracking.

## 8. Reference Docs

_TBD — add as the OS gains internal documentation._

---

**Version:** 0.1 (2026-04-15) — Bootstrap. Sanitized extraction from SoNash
CLAUDE.md v6.0.
