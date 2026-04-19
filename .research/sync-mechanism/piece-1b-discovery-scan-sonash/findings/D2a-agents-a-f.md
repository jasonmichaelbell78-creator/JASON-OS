# D2a Agent Inventory: SoNash Agents A–F

**Agent:** D2a
**Scan Date:** 2026-04-18
**Source Repo:** sonash-v0 `.claude/agents/` (alphabetical first half: A–F)
**Agents Inventoried:** 20 of 20 (NO FILE OUT OF SCOPE)
**JSONL Output:** `D2a-agents-a-f.jsonl`

---

## Agent Taxonomy

### Pipeline Agents (deep-research family — 7 agents)

These agents form a sequential pipeline spawned by the `/deep-research` skill. Each operates during a specific numbered phase and has clearly defined input/output contracts.

| Agent | Phase | Role |
|-------|-------|------|
| `deep-research-searcher` | Phase 1 | Parallel web/docs/codebase/academic research; writes FINDINGS.md |
| `deep-research-synthesizer` | Phase 2 | Combines FINDINGS.md into RESEARCH_OUTPUT.md + claims/sources/metadata JSON |
| `deep-research-verifier` | Phase 2.5, 3.9 | Dual-path claim verification (filesystem vs web); 4-verdict taxonomy |
| `contrarian-challenger` | Phase 3 | Steel-man + pre-mortem adversarial challenges |
| `dispute-resolver` | Phase 3.5 | DRAGged conflict resolution with mandatory dissent records |
| `deep-research-gap-pursuer` | Phase 3.95 | Profile-switched gap pursuit with diminishing-returns signal |
| `deep-research-final-synthesizer` | Phase 3.97 | Mode-aware final synthesis (post-verification / post-gap-pursuit / full-resynthesis) |

These 7 agents are **all in JASON-OS already** (confirmed via Piece 1a D2 output). The SoNash versions are their source originals — the key delta is that SoNash versions have `skills: [sonash-context]` in frontmatter, which JASON-OS ports lack.

### Domain Specialists (8 agents)

General-purpose agents tied to SoNash's specific tech stack and architecture:

| Agent | Domain | Portability |
|-------|--------|-------------|
| `backend-architect` | REST/microservices/Firestore | sanitize-then-portable |
| `code-reviewer` | SoNash code quality + security | sanitize-then-portable |
| `database-architect` | DB design/modeling/polyglot | sanitize-then-portable |
| `debugger` | SoNash app + tooling debugging | sanitize-then-portable |
| `dependency-manager` | npm/pip/maven dependency mgmt | sanitize-then-portable |
| `documentation-expert` | System/API/architecture docs | sanitize-then-portable |
| `frontend-developer` | React/Next.js/Firebase frontend | sanitize-then-portable |
| `fullstack-developer` | End-to-end full-stack + CI/CD | sanitize-then-portable |

### Cross-Cutting Specialists (2 agents)

| Agent | Domain | Portability |
|-------|--------|-------------|
| `document-analyst` | Document analysis skill companion | sanitize-then-portable |
| `explore` | Codebase read-only exploration | sanitize-then-portable |

### Deprecated/Redirect Stubs (3 agents)

Three agents were consolidated on **2026-04-01** with redirect stubs left in place until **2026-06-01**:

| Agent | Redirect Target | Reason |
|-------|----------------|--------|
| `deployment-engineer` | `fullstack-developer` | Consolidated into fullstack scope |
| `devops-troubleshooter` | `debugger` | Consolidated into elevated debugger |
| `error-detective` | `debugger` | Consolidated into elevated debugger |

These stubs have minimal frontmatter (name + description only) and body text pointing to the redirect target. They should NOT be ported to JASON-OS. The `debugger` agent absorbed two separate roles — this is a deliberate consolidation pattern worth noting.

---

## Model Distribution

| Model | Agents | Names |
|-------|--------|-------|
| `sonnet` | 14 | backend-architect, code-reviewer, contrarian-challenger, debugger (inherit→sonnet), deep-research-final-synthesizer, deep-research-gap-pursuer, deep-research-searcher, deep-research-synthesizer, deep-research-verifier, dependency-manager, dispute-resolver, document-analyst, documentation-expert, explore, frontend-developer |
| `opus` | 2 | database-architect, fullstack-developer |
| `inherit` | 1 | debugger |
| `null` (stub) | 3 | deployment-engineer, devops-troubleshooter, error-detective |

**Sonnet dominance:** 14 of 17 active agents use sonnet. This is consistent with the Piece 1a findings (sonnet is the standard; opus reserved for heavyweight architectural work).

**Opus pattern:** Both opus agents (`database-architect`, `fullstack-developer`) are high-token-output agents producing large code artefacts and architecture diagrams. The model choice reflects expected output volume/complexity, not task criticality.

**`model: inherit`** — `debugger` uses `inherit` — this is the only agent in this batch with this model value. It inherits the model of its spawner. This is a notable pattern: when an agent is used as a general-purpose debugging assistant called from many contexts, `inherit` avoids forcing model downgrade or upgrade relative to the caller.

---

## Tools-Allowed Patterns and Disallowed-Tools Enforcement

### Tool Set Clusters

**Cluster 1: Read-only explorers** (no Write/Edit)
- `dispute-resolver`: Read, Grep, Glob — most constrained; no web search
- `dependency-manager`: Read, Bash, Grep — no write
- `explore`: Read, Bash, Grep, Glob — disallowedTools explicitly includes Write, Edit, Agent

**Cluster 2: Research/analysis agents** (Read + web + write findings)
- `contrarian-challenger`: Read, Write, Grep, Glob, WebSearch
- `deep-research-verifier`: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch
- `deep-research-gap-pursuer`: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch
- `document-analyst`: Read, Write, Bash, Grep, Glob

**Cluster 3: Pipeline producers** (Read + Write + Bash only)
- `deep-research-synthesizer`: Read, Write, Bash (no Grep/Glob — relies on synthesizing, not searching)
- `deep-research-final-synthesizer`: Read, Write, Bash, Grep, Glob

**Cluster 4: MCP-extended** (includes Context7 tools)
- `deep-research-searcher`: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs

**Cluster 5: Full implementation agents** (Read + Write + Edit + Bash)
- `backend-architect`, `database-architect`, `frontend-developer`, `fullstack-developer`: all have Write + Edit + Bash — can modify the codebase

**Cluster 6: Review + implementation combo**
- `code-reviewer`, `debugger`: Read, Write, Edit, Bash, Grep, Glob — full filesystem access

### DisallowedTools Patterns

| Pattern | Agents |
|---------|--------|
| `disallowedTools: Agent` | code-reviewer, contrarian-challenger, deep-research-final-synthesizer, deep-research-gap-pursuer, deep-research-verifier, dispute-resolver, document-analyst |
| `disallowedTools: [Agent, Write, Edit]` | explore |
| No disallowedTools field | backend-architect, database-architect, debugger (has disallowedTools: Agent), dependency-manager, documentation-expert, frontend-developer, fullstack-developer, deep-research-searcher, deep-research-synthesizer |

**Key observation:** All deep-research pipeline agents explicitly set `disallowedTools: Agent` to prevent recursive sub-agent spawning. This is a deliberate architectural constraint preventing pipeline loops.

**`explore` exception:** `explore` goes further — it bars `Write` and `Edit` via disallowedTools, making the read-only constraint mechanically enforced rather than just instructional. This is the safest agent pattern for investigation tasks.

---

## Agent-to-Skill Integration Points

| Agent | Spawning Skill | Spawn Context |
|-------|---------------|---------------|
| `deep-research-searcher` | `/deep-research` | Phase 1: parallel research |
| `deep-research-synthesizer` | `/deep-research` | Phase 2: after all searchers complete |
| `deep-research-verifier` | `/deep-research` | Phase 2.5 + Phase 3.9 |
| `contrarian-challenger` | `/deep-research` | Phase 3 |
| `dispute-resolver` | `/deep-research` | Phase 3.5 |
| `deep-research-gap-pursuer` | `/deep-research` | Phase 3.95 |
| `deep-research-final-synthesizer` | `/deep-research` | Phase 3.97 |
| `document-analyst` | `/document-analysis` | Standard/Deep mode dispatch |
| `explore` | CLAUDE.md §7 (PRE-TASK) | Exploring unfamiliar code |

Domain specialists (`backend-architect`, `code-reviewer`, etc.) are not spawned by named skills — they are invoked directly via the Agent tool or manually by the orchestrator/user. The `code-reviewer` body references `npm run patterns:check` and `npm run lint` as automated gates, making it a pre-commit workflow companion.

**`deep-research-synthesizer` implicit skill dependency:** The synthesizer reads a REFERENCE.md template from `.claude/skills/deep-research/REFERENCE.md` Section 5. This is an undeclared but load-bearing dependency — if the skill's REFERENCE.md moves or changes structure, the synthesizer breaks.

---

## Cross-Reference: Piece 1a JASON-OS D2 Comparison

Comparing this inventory against the Piece 1a `D2-agents-teams-commands.jsonl`:

### Agents present in both SoNash and JASON-OS (already ported)

All 7 deep-research pipeline agents plus `contrarian-challenger` and `dispute-resolver` are in both repos. The JASON-OS versions are confirmed ports.

**Key deltas (SoNash has, JASON-OS port lacks):**
- `skills: [sonash-context]` frontmatter field on all agents — this is a SoNash-specific field that binds context injection. JASON-OS agents lack this because there is no equivalent `sonash-context` skill. This field will need a JASON-OS equivalent if context injection is required.
- `otb-challenger` agent — present in SoNash (referenced in Piece 1a JSONL), but NOT in this A–F scope. It will appear in the D2b (G–Z) scan.

### Agents NOT in JASON-OS (new port candidates)

The following active (non-stub) agents from this scan are NOT confirmed in JASON-OS:
- `backend-architect` — sanitize-then-portable; SoNash-specific example
- `code-reviewer` — sanitize-then-portable; heavily SoNash-specific
- `database-architect` — sanitize-then-portable; SoNash example only
- `debugger` — sanitize-then-portable; SoNash error patterns section
- `dependency-manager` — sanitize-then-portable; SoNash context section
- `document-analyst` — sanitize-then-portable; CONVENTIONS.md dependency
- `documentation-expert` — sanitize-then-portable; SoNash doc conventions
- `explore` — sanitize-then-portable; SoNash architecture section
- `frontend-developer` — sanitize-then-portable; deeply SoNash-coupled
- `fullstack-developer` — sanitize-then-portable; SoNash example only

**Note:** `explore` is explicitly referenced in CLAUDE.md §7 PRE-TASK trigger table in JASON-OS, suggesting it IS intended for porting — the JASON-OS `.claude/agents/` directory should be verified for its presence.

---

## Notable Frontmatter Anomalies

### 1. `skills: [sonash-context]` — non-standard field

Every active agent in this batch includes `skills: [sonash-context]` in YAML frontmatter. This field is not in the SCHEMA_SPEC Section 3B agent extension schema. It appears to inject a SoNash-specific context skill into the agent at spawn time. JASON-OS ports uniformly drop this field — either because the equivalent skill doesn't exist yet, or because it was deliberately removed.

**Action for D22 (schema surveyor):** Decide whether `skills` should be a JSONL field or remain in `notes`. This appears consistently enough to warrant top-level capture.

### 2. `model: inherit` (debugger)

The only `inherit` model value in this batch. Non-standard — not an explicit model ID. Means the agent inherits the calling context's model. Worth noting for JASON-OS model-selection guidance.

### 3. Stub frontmatter shape (3 deprecated agents)

`deployment-engineer`, `devops-troubleshooter`, `error-detective` all have minimal frontmatter: only `name` and `description`. No `tools`, `model`, `disallowedTools`, `color`, or `maxTurns`. This is a valid stub pattern — minimal enough to trigger redirect behavior without any operational capability.

### 4. `disallowedTools` array vs single-string inconsistency

Across the batch, `disallowedTools` appears in two forms:
- `disallowedTools: Agent` (bare string in YAML, e.g., contrarian-challenger)
- `disallowedTools: [Agent, Write, Edit]` (explicit array, e.g., explore)

When YAML is parsed, both should result in arrays, but the inconsistent authoring style is worth flagging for normalization.

### 5. `deep-research-searcher` — no maxTurns (unbounded)

The two synthesizer agents and the searcher all lack `maxTurns`. For the synthesizer agents this is expected (they do a fixed job). For the searcher, it means a single searcher agent can run indefinitely — this could be a cost concern for large research tasks.

---

## Gaps and Missing References

1. **`skills: [sonash-context]` semantics** — the actual `sonash-context` skill file was not read in this scan. D1a–e (skill scanners) should confirm whether this is a real skill file or a metadata annotation.

2. **`otb-challenger`** — referenced in Piece 1a D2 JSONL as a deep-research pipeline agent, but not in the A–F alphabetical scope of this scan. Will appear in D2b (G–Z scope).

3. **`technical-writer`** — referenced in `documentation-expert` body as a complementary agent ("technical-writer handles instead"). Not in A–F scope; will be in D2b.

4. **CONVENTIONS.md** — `document-analyst` references SoNash `CONVENTIONS.md` Sections 3 and 4. This file was not read in this scan. Its content determines what "sanitize" means for document-analyst portability. D17a–b should capture it.

5. **Redirect expiry enforcement** — the three deprecated stubs say "redirect expires 2026-06-01". There is no observed automated enforcement mechanism for this expiry. If D3a–b (hooks scanner) doesn't find an expiry checker, this is a gap.

6. **`explore` in JASON-OS** — Piece 1a D2 JSONL was skimmed but did not include an `explore` record. Whether `explore` exists in JASON-OS `.claude/agents/` needs verification — it's referenced in CLAUDE.md §7 but may not have been ported yet.

---

## Learnings for Methodology

### 1. Stub detection pattern

Three of the 20 agents are redirect stubs with minimal frontmatter (name + description only, no tools/model/etc.). Future scans should treat files with fewer than 3 frontmatter fields (excluding `---` delimiters) as potential stubs and classify them `status: deprecated` by default. The frontmatter field count is a reliable signal.

### 2. `skills: [sonash-context]` as a new JSONL field candidate

This field appears on every active agent (16 of 17 active agents). It is not in the SCHEMA_SPEC. It likely drives context injection at spawn time — a load-bearing behavioral field. Recommendation for D22: add `context_skills` as a Section 3B field for agents (array, nullable). Not capturing it means losing important spawn-time behavior information.

### 3. `model: inherit` as a valid enum value

The SCHEMA_SPEC Section 3B `model` field has no documented enum. `inherit` is a valid Claude Code model value meaning "use caller's model." The schema should document this as a permitted value alongside explicit model IDs.

### 4. Deprecated stubs count toward NO FILE OUT OF SCOPE

The "no file out of scope" rule means deprecated stubs MUST get JSONL records, not just be skipped. They carry useful metadata (redirect target, expiry date, consolidation rationale). This was correctly handled here — all 3 stubs have records.

### 5. SoNash consolidation pattern (2026-04-01)

Three agents were merged into two on the same date (2026-04-01). `deployment-engineer` → `fullstack-developer`, and `devops-troubleshooter` + `error-detective` → `debugger`. This 2-to-1 and 1-to-1 consolidation indicates SoNash uses agent merging to reduce agent count while elevating scope. JASON-OS may want to adopt the same pattern when porting: don't port redundant agents separately.

### 6. Pipeline agent portability is near-perfect

The 7 deep-research pipeline agents are almost entirely project-agnostic. The only SoNash coupling is: (a) `skills: [sonash-context]` frontmatter, and (b) occasional SoNash-specific examples in example blocks. The core methodology (phases, inputs, outputs, FIRE model, CRAAP+SIFT, DRAG taxonomy, etc.) is fully portable. This batch confirms the deep-research skill family is a strong port candidate.

### 7. Scope sizing: 20 agents is a good batch for one D-agent

20 agents at 2–15KB each was manageable in one pass. The parallel read strategy (5 files at a time, 4 rounds) avoided stalling. Larger batches (30+) would risk stalling on context window. 20 is a good cap for agent inventory D-agents.

### 8. `disallowedTools` as an architectural safety mechanism

The explore agent's use of `disallowedTools: [Agent, Write, Edit]` demonstrates that disallowedTools can serve as a mechanical enforcement of behavioral constraints (read-only, no recursion). This is more reliable than instruction-only constraints. JASON-OS should preserve this pattern when porting explore — the constraint is load-bearing.

---

## Confidence Assessment

- **All 20 agents inventoried:** Confirmed (NO FILE OUT OF SCOPE)
- **Frontmatter extraction:** HIGH confidence — read from actual files, not inferred
- **Model values:** HIGH — read verbatim from frontmatter
- **Pipeline phase identification:** HIGH — extracted from role/description fields
- **MCP dependencies:** HIGH — mcp__ prefix pattern is unambiguous
- **Portability classification:** MEDIUM-HIGH — judgment calls on example block impact; some body sections require further context (CONVENTIONS.md content unknown)
- **JASON-OS comparison:** MEDIUM — based on Piece 1a D2 JSONL skim; not a full filesystem verification of JASON-OS .claude/agents/ directory
