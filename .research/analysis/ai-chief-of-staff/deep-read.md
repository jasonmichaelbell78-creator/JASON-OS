# Deep Read

A repo's knowledge lives in its docs and skills, not just its code. This pass catalogs every internal artifact in `jdpolasky/ai-chief-of-staff` and surfaces what each one *knows* that wouldn't be visible from code alone. Total artifact count: 31 files. All read in full except where noted.

## Top-level instruction layer

**`README.md`** — Non-coder install path with embedded "have Claude walk you through it" affordance: paste the README into a Claude conversation and the doc was written to be readable both as install steps for a human and as walkthrough instructions for an LLM coach. That double-mode framing is itself a teachable pattern. Names other April-2026 personal-OS repos as siblings, not competitors (ADAM Framework, unmutable/ai-chief-of-staff, kbanc85/claudia, MemPalace, Hermes).

**`CLAUDE.md`** — The shipped template. Frontmatter-style headings for Operating Principles, Briefing Structure, Your Patterns, Preferences, Continuous Improvement, Verification Protocol, Operating Constraint, Memory, Compaction. **Designed to be edited by `/setup` wizard,** not hand-written. The template's design is itself the teaching: an instruction set the operator grows over time, not documentation.

**`SKILL.md`** (top-level) — A single-file skill manifest with frontmatter. Names the system "Chief of Staff," tags it with `[chief-of-staff, productivity, adhd, memory, obsidian, claude-code, vault, loop]`. Doubles as an executive summary; lists what-it-solves and what-this-is-not.

**`ARCHITECTURE.md`** — The long-form essay. Knowledge here that's not in the code:
- The lineage chain (custom GPTs 2024 → IFS therapist GPT → Claude Code 2026 → current loop). Multi-year arc.
- "Three-tier memory model" framing — vault source / session logs / `.claude/memory/` — sorted by load frequency.
- "The hook layer" as a *design choice* the template deliberately leaves empty.
- Why-markdown / why-Obsidian / why-Claude-Code triad with explicit defenses ("plain text outlives the tool").
- Explicit "what is NOT included" list (no web UI, no multi-user, no built-in scheduling).
- Extension-point catalog: custom slash commands, additional memory files, new hooks.

## docs/ folder — the actual knowledge layer

**`docs/laws.md`** — Four operating laws explained with rationale and copy-pasteable instruction blocks: Operating Constraint, Verification Protocol, Scope Discipline, Execute-Don't-Meta-Talk. Each law has a story behind it (Execute-Don't-Meta-Talk literally cost the author 40 minutes once). **This is the most JASON-OS-relevant doc** — the four laws have direct correspondence to JASON-OS behavioral guardrails.

**`docs/memory.md`** — Persistent memory architecture: four types (user/feedback/project/reference), frontmatter spec (`name`, `description`, `type`, optional `decay: exempt`, optional `originSessionId`). Rules for save/don't-save ("if I can grep the repo, the memory shouldn't exist"). **The decay-and-provenance section is the headline contribution:** firings log appended at `/wrap`, decay analysis run inside `/audit` every 7 sessions, dormant until 10 distinct sessions accumulate (bootstrap gate).

**`docs/protocols.md`** — Wiring detail per command. What each reads, what it writes, what its failure modes look like. Distills the deterministic Phase-1 vs reflective Phase-2 split inside `/wrap`. Covers Command Center skeleton, the four-quadrant to-do system (Eisenhower-derived), session log semantics (append-only, never re-loaded). **State files are documented at the contract level** — `last_session.md` frontmatter has `date:` and `session:`; `hot.md` is a deliberately low-fidelity paragraph; `Session Log.md` is append-only narrative; `memory_firings.log` is single-line-per-firing.

**`docs/feedback-loop.md`** — How a friction-moment becomes a durable memory. Three pieces: rule, why, how-to-apply. Worked example. **Strong warning about rubber-stamping AI-drafted feedback memories** ("the same model that just made the mistake is drafting the rule meant to prevent the mistake; rule reflects the model's interpretation of its own failure, which can be wrong in subtle ways"). Naming the danger is unusual.

**`docs/obsidian-setup.md`** (3,226 tokens, partial read) — Five-layer wiring: vault → plugins → Obsidian CLI → MCP servers → Python hook layer. Names the specific plugins (Dataview, Tasks, Templater, Smart Connections, MCP Tools) with rationale per plugin. Includes platform-specific paths and a minimal `claude_desktop_config.json` template. Audience: non-coder + LLM coach simultaneously.

**`docs/notion-vs-obsidian.md` + `docs/notion-vs-obsidian-deep.md`** — Editorial; not read in this pass. Flagged for Coverage Audit.

**`CREDITS.md`** — Attribution to ADAM Framework. Not read in detail but its existence signals appropriate citation discipline.

## .claude/skills/ — the daily loop

Five skills, each under ~200 lines, all prose-first instructions. None contain executable code; the model is the runtime.

- **`setup/SKILL.md`** (190 lines) — First-time wizard. Five-step interview, Step 1 minimum (4 questions), Steps 2-5 optional. Clear file-write rules (read-before-overwrite, never seed To-Do without confirmation, conditional-content-gets-appended). Edge-case handling for special characters in lane names, lane-count of 1 or ≥5, name-skipped fallback. Knowledge here that's not in code: the wizard explicitly *prefers minimal* and ships-it-quickly defaults; "every question is skippable" stated up-front and meant.
- **`start/SKILL.md`** (45 lines) — Morning briefing. Reads four state files in parallel, optional Gmail/Calendar pull via MCP, re-entry detection from `last_session.md` frontmatter date, gap-tolerance ("3+ days = shorten briefing, no guilt"). Ends with `"What do you want to work on?"` — invitation, not assignment.
- **`sync/SKILL.md`** (21 lines) — Mid-session checkpoint. Optional. Pre-pend new entry to `session_context.md`, scan-and-remove entries older than 7 days. Ask before editing Command Center / To-Do.
- **`wrap/SKILL.md`** (85 lines) — Two-phase close: Phase 1 deterministic (move checked tasks to Done, bump Command Center date, increment session counter, append to Session Log + last_session.md, overwrite hot.md, append firings log, audit-due flag if session % 7 == 0); Phase 2 reflective (reflect wins, update memory, propose Waiting For additions, suggest next session entry-point).
- **`audit/SKILL.md`** (56 lines) — Periodic integrity check, every 7 sessions or audit-due flag. Read-mostly: surfaces findings as a report; user picks fixes. Six-point checklist: redundant memory, stale memory, MEMORY.md index drift, broken wikilinks, skill-vs-system drift, decay analysis (gated on 10-session threshold).

## .claude/memory/ — the floor

`MEMORY.md` (8 lines) — Index pointing at four core memory files. The index is intentionally short: one line per file, under 150 chars.

The four core files (`user_profile.md`, `preferences.md`, `projects.md`, `session_context.md`) ship as empty stubs the `/setup` wizard fills in.

## vault-template/ — the sample vault

User-facing files (`Command Center.md`, `To-Do.md`) and machinery files in `_system/` (`hot.md`, `last_session.md`, `Session Log.md`, `memory_firings.log`). Template content not read in detail this pass — flagged for Coverage Audit.

## scripts/

`scripts/smart_search.py` (~200 lines) — Wraps the Obsidian CLI. Two modes: semantic connections (via Smart Connections plugin's `find_connections` API exposed through Obsidian's `eval` JS endpoint) and keyword search. **Code quality is competent:** uses `json.dumps` to safely embed file keys into the JS source (defense against quoting), uses `subprocess.run` with explicit timeouts, has proper error handling and exit codes, surfaces config errors with actionable messages. Defaults per-platform path; overridable via `OBSIDIAN_CLI` env var.

`scripts/hooks/` — directory exists with a `.gitkeep` only. No hook scripts ship.

## .claude/settings.json

Single line: `{}`. Empty. Intentional — the template "ships hooks empty so operators write their own."

## What this Deep Read confirms

1. **The repo is overwhelmingly a docs + skills artifact.** ~3,500+ lines of prose explanation; ~200 lines of executable code. The instruction layer IS the deliverable.
2. **WHY-with-WHAT discipline is consistent.** Every law, every architectural choice, every memory rule has rationale paired with the rule itself.
3. **Self-aware framing.** Multiple "what is NOT" lists. The "rubber-stamp danger" warning in feedback-loop.md is unusually honest.
4. **The author has lived in this system.** "116 sessions, 125 active memory files, 76 feedback files" — concrete usage numbers cited in `docs/memory.md`. Architecture decisions are post-hoc justifications of what survived contact with reality, not theory.

## Items to feed forward to Phase 4 (Creator View) §2

- Four operating laws → direct comparison to JASON-OS behavioral guardrails
- Memory firings log + decay analysis + bootstrap gate → JASON-OS doesn't have this
- Two-tier vault separation (user vs `_system/`) → JASON-OS scatters tracking files
- `/audit` skill as recurring system check → JASON-OS has /skill-audit per-skill but no aggregate
- Rule-why-apply feedback format → already converged with JASON-OS auto-memory format
- "CLAUDE.md as instruction set, not docs" philosophy → JASON-OS CLAUDE.md is part-doc-part-instruction; worth contrasting
- The `setup` wizard as a runnable interview rather than a static install doc → JASON-OS bootstrap doesn't yet have this

## Items deferred to Coverage Audit

- `docs/notion-vs-obsidian.md` and `docs/notion-vs-obsidian-deep.md` (editorial; lower-priority for this analysis)
- `docs/obsidian-setup.md` Layers 4-5 (MCP wiring detail, Python hook layer) — read first 120 lines; remainder skimmed for content-eval purposes
- `vault-template/` sample-vault contents — template prose, low signal-to-noise for our purposes
- `LICENSE` (MIT, standard) and `CREDITS.md` (attribution detail not load-bearing)
