# Learnings — Piece 1a JASON-OS Discovery Scan

**Purpose:** Real-time capture of methodology learnings as this scan runs, so
piece-1b (SoNash scan) launches with corrections already baked in.

**How this gets populated:**
1. Each agent is instructed to include a `## Learnings for Methodology` section
   in its findings file, noting anything that should inform future scans of
   larger codebases.
2. Claude (orchestrator) appends to this doc at each phase boundary —
   agent-sizing held-up or not, re-spawns that fired, time-vs-estimate,
   classification-heuristic gaps, unexpected file types.
3. User corrections during the scan are logged here, not just applied silently.
4. Before piece-1b launches, this doc is synthesized into explicit
   methodology adjustments for the SoNash run.

**Authoritative voice:** observations are evidence-based, not speculation.
"Agent D3 timed out at 4.5 min scanning 9 hooks" — concrete. NOT "hooks
might be difficult." If we don't know, we don't guess; we note the gap and
let the SoNash run validate.

---

## Agent sizing (did ≤20 units per agent hold up?)

**Wave 1A (2026-04-18):** D1a (15 files), D1b (11), D2 (9), D3 (13) all completed
cleanly, no stalls. ≤15 file scope proven safe. Byte-weighted load is uneven —
skills range 3.5KB to 72KB (20x spread). Flat file-count splits will give
unbalanced agents in SoNash if byte spread is similar or wider. **Recommend
byte-weighted splits for SoNash** rather than pure file count.

---

## File-type surprises (things requiring special handling)

_To be filled._

---

## Dependency extraction (techniques that worked / didn't)

_To be filled._

---

## Classification heuristics (5-scope enum vs reality)

_To be filled._

---

## Schema fields surfaced (new candidates beyond 5-scope)

**Wave 1A (pre-D13 — these are agent-side observations):**

From D2 (agents/teams):
- `tools:` (agent's allowed tools — already frontmatter)
- `disallowedTools:` (2 of 8 agents lack this — worth normalizing)
- `color:` (cosmetic, only 2 of 8 have it)
- Team files use HTML-comment metadata, not YAML — **parser must handle both**

From D3 (hooks):
- `event:` (SessionStart / PreToolUse / PostToolUse / PreCompact) — load-bearing
- `matcher:` (regex for tool/event matching)
- `if_condition:` (bash-style conditions)
- `continue_on_error:` (critical for safety gates — 2 hooks are `false`, rest `true`)
- `exit_code_action:` (block / warn / allow)
- `kill_switch_env:` (SKIP_GATES=1 pattern)
- `async_spawn:` (does the hook fire-and-forget subprocesses?)
- `state_files_written[]:` (which state files the hook maintains)

From D1a/D1b (skills):
- `version:` (already in frontmatter for most)
- `port_lineage:` (pr-review documents what was dropped from SoNash — unique, worth adopting)
- Byte-size distribution is useful classification signal (small = simple, large = multi-module)
- `has_reference_md:` (yes/no — deep-plan and others have REFERENCE.md)
- `has_subdirectories:` (like deep-research/domains/, pr-review/reference/)

---

## Re-spawn events

_Which agents hit context limits, why, and how the re-split went._

---

## Output format issues

_JSONL structure adjustments made mid-stream._

---

## Time: estimated vs actual

**Wave 1A:** Estimated 5 min/agent. Actual: D1a 3.4 min, D1b 3.2 min, D2 3.0 min,
D3 3.4 min. Under estimate — agent work was focused, no re-spawns needed.

---

## User correction points

_Where manual intervention was needed during the scan. Each correction
indicates an automation or heuristic gap that should be addressed for
SoNash's 5x-larger scope._

---

## Methodology adjustments for piece-1b (SoNash)

_Explicit changes to apply before launching the SoNash run. Synthesized
from the sections above at end of piece-1a._

---

## Session log (chronological)

- **2026-04-18 Wave 1A start** — dispatched D1a, D1b, D2, D3
- **2026-04-18 Wave 1A complete** — all 4 succeeded; findings in `findings/`
  - D1a: 7 skills (A-P) — largest is deep-research (72KB)
  - D1b: 6 skills (P-T) — skill-audit at 599 lines violates its own 300-line limit
  - D2: 8 agents + 1 team + 0 commands — all `universal/portable`
  - D3: 8 hooks + 5 lib helpers + settings wiring — 1 hook (`settings-guardian`) is `sanitize-then-portable` due to hardcoded CRITICAL_HOOKS list
- **2026-04-18 Wave 1B start** — dispatching D4a + D4b-1/2/3 (memories)
- **2026-04-18 Wave 1B complete** — 4 agents succeeded
  - D4a: 12 canonical memories
  - D4b-1/2/3: 62 user-home memories across 3 agents
  - **CRITICAL finding:** only 12 of 62 user-home memories have canonical equivalents. 50-file gap. Canonical-promotion has fallen far behind.
  - **Content bleed:** `user_expertise_profile.md` (type: user, scope: user) contains JASON-OS-specific content that wouldn't be correct in SoNash. `feedback_no_broken_widgets.md` same issue (SoNash dashboard specifics in a user-scope memory).
  - **Schema drift:** 3 generations of frontmatter patterns across memory corpus.
  - **New schema fields surfaced:** `supersedes`, `superseded_by`, `related_memories[]`, `append_only`, `recency_signal`, `originSessionId` (needs normalization), `status`, `t[N]_` tenet taxonomy.
  - **Canonical MEMORY.md is stale** — missing `session-end-learnings.md`.
- **2026-04-18 Wave 1C start** — dispatching D5 (scripts), D6 (tools), D7 (research), D8 (planning)
- **2026-04-18 Wave 1C complete** — 4 agents succeeded
  - D5: 13 scripts, mix of CJS + ESM. `safe-fs.js` is copied verbatim into `.claude/skills/*/scripts/lib/` — SoNash scan will hit many copies; need `is_copy_of` / `propagated_from` schema field. `scripts/log-override.js` referenced but missing (dead code or unported).
  - D6: 13 tool-files. Critical schema insight: **`scope_hint` conflates source scope (universal) with runtime scope (machine)**. `cache.go` is clearest example — source is universal, runtime-installed artifact is machine-bound. Recommend splitting into `source_scope` + `runtime_scope`. Also surfaced: `requires_build`, `binary_present`, `install_target`, `secret_config_required`.
  - D7: 4 research sessions. R-frpg → sync-mechanism dependency confirmed. `jason-os-mvp` is a research+planning hybrid → suggests `session_type: hybrid`. Prior sessions use `sonash-pre-canonical-v0` schema — field mapping needed before consumption.
  - D8: 13 planning units. **`PORT_ANALYSIS.md` is the direct ancestor of the file-registry concept** (53KB, 33+ rows already modeling per-file dependency + portability metadata). `RESUME.md` is a new artifact type — session bookmark with git SHA + what-done + what-next + outstanding user actions. Worth explicit `plan_scope: bookmark` variant.
- **2026-04-18 Wave 1D start** — dispatching D9 (final inventory: CI + root docs + configs)
- **2026-04-18 Wave 1D complete** — D9 succeeded
  - 20 units (3 more than expected — LICENSE was there)
  - CI portability: 6 of 7 portable; sonarcloud.yml needs token/config sanitization
  - sonar-project.properties + settings.json MCP server names need sanitization
  - Qodo confirmed as GitHub App (not YAML workflow) per CLAUDE.md §2
  - .husky/_shared.sh: SKIP_CHECKS/SKIP_REASON enforcement, portable
  - .husky/pre-commit + pre-push headers list 14+ planned future checks — live roadmap embedded in file
  - SESSION_CONTEXT.md is ephemeral (not-portable) but its schema is extractable as a template
- **2026-04-18 Wave 1 COMPLETE** — 13 inventory agents done. ~187 units catalogued across all categories.
- **2026-04-18 Wave 2 start** — dispatching D11 (dependency mapper), D12 (workflow/composition identifier), D13 (schema-field surveyor)
- **2026-04-18 Wave 2 complete** — 3 agents succeeded
  - D11: 204 dependency edges. Hubs: safe-fs.js (14 in), sanitize-error.cjs (10), convergence-loop skill (9), run-node.sh (7). 3 gaps (missing referenced files: log-override.js, init_skill.py, statusline-command.sh reference). Memory cross-refs are PROSE in notes field not structured — SoNash will need separate extraction pass for memory graph.
  - D12: 15 composites (8 workflows + 6 processes + 1 memory-system). `/deep-research` has 25 components (largest). **Surfaced `data_contracts[]` as an overlooked load-bearing field** — SESSION_CONTEXT.md, RESEARCH_OUTPUT.md, handoff.json have implicit schema contracts that need first-class representation.
  - D13: 73 unique candidate fields. MVP schema proposal: 12 fields (name, path, type, scope, portability, status, purpose, dependencies, lineage, supersedes+superseded_by, sanitize_fields, notes). Surfaced `tenet` taxonomy (t[N]_) — potentially 5+ members but only t3 confirmed.
- **2026-04-18 PHASE 1 COMPLETE** — all 16 D-agents done. Proceeding to Phase 2 synthesis.
