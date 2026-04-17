# Findings: Auto-Memory System — SoNash vs JASON-OS

**Searcher:** deep-research-searcher
**Profile:** codebase
**Date:** 2026-04-15
**Sub-Question IDs:** D2d

---

## Key Findings

### 1. Storage Location Convention — Exact Path Verified [CONFIDENCE: HIGH]

Auto memory lives at `~/.claude/projects/<project-slug>/memory/MEMORY.md`. The
project slug is derived from the git repo root path, with path separators
replaced by dashes:

- SoNash: `~/.claude/projects/C--Users-jbell--local-bin-sonash-v0/memory/`
- JASON-OS: `~/.claude/projects/C--Users-jbell--local-bin-JASON-OS/memory/`

This is confirmed by filesystem inspection [1] and official Anthropic docs [2].
All worktrees and subdirectories within the same git repo share one memory
directory — the slug is repo-level, not worktree-level. It is machine-local;
files are never synced across machines by default.

Note: SoNash also maintains a `canonical-memory/` directory inside the project's
`.claude/` folder (git-tracked, 24 files). This is an experimental cross-locale
sync mechanism where "golden" memory files are version-controlled. The divergence
between canonical and live was measured at 23 files — not ~7 as originally
estimated [3].

---

### 2. MEMORY.md Index Structure [CONFIDENCE: HIGH]

Both SoNash and JASON-OS use identical index structure: topic sections with
bullet entries, each entry a markdown link plus one-line summary hook.

**Template per entry:**
```
- [Entry title](filename.md) — one-line description of what this covers
```

**Section headers** in both projects: `## User`, `## Feedback`, `## Project`,
`## Reference`. SoNash additionally uses `## Decisions` and `## Historical
(completed, reference only)` subsections.

Observed line counts:
- SoNash MEMORY.md: 96 lines (within 200-line limit)
- JASON-OS MEMORY.md: 44 lines (well within limit)

Both projects maintain 1:1 correspondence between index entries and files on
disk: SoNash has 77 entries / 77 topic files; JASON-OS has 31 entries / 31
topic files [1].

The official docs state the index should be kept concise: "each entry should be
one line under ~150 characters" [4]. The Dream consolidation prompt instructs:
"Never write memory content directly into it." [5]

---

### 3. Memory Types — User-Defined Taxonomy, Not Official [CONFIDENCE: HIGH]

The four-category taxonomy (user / feedback / project / reference) is a
**user-defined convention**, not part of the official Claude Code auto-memory
specification. No mention of these types exists in official docs [2] or the
Claude Code binary [1].

The taxonomy is enforced via YAML frontmatter in each topic file:

```yaml
---
name: <file_stem or descriptive title>
description: <one-line summary, sometimes multiline>
type: user | feedback | project | reference
status: active | completed   # optional
originSessionId: <uuid>      # optional, appears in some SoNash files
---
```

**Type distribution in SoNash live memory (77 files):**
- feedback: 37 files (48%)
- project: 28 files (36%)
- reference: 7 files (9%)
- user: 4 files (5%)
- other (no type field): 1 file

**Type distribution in JASON-OS memory (31 files):**
- feedback: 25 files (81%)
- user: 4 files (13%)
- reference: 1 file (3%)
- project: 1 file (3%)

The JASON-OS distribution is heavily feedback-skewed because it was bootstrapped
from SoNash's cross-session learnings, stripping project-specific content. The
4 user files are identical between projects.

---

### 4. Frontmatter Format [CONFIDENCE: HIGH]

Filesystem evidence across 100+ files establishes the convention:

```yaml
---
name: <identifier or descriptive title>
description: |
  Multiline description allowed — first line is the summary hook.
  Additional context on second line.
type: user | feedback | project | reference
status: active        # present in ~22/77 SoNash files; absent in JASON-OS
originSessionId: <uuid>   # present in ~14/77 SoNash files; ~1/31 JASON-OS
---
```

- `name` and `description` are always present.
- `type` is always present.
- `status` and `originSessionId` are optional tracking fields.
- The body follows plain markdown after the frontmatter block.

**Typical body length:** 5–30 lines of actionable prose. Files use bold headers
(`**Why:**`, `**How to apply:**`) to separate explanation from prescription.

---

### 5. What NOT to Save — Four Classes [CONFIDENCE: MEDIUM]

The "what NOT to save" rules are not formally documented in four explicit classes
in any single authoritative source found. The rules are distributed across three
sources with different authority levels:

**From official Anthropic docs [2] (HIGH authority):**
- One-time edits that only applied to a single task
- Decisions that won't be useful in a future conversation
- Information already documented clearly in the codebase
- Code undergoing active changes (prefer stable facts)

**From the Dream consolidation system prompt [5] (HIGH authority — internal Anthropic prompt):**
- Contradicted facts (delete the wrong one rather than keeping both)
- Verbose index entries (content belongs in topic files, not MEMORY.md)
- Stale/superseded memories (prune rather than accumulate)

**From SoNash multi-layer memory research [3] (MEDIUM authority — empirical):**
- Ephemeral session state: `.claude/state/task-*.state.json`, plans in
  `.claude/plans/`, todos in `~/.claude/todos/` — these use dedicated directories
  and do not belong in memory
- Single-session context: decisions with no cross-session value
- Active work artifacts: `SESSION_CONTEXT.md`, roadmaps, in-progress task state
- Project-specific details with no portability value when building for JASON-OS
  (e.g., TDMS IDs, SonarCloud URLs, GSD phase tracking)

**Implicit from JASON-OS extraction decisions:**
- Skills, agents, hooks are stored in the codebase (`.claude/`), never in memory
- Operational logs and state files (`.claude/state/`) stay gitignored and ephemeral

The closest to "four classes" from the MindStudio analysis [6]:
1. One-time task decisions
2. Ephemeral session state
3. Already-documented codebase facts
4. Code currently in flux

---

### 6. Cross-Session Persistence vs Ephemeral [CONFIDENCE: HIGH]

**Cross-session persistent (memory files):**
- User behavioral patterns (how Jason communicates, delegates, evaluates)
- Corrective feedback that changed Claude's behavior (the "feedback" type)
- Project state summaries (initiative status, what's complete, what's next)
- Reference facts Claude would otherwise re-lookup (AI capabilities, external URLs)
- Hard-won tenets (convergence loops, workflow chain)

**Ephemeral (NOT in memory):**
- `.claude/plans/` — plan documents for active implementation work; global per
  user (`~/.claude/plans/`), not injected into context
- `~/.claude/todos/` — cross-session todos, managed by `/todo` skill
- `.claude/state/*.json` — per-session hook state, build failures, task progress;
  gitignored, machine-local
- `SESSION_CONTEXT.md` — current sprint tracking; read on demand by skills, not
  auto-injected
- `ROADMAP.md`, in-progress research — on-demand reads only

The critical distinction: memory files are auto-injected on every turn (up to
the MEMORY.md 200-line limit); ephemeral files require explicit skill invocation
or hook to surface. This is what makes the system "feel like home" — the user's
patterns, corrections, and project state are always present without any action.

---

### 7. The Always-On Mechanism — System Prompt Injection [CONFIDENCE: HIGH]

**How it works:**

1. At the start of every conversation, Claude Code reads `MEMORY.md` from the
   project's memory directory
2. The **first 200 lines** (or 25KB, whichever comes first) are loaded into
   context alongside CLAUDE.md
3. Topic files (`feedback_*.md`, `project_*.md`, etc.) are NOT loaded at startup
4. Topic files are loaded **on-demand** when Claude reads them using file tools
   during the conversation
5. MEMORY.md is delivered as a user message after the system prompt (confirmed
   by official troubleshooting docs [2])

**Size budget:**
- MEMORY.md: first 200 lines hard limit (confirmed in Claude binary: `var pZ =
  200` [6])
- Always-injected cost in SoNash: ~4,000 tokens (CLAUDE.md ~3,537 +
  MEMORY.md index ~500) [3]
- On-demand cost if all 77 topic files loaded: up to ~15,200 additional tokens
- Total potential: ~19,240 tokens [3]
- JASON-OS starting cost: much lower (CLAUDE.md ~107 lines + 44-line MEMORY.md)

**Why this creates "feels like home":**

The index-per-entry design means every session starts with the full map of what
Claude knows about the user and project. When Jason says "your call," Claude
already knows that means delegation with rationale. When a feedback pattern
fires (e.g., someone asks about convergence loops), the topic file gets loaded
on demand. The pattern corrections stay permanent — no re-teaching required.

**AutoDream:**

`autoDreamEnabled: true` is set in `~/.claude/settings.json` [1]. AutoDream is
Anthropic's native in-session memory consolidation — it operates during sessions
(not as a background daemon) and is confirmed active [3]. It is the write path
for auto-generated memory. The JASON-OS setting.json does not yet configure
`autoDreamEnabled` explicitly (it inherits from global settings). AutoDream
requires Claude Code v2.1.59+; current version is 2.1.109 [1].

---

### 8. SoNash vs JASON-OS Delta — What's Present and Missing [CONFIDENCE: HIGH]

**SoNash (mature — 270+ sessions):**
- 77 topic files + 1 MEMORY.md = 78 total
- 96-line index (well within 200-line limit; room for ~104 more lines)
- Type mix: mostly feedback (48%) + project (36%)
- Additional canonical-memory layer: 24 git-tracked "golden" files in
  `.claude/canonical-memory/` — experimental cross-locale sync, 23-file
  divergence from live
- Historical section in MEMORY.md for completed project entries
- Optional frontmatter fields: `status`, `originSessionId`

**JASON-OS (bootstrap — 1 session):**
- 31 topic files + 1 MEMORY.md = 32 total
- 44-line index
- Type mix: mostly feedback (81%) + user (13%)
- No canonical-memory layer
- No project management memory (no active initiatives tracker, no reference URLs)
- Missing from SoNash: project_active_initiatives, project_hook_contract_canon,
  reference_external_systems, reference_ai_capabilities equivalent
- JASON-OS-only: feedback_agent_hot_reload, feedback_project_scoped_over_global
  (2 new learnings from bootstrap session)

**Smallest delta to replicate the "feels like home" effect:**

The user profile (4 files) is already fully ported — identical content. The 25
feedback files cover the same behavioral rules. The gap is the **project and
reference layers**:

1. `project_active_initiatives.md` — JASON-OS has no master tracker. One project
   file exists but covers only the OS itself, not a live initiative tracker.
2. `reference_ai_capabilities.md` — JASON-OS has no reference file documenting
   current permission rules, hook inventory, skill count, or MCP server state.
3. `reference_external_systems.md` equivalent — no GitHub repo URL, no external
   system quick-reference.
4. The `t3_convergence_loops.md` file exists in JASON-OS but is typed as
   `reference` vs. SoNash's `project` — minor classification inconsistency.

---

## Sources

| # | URL / Path | Title | Type | Trust | CRAAP | Date |
|---|------------|-------|------|-------|-------|------|
| 1 | `~/.claude/projects/*/memory/`, `~/.local/bin/sonash-v0/.claude/canonical-memory/` | Filesystem inspection — both memory directories | codebase | HIGH | 5/5/5/5/5 | 2026-04-15 |
| 2 | https://code.claude.com/docs/en/memory | Official Claude Code Memory Docs | official-docs | HIGH | 5/5/5/5/5 | 2026-04 |
| 3 | `/c/Users/jbell/.local/bin/sonash-v0/.research/multi-layer-memory/RESEARCH_OUTPUT.md` | Multi-Layer Memory Research (41 agents, 128 claims, post-challenge) | codebase | HIGH | 5/5/4/5/5 | 2026-03-31 |
| 4 | Dream consolidation prompt (internal Anthropic) | `agent-prompt-dream-memory-consolidation.md` | official-internal | HIGH | 5/5/5/5/5 | ccVersion 2.1.98 |
| 5 | https://raw.githubusercontent.com/Piebald-AI/claude-code-system-prompts/main/system-prompts/agent-prompt-dream-memory-consolidation.md | Piebald-AI extracted system prompts | community/verified | MEDIUM-HIGH | 4/5/4/4/4 | 2026 |
| 6 | https://www.mindstudio.ai/blog/what-is-claude-code-auto-memory | MindStudio: What is Claude Code Auto-Memory | community | MEDIUM | 3/4/3/3/3 | 2025 |
| 7 | https://giuseppegurgone.com/claude-memory | Claude Code's Experimental Memory System | community | MEDIUM | 3/3/3/3/3 | 2025 |

---

## Contradictions

**Contradiction 1: "Status" of AutoDream activity**

The multi-layer memory research (2026-03-31) notes "AutoDream: enabled in
settings but **no observable activity**" in the health issues section (reporting
state at time of research). However, the Executive Summary of the same document
says "VERIFIED (user-confirmed). AutoDream is actively modifying memory files
during sessions." This is a temporal contradiction resolved by the later
user-confirmation: AutoDream is active but operates in-session, not as a
background daemon (the gap agent looked for off-hours writes, which was a flawed
methodology).

**Contradiction 2: canonical-memory divergence count**

The multi-layer memory research reports 23-file divergence between canonical and
live. Filesystem count shows canonical has 24 files, live has 77. This is not
actually contradictory — the "divergence" means files present in one but not
the other, not that canonical is a complete subset.

**Contradiction 3: Four classes of what NOT to save**

The task description references "four classes of what NOT to save rules" but no
authoritative single document uses this framing. The rules are distributed across
official docs, the Dream prompt, and empirical SoNash research. The "four
classes" framing appears to be an organizing heuristic from the system prompt
context, not a documented taxonomy.

---

## Gaps

1. **Exact "what NOT to save" four-class taxonomy source not found.** No single
   official document uses this framing. The closest synthesis is: (a) one-time
   decisions, (b) ephemeral session state, (c) already-documented codebase facts,
   (d) active-change code. This is reconstructed from multiple sources.

2. **AutoDream write frequency not measured.** The T0 action from the research
   (memory telemetry hook) was recommended but not yet built. We know AutoDream
   writes occur in-session but not how often or under what conditions.

3. **JASON-OS has no autoMemoryDirectory configuration.** The `~/.claude/settings.json`
   does not set `autoMemoryDirectory`. This means JASON-OS memory is stored in the
   default location and cannot be cross-locale synced without additional
   configuration. (SoNash also lacks this configuration — the research flagged it
   as untested.)

4. **Frontmatter is a convention, not enforced.** No hook, linter, or CI check
   validates that new memory files include the required frontmatter fields. This
   means the convention can silently drift.

5. **The InstructionsLoaded hook** (mentioned in official docs for debugging
   which memory files load) is not configured in either project.

---

## Serendipity

**Security finding:** The Cisco Blogs research (not deeply investigated here)
found a persistent memory compromise vector — MEMORY.md is treated as high-trust
content by the model. As of Claude Code v2.1.50, a mitigation removed user
memories from the direct system prompt. This is relevant to JASON-OS's "security
rules TBD" section — auto-memory is a write path that could be exploited if
a repo Claude is working on contains prompt injection targeting the memory files.
This is a future security consideration for the JASON-OS CLAUDE.md security
section.

**Observation — JASON-OS type distribution anomaly:** JASON-OS has 25 feedback
files but only 1 project file and 1 reference file. This means JASON-OS "feels
like home" for behavioral rules (user patterns, corrections) but has almost no
project awareness or reference knowledge baked in. A new JASON-OS session knows
HOW to work with Jason but not WHAT Jason is working on. This is the core delta
from SoNash's richer project layer.

---

## Confidence Assessment

- HIGH claims: 6
- MEDIUM claims: 1
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

The filesystem is ground truth. Official docs confirm the mechanism. The
multi-layer memory research provides verified empirical data. The only MEDIUM
claim is the "four classes of what NOT to save" which is a reconstruction from
multiple sources, not a single authoritative list.
