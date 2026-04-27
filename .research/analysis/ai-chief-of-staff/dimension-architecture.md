# Dimension: Architecture

## Shape

Personal-OS template structured as three concentric layers:

1. **Vault layer** (Obsidian-flavored markdown) — `vault-template/` ships with `Command Center.md`, `To-Do.md`, and a `_system/` machinery folder (last_session, hot.md, Session Log, memory_firings.log). User-readable files at the top, machine-readable state in `_system/`.
2. **Skill layer** (Claude Code conventions) — `.claude/skills/{setup,start,sync,wrap,audit}/SKILL.md`. Five skills total. Each is short (under 200 lines) and contains plain-English instructions, not code.
3. **Memory layer** (`.claude/memory/`) — four named files (`user_profile`, `preferences`, `projects`, `session_context`) + `MEMORY.md` index. Type-prefix convention (`user_*`, `feedback_*`, `project_*`, `reference_*`) for growth.

`CLAUDE.md` at the root is the operating-instructions binding all three layers together — it tells Claude how the system reads/writes the vault, what rules apply, what the briefing structure is.

## Patterns observed

- **RAG-over-local-vault** as the substrate. No database, no cloud. Markdown plus an LLM reader.
- **Append-only audit trail** via `Session Log.md` and `memory_firings.log`. Both are write-only-grow logs the model rarely re-loads.
- **Two-tier session handoff:** `last_session.md` (structured frontmatter) + `hot.md` (low-fidelity prose) carry context across the session boundary.
- **Bootstrap gate inside `/audit`:** decay analysis stays dormant until firings log holds 10 distinct sessions. Direct instance of the resolve-before-gate pattern.
- **Skill files are prose, not code.** Each SKILL.md is a YAML-frontmatter Markdown doc with `user_invocable: true`. No execution logic; the model is the runtime.
- **Type-prefix memory naming** (`feedback_communication_style.md`, etc.) — convention only, not tooling-enforced.
- **CLAUDE.md as instruction set, not documentation.** Explicit philosophy: rules go in, take effect next session, compound. Bad rules get cut after a week.

## What's notable

- Five skills accomplish the entire daily loop. None exceed ~200 lines. The whole system fits in a developer's head.
- Clean separation between **what the user reads** (`Command Center.md`, `To-Do.md`) and **what the machinery needs** (`_system/`). Frontmatter and tracking files live behind `_system/` so daily-read files stay readable.
- `/audit` skill is read-mostly — it produces a report; the human picks fixes. That discipline (don't auto-fix, surface decisions) matches JASON-OS conventions.

## Findings

| ID     | Severity | Finding                                                                                                                                |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-1 | Info     | Five-skill loop is unusually compact. Comparable JASON-OS systems run 15+ skills.                                                      |
| ARCH-2 | Info     | No formal SCOPE manifest or schema contracts. Skills self-describe in prose; `audit/SKILL.md` is the only cross-skill integrity check. |
| ARCH-3 | Info     | No multi-agent / sub-agent pattern. Single-conversation paradigm throughout.                                                           |
| ARCH-4 | Info     | `scripts/hooks/` directory exists with a `.gitkeep` — hook layer is documented but ships zero hooks.                                   |

## Band

**Excellent (84)** — small, coherent, every piece earns its place. Loses points only for missing what it deliberately doesn't ship (multi-agent, formal contracts).
