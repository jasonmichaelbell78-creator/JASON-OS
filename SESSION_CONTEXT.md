# Session Context — JASON-OS

## Current Session Counter
5

## Uncommitted Work
No

## Last Updated
2026-04-18

## Quick Status
Session 5 active on branch `sync-mechanism-41826`. Goal: sync-mechanism
project — **Priority #1, sole active scope of JASON-OS until complete**
(commitment captured in `project_sync_mechanism_principles` memory).

**What landed in Session 5:**

- **Statusline port from SoNash** (`99f5b9f`) — 16-widget Go binary at
  `tools/statusline/`, installed as `jason-statusline-v2.exe`. Cache
  isolated to `cache-jason-os/`. Shim pattern (`.claude/statusline-command.sh`
  exec's binary). 15/15 tests pass. Critical learning captured:
  `feedback_statusline_rebuild_safety` — never overwrite running exe; bump
  versioned filename + `git add` the shim to trigger Claude Code watcher.

- **`/brainstorm sync-mechanism` complete** — `.research/sync-mechanism/BRAINSTORM.md`
  crystallized. 5-piece architecture: Discovery scan → Schema design →
  Labeling mechanism → Registry (manifest + event logs) → Sync engine.
  Symmetric self-propagating design (code + manifest mirrored in both
  repos; event logs per-repo local). Approach A (scan first, schema from
  evidence). Overkill-agents discipline. Manual conflict resolution with
  prompting. Port-over step acts as schema safety net. JASON-OS is
  test-case-first for the scan (smaller, faster), NOT primary in final
  architecture — peers.

- **`/deep-research piece-1a-discovery-scan-jason-os` complete (partial
  Phase 2.5/3)** — `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/`.
  - 16 D-agents dispatched across 4 waves: 10 inventory + 3 analysis + 3
    auxiliary splits for stall-avoidance
  - ~190 units catalogued (skills, agents, hooks, memories, scripts, tools,
    research, planning, CI, docs, configs)
  - 204 dependency edges (D11); top hubs: `scripts/lib/safe-fs.js` (14 in),
    `sanitize-error.cjs` (10), `convergence-loop` skill (9), `run-node.sh` (7)
  - 15-16 composite entities (D12); `/deep-research` is largest (25 components)
  - 73 schema-field candidates consolidated (D13); MVP proposal: 12 fields
  - Critical findings: 50-file canonical-memory gap, `user_expertise_profile`
    content bleed, `source_scope` vs `runtime_scope` split needed (cache.go
    example), `data_contracts[]` overlooked, 3 referenced-but-missing files
  - OTB produced 7 alternative framings; 2 HIGH-priority for Piece 2:
    chezmoi template-in-file for sanitize_fields, census JSONL as schema
    inheritance for manifest
  - Phase 2.5 (verification) + Phase 3 (contrarian) **partial** — verifier
    and challenger agent types lack Write tool + returned truncated
    responses; findings partially captured by orchestrator in
    `challenges/verification-notes.md`. T23 filed for skill fix.
  - Minor corrections identified (~4 of 90 claims, <5%) — under 20%
    re-synthesis threshold; captured in verification-notes.md rather than
    full re-synthesis.

**Backlog:** 16 → 23 active (+T22 deep-research allocation formula,
+T23 verifier/challenger persistence, +7 inflight items from session 4).

**Memory delta this session (outside git):**
- Added `feedback_explain_before_decide` (plain-language Q&A rule)
- Added `project_sync_mechanism_principles` (load-bearing design principles)
- Added `feedback_statusline_rebuild_safety` (statusline deploy gotcha)

## Next Session Goals

**DECIDED:** User chose **Option B — SoNash scan first** (2026-04-18, end
of Session 5). Resume plan for new session:

### Step 1 — `/session-begin`
Session counter 5 → 6. Branch should still be `sync-mechanism-41826`
unless user changed it. Working tree should be clean (Session 5 commits
24a9509 + 99f5b9f).

### Step 2 — `/deep-research piece-1b-discovery-scan-sonash`

**Topic:** What exists in SoNash that needs classification for bidirectional
sync with JASON-OS? (Piece 1b, companion to completed Piece 1a.)

**Scope:** SoNash repo only, at `C:\Users\jason\Workspace\dev-projects\sonash-v0\`.
Output dir: `.research/sync-mechanism/piece-1b-discovery-scan-sonash/` in
JASON-OS (since JASON-OS is the research-artifact home — SoNash is
READ-ONLY for this scan).

**Pre-dispatch reading (MANDATORY):** Before planning Phase 0.6 agent
allocation, READ these in order:

1. `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/RESEARCH_OUTPUT.md`
   **Section 7 "Learnings for SoNash (Piece 1b Preparation)"** — the
   primary methodology input. Consolidated per-agent "adjustments
   recommended for SoNash scan" from all 13 Wave 1 agents.
2. `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/LEARNINGS.md`
   — wave-by-wave observations.
3. `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/findings/D13-schema-candidates.md`
   — 73 candidate fields + MVP 12-field proposal. Agent JSONL schema for
   piece-1b should match D13's MVP for clean future merge.

**Concrete constraints from Piece 1a experience:**

- **Agent sizing:** ≤15 files per agent proved safe (no stalls). SoNash
  has categories well over this — SPLIT them. D13 recommended for SoNash:
  - 81 skills → 5 agents of ~16 each (byte-weighted split, not just count
    — Piece 1a found 20× byte-size spread)
  - 98 script top-level entries (3835 total files — many generated) →
    4 agents by DOMAIN (cas/, extraction/, session/, other), NOT by
    alphabetical split
  - 40 agents → 2 agents of ~20
  - 25 hooks → 2 agents (also need Stop/SubagentStop events coverage
    which JASON-OS didn't have)
  - 83 user-home memories → 4 agents of ~21
  - 20 research sessions (6858 files) → 3 agents at SUMMARY level
    (use SoNash's `research-index.jsonl` as shortcut — don't enumerate
    every finding file)
  - 21 planning dirs (394 files) → 2 agents
- **Total expected D-agents:** ~25-30 (vs Piece 1a's 16).
- **Duration:** 2-3 hr active wall-clock.
- **Overkill discipline:** still applies. No caps, re-spawn authorized,
  no grep for analysis.

**Three issues Piece 1b MUST address beyond Piece 1a:**

1. **Memory cross-refs as structured data, not prose.** Piece 1a found
   memory cross-references live in the `notes` field as prose. For SoNash's
   83 memories, a separate extraction pass on notes text is required, OR
   agents should be explicitly asked to parse `Memory links:` sections
   (a convention found in `project_sync_mechanism_principles.md`) into
   a structured `related_memories[]` field.
2. **Stop/SubagentStop hook events.** JASON-OS doesn't have these; SoNash
   does. Hook agents must capture them.
3. **Redundancy detection.** Piece 1a found overlapping-content memory
   clusters (e.g., ack_requires_approval + interactive_gates + never_bulk_accept).
   For SoNash's 83 memories, a dedicated redundancy-detection agent is
   recommended post-Wave-1 (before synthesis).

**Verifier + challenger fix (T23-related):** Piece 1a's Phase 2.5/3 lost
most verifier/challenger findings due to no-Write-tool + truncation.
Options for Piece 1b:
- (a) Apply T23 fix (modify skill to wrap verifier/challenger spawns with
  orchestrator-write step) — best long-term
- (b) Ad-hoc: orchestrator captures each verifier/challenger full return
  text and writes it to findings/challenges/ manually
- (c) Spawn verifiers as `deep-research-searcher` (which HAS Write) with
  explicit "act as verifier" instructions — hack but works

### Step 3 — After Piece 1b completes

- Merge Piece 1a + Piece 1b censuses (a cross-repo summary doc)
- Proceed to `/deep-plan piece-2-schema-design`
- Schema inherits from D13 MVP + OTB's 2 HIGH-priority insights (chezmoi
  template markers for sanitize, census JSONL as schema baseline)

### Also in scope (unchanged from Session 5)

- **D19-skipped layers still GATED** (fresh D34 required):
  T18/T19/T20/T21
- **Outstanding user-action:** m1 — batch-mark 5 SonarCloud `S4036`
  PATH hotspots in `scripts/session-end-commit.js` Reviewed-Safe.

**Also in scope (from session 4, not sync-mechanism):**

- **D19-skipped layers still GATED** (fresh D34 required):
  - T18 (Layer 2 — 5 hooks), T19 (Layer 3 — 4 nav docs), T20
    (systematic-debugging), T21 (validate-claude-folder)
- **Outstanding user-action:** m1 — batch-mark 5 SonarCloud `S4036`
  PATH hotspots in `scripts/session-end-commit.js` Reviewed-Safe.

## Key artifact paths (for resume)

- BRAINSTORM: `.research/sync-mechanism/BRAINSTORM.md`
- Piece 1a output: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/RESEARCH_OUTPUT.md`
- LEARNINGS log: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/LEARNINGS.md`
- Schema candidates: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/findings/D13-schema-candidates.md`
- OTB alternatives: `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/challenges/otb.md`
- Active todos: `.planning/todos.jsonl` (23 entries, 18 pending)
