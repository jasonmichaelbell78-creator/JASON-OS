# BRAINSTORM: sync-mechanism

**Topic:** Bidirectional sync mechanism between JASON-OS and SoNash repos
**Date:** 2026-04-18
**Status:** CONVERGED — routing to `/deep-research` for Piece 1
**Scope rank:** Priority #1 — sole active scope of JASON-OS until complete

---

## 1. Goal (plain language)

Build a system that keeps a subset of Claude Code tooling (skills, agents, hooks, workflows, memories, etc.) synchronized between two git repos:

- **SoNash** — the real project with domain-specific code
- **JASON-OS** — a sanitized extraction meant to be portable

Changes made in either repo should be able to flow to the other. Some files are shared between both. Some belong only to one. A subset needs sanitization when crossing from SoNash to JASON-OS (strip secrets, repo-specific examples, etc.).

The end goal is bidirectional sync. The hard part is **contextual classification**: deciding which file belongs to which scope, and doing so accurately across hundreds of files of varying types (.md, .js, .sh, configs, etc.) and purposes (skills, hooks, scripts, memories, research, docs).

---

## 2. How this brainstorm unfolded (for future-me's recall)

The brainstorm evolved significantly mid-process:

- **Initial framing** (Phase 0 start): "storage primitive choice" — I narrowed prematurely to sync-bookkeeping details, missing the bigger architecture.
- **User reframe #1:** "the whole system matters — discovery, schema, labeling, registry, sync — not just the last piece."
- **User reframe #2:** Challenged my "JASON-OS as central server" framing. Correctly pointed out that code + manifest must live in BOTH repos to be invokable from either (the home/work locale dance requires git-committable symmetry).
- **User reframe #3:** Surfaced the parallel-Claude-Code-sessions workflow (can't write both repos from one session).

Each reframe improved the architecture. The final picture below reflects all three.

---

## 3. Committed decisions

### 3.1 Architecture: 5-piece library-catalog system

| # | Piece | What it does |
|---|---|---|
| 1 | Discovery scan | Agent-driven census of both repos — what exists, one-liner, dependencies |
| 2 | Schema design | Label categories derived from the census, not designed in theory |
| 3 | Labeling mechanism | How each thing carries its labels (frontmatter, manifest, or hybrid) + how new files get labeled |
| 4a | Manifest (rules) | What's shared, scopes, sanitization transforms — mirrored in both repos |
| 4b | Event logs (history) | Per-repo local — what happened where |
| 5 | Sync engine | The `/sync` skill + supporting code — invokable from either repo |

### 3.2 Approach A — scan first, schema from evidence

Never design the schema in the abstract. Scan first, build the census, THEN design labels to fit what's actually there.

**Rationale:** User explicitly flagged contextual classification as the hard part. Starting from a theoretical schema risks forcing real diversity into neat-but-wrong categories.

### 3.3 Symmetric, self-propagating architecture

**This corrects my original "JASON-OS only" framing.** Final design:

| Tier | What | Where it lives | Why |
|---|---|---|---|
| Code | Skill, hooks, engine scripts, schema definition | **Both repos** (mirrored, self-synced) | `/sync` must be invokable from either repo identically |
| Manifest | Rules (what's shared, scopes, sanitization) | **Both repos** (mirrored) | Local hooks need local access to current rules |
| Event logs | History of what happened | **Each repo, local** | No cross-repo writes during daily operation |

**Consequence:** the sync mechanism is meta-recursive (syncs itself). Initial bootstrap copies once; ongoing changes propagate via the sync like any other universal file.

### 3.4 Operating discipline ("overkill")

- **No caps on agent counts.** Parallel dispatch is the default.
- **Specialized agents may be built** if they genuinely beat general-purpose ones.
- **Grep is for one-off lookups, not analysis or verification.**
- **Convergence loops mandatory** on every synthesis pass.
- **Craft over shipping** — this is deliberately a multi-phase project.

### 3.5 Conflict resolution: manual with prompting

- No silent overwrites. The sync engine prompts the user on every conflict.
- User orchestrates; Claude executes the coding.

### 3.6 Session model

- **Current JASON-OS session:** build mechanism, scan both repos, design schema, implement hooks/engine, do JASON-OS-side back-fill, test end-to-end on JASON-OS.
- **Pause for learnings.** Revise SoNash-side plan based on what actually worked.
- **New SoNash Claude Code session:** bootstrap install, SoNash-side back-fill, first full bidirectional sync.
- **JASON-OS is NOT primary** in final architecture — it's just the smaller test bed that validates methodology before scaling to SoNash's larger surface.

### 3.7 Cross-machine (home/work locale) story

- Sync works on any machine where BOTH repos are cloned.
- If only one repo is present, sync skill detects absence and says "sync requires both repos on this machine."
- No magic cloud sync. Git carries artifacts; filesystem does the rest.

### 3.8 Port-over as schema safety net

The final step of the sync — the actual file-crossing — includes extra verification and sanitization. Any schema gap is caught there, not baked into silent bad state. This DE-RISKS schema stabilization: "good enough v1" is acceptable because port-over rescues edge cases.

---

## 4. Risks named and accepted

| # | Risk | Weight | Mitigation |
|---|---|---|---|
| 1 | Schema never stabilizes | Medium (was High) | Port-over as safety net + time-box iterations after ample cycles |
| 2 | Synthesis overload from too many agents | Medium | Dedicated synthesis pass + convergence loops + fill-in agents per memory `no_incomplete_agent_findings` |
| 3 | Forgetting JASON-OS in the scan | Low | Scan explicitly covers both repos; JASON-OS first as test case |
| 4 | Labeling fatigue | Low-Medium | User has committed to the cost knowingly; craft over shipping |
| 5 | Specialized-agent-build overhead | Low | Build only when genuinely beneficial vs. gold-plating |

All risks named above are acknowledged and accepted. None are dealbreakers.

---

## 5. Proposed phase sequence (with sub-pieces)

### Session 1: JASON-OS (current)

| # | Piece | Phase type | Output |
|---|---|---|---|
| 1 | Discovery scan (both repos) | `/deep-research` | Census of both repos — the inventory |
| 2 | Schema design | `/deep-plan` | Labels/categories fitted to the census |
| 3 | Labeling mechanism design | `/deep-plan` | Format spec per file type + hook behavior |
| **3.5** | **Mass back-fill of labels (JASON-OS files)** | **Execute** | **All JASON-OS files labeled — PROVISIONAL, may be obviated if research surfaces a better approach (e.g., external manifest without per-file frontmatter)** |
| 4 | Registry (manifest + event logs) | `/deep-plan` + Execute | Working registry |
| 5 | Sync engine | `/deep-plan` + Execute | Working `/sync` skill, tested on JASON-OS |

### Learnings pause

Review JASON-OS session outcomes. What held up? What needed revision? Revise SoNash-side plan accordingly.

### Session 2: SoNash (new Claude Code instance)

| # | Piece | Phase type | Output |
|---|---|---|---|
| 5.5 | Bootstrap install | Execute (explicit user approval) | Copy skill + hooks + manifest + research artifacts into SoNash |
| 5.75 | Mass back-fill (SoNash files) | Execute | All SoNash files labeled |
| 5.9 | First full bidirectional sync | Execute | System working end-to-end |

---

## 6. Open questions for downstream pieces

These are questions the brainstorm does NOT try to answer — they're load-bearing for specific downstream phases and should be addressed there.

### For `/deep-research` Piece 1 (next)

- What exists in JASON-OS that needs classification?
- What exists in SoNash that needs classification?
- What categories of things are there (files, hooks, workflows, memories, configs, docs, etc.)?
- What dependencies exist between things?
- What file types exist and how are they best handled?
- Are there any surprises the R-frpg research didn't anticipate?

### For `/deep-plan` Piece 2 (schema)

- Does R-frpg's 5-scope enum (universal / user / project / machine / ephemeral) actually fit what the census found?
- What additional tags are needed? (Examples: "contains secrets," "workflow-related," "security-related," "references MCP server X")
- How are relationships between items captured? (X depends on Y, X is a variant of Y)

### For `/deep-plan` Piece 3 (labeling)

- In-file frontmatter vs. external manifest vs. hybrid?
- **Provisional mass-write step (3.5) — is it actually needed given the chosen approach?**
- What per-file-type format rules? (.md → YAML, .js → JSDoc, .sh → comment block, etc.)
- New-file workflow: hook fires on write → prompts immediately? Or periodic audit?

### For `/deep-plan` Piece 4 (registry)

- Storage primitive: JSONL only, TOML only, hybrid? (Deferred from the Phase 0 Q&A — will be clearer after schema exists.)
- Does the manifest need a derived read-cache (SQLite or similar)?

### For `/deep-plan` Piece 5 (sync engine)

- Sync trigger: manual invocation only, scheduled, on-commit, or multiple?
- Conflict resolution UI: exact user-prompt flow
- Sanitization transforms: regex-based? template-based? What happens when a file has multiple transforms?
- How does the skip-label pattern (Copybara-style, `Source-RevId:` in commit messages) integrate?
- Error handling and recovery when sync fails mid-run

### Cross-cutting

- How does each repo handle the OTHER being in a dirty/mid-commit state during a sync?
- Telemetry / logging — where do sync operation logs go?

---

## 7. Prior art referenced (seed inputs)

| Source | What it gave us |
|---|---|
| `.research/file-registry-portability-graph/` (R-frpg) | 5-scope enum, Option D JSONL-hook recommendation, T1/T2 implementation seeds, auto-detection heuristics |
| `sonash-v0/.research/EXTRACTIONS.md` + `analysis/` | Registry + CLI-Hub Distribution pattern (HKUDS), init()-based plugin registry (Composio), Backend+Pipeline separation pattern |
| `sonash-v0/.research/jason-os/BRAINSTORM.md` | Template→Platform direction; bidirectional explicitly flagged as Platform-stage requirement |
| External-tools research (`.research/sync-mechanism/FINDINGS-external-tools.md` if written) | 17 tools evaluated. Copybara + Dagster skip-label pattern is the closest analog; custom script is the only HIGH-fit alternative |
| Storage-primitives research (`.research/sync-mechanism/FINDINGS-storage-primitives.md` if written) | Two-layer design (TOML manifest + JSONL events) converged on by independent real-world projects (Paperclip RFC, Julia's Project.toml + Manifest.toml) |

---

## 8. Memory links

Durable rules and context this brainstorm depends on:

- `project_sync_mechanism_principles` — the core design principles (scan-first, overkill agents, port-over safety net, symmetric architecture)
- `user_creation_mindset` — craft over shipping
- `user_expertise_profile` — no-code orchestrator; complexity can outrun understanding
- `feedback_explain_before_decide` — plain-language explanation before technical decisions
- `feedback_no_research_caps` — no agent limits
- `feedback_grep_vs_understanding` — analysis requires understanding, not grep
- `feedback_no_incomplete_agent_findings` — dispatch fill-in agents
- `feedback_convergence_loops_mandatory` — every pass converges
- `feedback_workflow_chain` — brainstorm → deep-research → deep-plan → execute
- `project_cross_locale_config` — home/work locale dance requires commitable repos
- `project_scoped_over_global` — no cross-repo writes without explicit approval

---

## 9. Next action

**Route to `/deep-research`** for Piece 1 (discovery scan) with pre-loaded context:

- **Topic:** "What exists across JASON-OS and SoNash that needs classification for bidirectional sync?"
- **Scope:** both repos
- **Order:** JASON-OS first (smaller, methodology validation), then SoNash (larger, full coverage)
- **Constraints:** overkill agents, specialized-agent-build authorized, no grep for analysis, convergence loops mandatory
- **Output:** `.research/sync-mechanism/piece-1-discovery-scan/RESEARCH_OUTPUT.md` (the census)

Downstream: each subsequent piece (2, 3, 4, 5) gets its own `/deep-plan` when we reach it.

---

## 9.5 Deferred deliverable (noted 2026-04-18, post-brainstorm)

**Dependency graph on both repos' back-side.** After Piece 1 produces the
inventory + cross-category dependency data, materialize a graph artifact
(per-repo) that shows "X depends on Y" relationships. Probably lives at
`.research/sync-mechanism/dependency-graph.{json,mermaid}` in each repo.
Makes downstream workflow analysis, impact analysis, and schema design
substantially easier. Not a blocking deliverable — track and produce
when the underlying data exists.

## 10. Retro (process feedback)

**What the brainstorm did well:** user-directed reframing worked — three corrections improved the architecture substantively. The contrarian checkpoint caught the schema-stabilization risk before locking in. The Q&A format (after user flagged jargon overload) produced clearer decisions.

**What to do differently next time:** don't narrow to storage-primitive specifics before the user has confirmed the scope frame. I jumped to "how do we write things down" before establishing "what are we writing down and why." Plain-language framing from the start would have caught this.
