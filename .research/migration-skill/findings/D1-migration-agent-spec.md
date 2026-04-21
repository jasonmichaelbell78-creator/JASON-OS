# FINDINGS — D1-migration-agent-spec

**Agent:** D1-migration-agent-spec (Phase 1 searcher, /migration deep-research)
**Sub-question:** SQ-D1c — Custom-agent roster for /migration's seven phases
**Profile:** codebase
**Date:** 2026-04-21
**Depth:** L1

---

## Summary

The /migration skill requires a **mix of reuse + new custom agents** to cover its seven-phase arc (0 Context → 1 Target pick → 2 Discovery → 3 Research → 4 Plan → 5 Execute → 6 Prove). Reuse is strongest in Phase 3 (Research) and Phase 6 (Prove), where the JASON-OS deep-research and convergence-loop infrastructure already solves the domain. **Phases 2, 4, and 5 need novel custom agents** because they are migration-specific — particularly the D24 "active transformation" content of Phase 5 (sanitize + reshape + rewrite), which has no direct JASON-OS analog today.

**Bottom line:** **8 new custom agents + 6 reused agents.** The novel agents cluster around verdict-assignment (Phase 2), plan authorship (Phase 4), and the three transformation primitives (Phase 5). Phase 0 and Phase 1 are orchestrator-owned (no spawned agents). Phase 6 leans on the existing `convergence-loop` skill plus `deep-research-verifier` for claim auditing.

**Key design choice — verdict-assigner is warranted.** The verdict legend (D23: copy-as-is / sanitize / reshape / rewrite / skip / blocked-on-prereq) carries so much downstream weight (Phase 3 skip R4, Phase 5 pipeline routing, gate design) that a dedicated agent per candidate unit produces cleaner traceability than inlining verdict logic into a generic discovery scanner. Pairs well with `contrarian-challenger` (reused) as a cross-check before verdicts lock.

**Key design choice — reshape and rewrite are separate agents, not one.** D23 explicitly split these verdicts because their transformation primitives differ: reshape = structural rewrite against destination idioms (mechanical, idiom-driven); rewrite = semantic redesign (may dispatch mid-execute research per D24). Collapsing them into one "transformer" would muddy tool grants, gate design, and failure-recovery semantics (research Q8).

---

## Proposed agent roster

| Phase | Agent name | New/Reuse | Model | Tools | Inputs | Outputs | Spawn qty | Rationale |
|-------|------------|-----------|-------|-------|--------|---------|-----------|-----------|
| 0 Context | — | (orchestrator) | — | — | `/sync` registry + JASON-OS CLAUDE.md | in-memory context | 0 | Phase 0 is skill-orchestrator work; no agent needed. |
| 1 Target pick | — | (orchestrator + user) | — | — | Menu selection | chosen target + mode | 0 | Menu is conversational; orchestrator-owned. |
| 2 Discovery | `migration-discovery-scanner` | **NEW** | sonnet | Read, Write, Bash, Grep, Glob | Target path, direction, other-endpoint | `DISCOVERY.md` — candidate unit inventory + ripple map | 1-N (per target batch) | Pre-migration analysis, dependency/ripple detection, candidate unit listing. |
| 2 Discovery | `migration-verdict-assigner` | **NEW** | sonnet | Read, Grep, Glob, Bash, Write | `DISCOVERY.md` + candidate unit | Per-unit verdict record (copy-as-is/sanitize/reshape/rewrite/skip/blocked) with rationale | N (1 per candidate unit, parallel) | D23 verdict legend assignment. Separates signal from scanner so verdicts are auditable per-unit. |
| 2 Discovery | `contrarian-challenger` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch | Verdict records | `challenges/contrarian-N.md` — steel-manned verdict challenges | 1-3 | Adversarial cross-check on verdicts before they lock. Free-MAD protocol catches over-confident `copy-as-is` verdicts. |
| 3 Research | `deep-research-searcher` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, Context7 MCP | Reshape/rewrite unit + destination idiom questions | `FINDINGS.md` per idiom question | 1-N (per reshape/rewrite unit, per idiom Q) | R4: Phase 3 runs only for reshape/rewrite verdicts. Existing searcher handles codebase + web profile. |
| 3 Research | `deep-research-synthesizer` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob | Findings dir | `RESEARCH_OUTPUT.md` + claims.jsonl + sources.jsonl | 1 | Combines per-unit idiom findings. |
| 3 Research | `deep-research-verifier` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch | Synthesized claims | Per-claim verdicts (4-type) | 1 | Verifies idiom claims before they drive reshape/rewrite. |
| 4 Plan | `migration-plan-author` | **NEW** | sonnet | Read, Write, Bash, Grep, Glob | Verdicts + research output + direction/mode | `MIGRATION_PLAN.md` | 1 | Writes the D3 planning artifact. Mode-aware (direct-apply vs plan-export per D26). |
| 4 Plan | `migration-plan-checker` | **NEW** | sonnet | Read, Grep, Glob, Bash | `MIGRATION_PLAN.md` + verdicts + research | Gap/inconsistency report | 1 | Pre-execute audit — no silent gaps (D8). Mirrors SoNash `gsd-plan-checker` pattern. |
| 5 Execute | `migration-sanitizer` | **NEW** | sonnet | Read, Write, Edit, Bash, Grep, Glob | Unit + sanitize verdict + patterns | Sanitized unit + sanitization report | N (per sanitize-verdict unit) | Regex + confirmation scrub of home-context (paths, secrets, local assumptions). Deterministic; low-risk. |
| 5 Execute | `migration-reshaper` | **NEW** | sonnet | Read, Write, Edit, Bash, Grep, Glob | Unit + reshape verdict + destination idiom research | Reshaped unit + transformation diff + gate-ready summary | N (per reshape-verdict unit) | **D24 novel primitive.** Structural rewrites against destination idioms. Gated per-unit per D8. |
| 5 Execute | `migration-rewriter` | **NEW** | opus (or sonnet) | Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, Context7 MCP | Unit + rewrite verdict + research bundle | Rewritten unit + design rationale + gate-ready summary | N (per rewrite-verdict unit, usually small N) | **D24 novel primitive — heaviest.** Semantic redesign. May dispatch mid-execute research. Opus justified for rewrite-verdict units. |
| 5 Execute | `migration-executor` | **NEW** | sonnet | Read, Write, Edit, Bash, Grep, Glob | All transformation outputs + plan + mode | Applied writes (direct-apply) or portable plan file (plan-export) | 1 | Stage-and-apply after per-unit gates. Mode-aware (D26). Commit staging. |
| 5 Execute | `dispute-resolver` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob | Conflicting transformation results (e.g. sanitizer vs reshaper disagree on scope) | Resolution + dissent record | 0-N (on demand) | Mid-execute dispute handling. Uses DRAGged taxonomy. |
| 6 Prove | convergence-loop skill | **REUSE (skill not agent)** | n/a | n/a | Migration claims + applied state | Pass/fail per claim, T20 tally | n/a | D6 success-criteria verification. Already a JASON-OS skill. |
| 6 Prove | `deep-research-verifier` | **REUSE** | sonnet | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch | Post-migration claims | Per-claim verdicts | 1-2 | Dual-path verification (filesystem + web) of migration outcomes. |
| 6 Prove | `migration-prove-reporter` | **NEW** | sonnet | Read, Write, Bash, Grep, Glob | Convergence results + verifier output | `PROVE.md` final report | 1 | Aggregates prove-phase evidence into a single artifact the user acknowledges (D8). |

**Totals:** 8 new agents, 6 reused agents (contrarian-challenger, deep-research-searcher, deep-research-synthesizer, deep-research-verifier, dispute-resolver, plus convergence-loop skill — not an agent but counted as reuse infrastructure).

**Unused JASON-OS agents (for reference):** `deep-research-final-synthesizer`, `deep-research-gap-pursuer`, `otb-challenger`. These are deep-research-specific and don't map cleanly onto /migration phases; they remain available if /migration's Phase 3 runs a full deep-research sub-invocation rather than a focused idiom search.

---

## Agent frontmatter sketches

### NEW — `migration-discovery-scanner`

```yaml
---
name: migration-discovery-scanner
model: sonnet
description: >-
  Phase 2 scanner for /migration. Performs pre-migration analysis of a target
  unit (file / workflow / concept): enumerates candidate units, maps ripple
  dependencies, flags home-context coupling, identifies sanitize/reshape/rewrite
  candidates. Writes DISCOVERY.md. Use PROACTIVELY when /migration enters Phase
  2 for a user-selected target or proactive-scan sweep.
tools: Read, Write, Bash, Grep, Glob
color: cyan
---
```

Role: Reads the target unit from either endpoint (JASON-OS or other-endpoint), walks its dependency graph (imports, cross-references, label tags, hook registrations), and writes a structured DISCOVERY.md that enumerates every affected candidate unit with preliminary classification. Does NOT assign final verdicts — that is the verdict-assigner's job. Flags every home-context assumption for downstream handling (paths, repo-specific IDs, auth tokens).

### NEW — `migration-verdict-assigner`

```yaml
---
name: migration-verdict-assigner
model: sonnet
description: >-
  Phase 2 verdict-assignment agent for /migration. For each candidate unit in
  DISCOVERY.md, assigns one of the six D23 verdicts (copy-as-is / sanitize /
  reshape / rewrite / skip / blocked-on-prereq) with rationale and confidence.
  Spawned in parallel, one per candidate unit. Use PROACTIVELY after discovery
  scan completes and before plan authoring.
tools: Read, Grep, Glob, Bash, Write
disallowedTools: Agent
color: yellow
---
```

Role: Reads a single candidate unit plus the discovery context, classifies it against the D23 legend, and writes `verdicts/<unit-slug>.md`. Produces evidence-backed rationale (grep/read output) for each verdict. Honors R4 — a `reshape`/`rewrite` verdict forces Phase 3 research on that unit. Confidence levels mirror deep-research conventions (HIGH/MEDIUM/LOW/UNVERIFIED). Escalates ambiguous cases to `contrarian-challenger` cross-check.

### NEW — `migration-plan-author`

```yaml
---
name: migration-plan-author
model: sonnet
description: >-
  Phase 4 plan-authoring agent for /migration. Synthesizes discovery verdicts,
  Phase 3 research output, and user mode selection (direct-apply vs
  plan-export per D26) into the MIGRATION_PLAN.md artifact. Produces gate-by-gate
  execution schedule with per-unit verdict routing. Use PROACTIVELY after Phase
  3 research completes and before Phase 5 execution begins.
tools: Read, Write, Bash, Grep, Glob
color: purple
---
```

Role: Reads all Phase 2 verdicts + Phase 3 RESEARCH_OUTPUT.md + user-selected mode + direction (in/out), then writes a single MIGRATION_PLAN.md that encodes the full execution arc. For each candidate unit: verdict, rationale, gate, expected transformations, success criteria. Mode-aware — `plan-export` mode produces a self-contained plan invocable in destination (research Q4 governs mechanics); `direct-apply` mode produces an apply-ready checklist. Honors R2 (canonical arc) and R3 (gate memory).

### NEW — `migration-plan-checker`

```yaml
---
name: migration-plan-checker
model: sonnet
description: >-
  Phase 4 audit agent for /migration. Reviews MIGRATION_PLAN.md against
  underlying verdicts and research for completeness, silent gaps, and D8
  violations (unconfirmed transformations). Surfaces issues for user
  resolution before Phase 5 execution. Use PROACTIVELY after
  migration-plan-author writes MIGRATION_PLAN.md and before any Phase 5 write.
tools: Read, Grep, Glob, Bash
disallowedTools: Agent, Write, Edit
color: orange
---
```

Role: Read-only audit agent. Cross-references every line in MIGRATION_PLAN.md against verdicts and research. Flags: missing gates, verdicts without plan steps, plan steps without verdicts, unconfirmed transformations, ambiguous mode handling. Mirrors SoNash `gsd-plan-checker` pattern. Produces a gap report; does not modify the plan.

### NEW — `migration-sanitizer`

```yaml
---
name: migration-sanitizer
model: sonnet
description: >-
  Phase 5 sanitization agent for /migration. For a single unit with a
  `sanitize` verdict, applies deterministic regex-driven scrubs (paths, secrets,
  home-context references) per the D24 sanitize primitive. Produces sanitized
  output plus a transformation report the user gates on. Use PROACTIVELY during
  Phase 5 for every sanitize-verdict unit.
tools: Read, Write, Edit, Bash, Grep, Glob
color: green
---
```

Role: Lowest-risk transformation primitive. Reads the source unit + the sanitization pattern bundle (generated by the plan), applies the transformations, diffs original vs sanitized, writes a report. Every substantive substitution is listed so the user can gate explicitly per D8. If any pattern fails to match cleanly (ambiguous scope, regex collision), escalates rather than guessing.

### NEW — `migration-reshaper`

```yaml
---
name: migration-reshaper
model: sonnet
description: >-
  Phase 5 reshape agent for /migration. For a single unit with a `reshape`
  verdict, performs structural rewrites against destination idioms
  (frontmatter shape, tool conventions, CLAUDE.md directives, directory
  layout) using Phase 3 research as the idiom source. Produces reshaped
  output + diff + gate-ready summary. Use PROACTIVELY during Phase 5 for
  every reshape-verdict unit.
tools: Read, Write, Edit, Bash, Grep, Glob
color: blue
---
```

Role: **D24 novel primitive — structural transformation.** Takes a source unit and the destination idiom bundle (from Phase 3), applies mechanical structural rewrites: rename references, swap frontmatter keys, restructure sections, adjust tool grants, reshape path conventions. Unlike rewrite, does NOT change semantic intent — only form. Produces a diff the user gates per-unit. Escalates to `migration-rewriter` if the reshape reveals semantic-level divergence the unit's verdict missed.

### NEW — `migration-rewriter`

```yaml
---
name: migration-rewriter
model: opus
description: >-
  Phase 5 rewrite agent for /migration. For a single unit with a `rewrite`
  verdict, performs semantic redesign against the destination — not just
  structural reshape but reimagining how the concept expresses itself in the
  destination's paradigm. May dispatch mid-execute research per D24. Heaviest
  transformation primitive; opus model justified. Use PROACTIVELY during
  Phase 5 for every rewrite-verdict unit.
tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__resolve-library-id, mcp__context7__query-docs
color: red
---
```

Role: **D24 novel primitive — semantic transformation.** Handles units where the source concept does not translate directly — it must be reimagined. Has web/docs tool access because rewrite may need destination-idiom research not gathered in Phase 3 (D24 allows mid-execute dispatch). Produces: rewritten unit, design rationale, traceability map from source concept to destination implementation, gate-ready summary. Opus model chosen for semantic-heavy work; sonnet is acceptable fallback for cost-constrained runs.

### NEW — `migration-executor`

```yaml
---
name: migration-executor
model: sonnet
description: >-
  Phase 5 apply/export agent for /migration. After per-unit transformation
  agents complete and user gates clear, writes results to destination
  (direct-apply mode) or to a portable MIGRATION_PLAN.md (plan-export mode per
  D26). Stages commits per verdict batch. Use PROACTIVELY after all Phase 5
  transformation gates are confirmed.
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---
```

Role: Final Phase 5 step. Takes all gate-approved transformation outputs and applies them according to mode. `direct-apply`: writes to destination filesystem, stages commits per batch, surfaces commit messages for user approval. `plan-export`: writes a self-contained plan file to JASON-OS that can be invoked from destination (mechanics per research Q4). Honors D29 (local-filesystem only) — no remote/PR operations. Handles dirty-destination detection (research Q12).

### NEW — `migration-prove-reporter`

```yaml
---
name: migration-prove-reporter
model: sonnet
description: >-
  Phase 6 prove-report agent for /migration. Aggregates convergence-loop
  verification results plus deep-research-verifier output into a single
  PROVE.md final report the user must acknowledge (D8). Includes per-claim
  pass/fail, T20 tally, and any re-entry triggers surfaced during execution.
  Use PROACTIVELY after Phase 6 verification completes.
tools: Read, Write, Bash, Grep, Glob
disallowedTools: Agent
color: purple
---
```

Role: Terminal reporting agent. No transformation work — pure aggregation and presentation. Consumes convergence-loop output + verifier claims + plan-check gaps, produces a single PROVE.md with: migration summary, per-claim evidence, residual gaps, re-entry recommendations (per D28 iterative re-entry norm). User acknowledges PROVE.md before /migration considers the run complete.

---

## Open design questions

These surface for Q7 (skill decomposition analysis) because they affect whether the roster is monolithic inside `/migration` or split across primary + ancillary skills.

1. **Should reshape and rewrite each become their own sub-skill?** Argument for: they have distinct tool grants, distinct model justifications (opus vs sonnet), and mid-execute research dispatch only applies to rewrite. Argument against: verdict routing lives in the main skill; splitting would duplicate gate logic. **Recommendation to Q7:** monolithic for v1 (agents are roster-level, not skill-level), revisit after self-dogfood.

2. **Does verdict-assigner need a per-unit agent, or one agent handling the full verdict batch?** Parallel per-unit gives cleaner traceability (one record per unit, one agent invocation per verdict) and matches D8 (nothing silent). Batch mode would be faster for large discovery sets. **Recommendation to Q7:** per-unit with parallel dispatch; batch as optimization flag later.

3. **Where does `contrarian-challenger` hook in — Phase 2 (verdict challenge) only, or also Phase 4 (plan challenge) and Phase 5 (transformation challenge)?** Current roster proposes Phase 2 only. But plan-level and transformation-level adversarial review could catch issues verdict-level challenge misses. **Recommendation to Q7:** Phase 2 required; Phase 4 optional flag; Phase 5 dispatch on opus-level rewrites only (cost-gated).

4. **Should the Phase 5 executor and Phase 4 plan-author actually be one agent?** Both write structured artifacts the user gates on. Split preserves audit trail (plan authored, plan checked, plan executed as separate gates). Collapse reduces agent count. **Recommendation:** keep split — D3 plan-then-execute is a core decision; collapsing would blur the gate.

5. **Rewrite agent model choice (opus vs sonnet) — is this user-configurable?** Opus is justified by semantic complexity, but cost-sensitive runs may prefer sonnet. Skill-level config flag `REWRITE_MODEL` would handle this cleanly.

---

## Sources

| # | Source | Type | Trust | Date |
|---|--------|------|-------|------|
| S-001 | `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` | codebase (spec) | HIGH | 2026-04-20 |
| S-002 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\deep-research-searcher.md` | codebase (frontmatter template) | HIGH | current |
| S-003 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\deep-research-synthesizer.md` | codebase (frontmatter template) | HIGH | 2026-04-01 |
| S-004 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\contrarian-challenger.md` | codebase (reuse candidate) | HIGH | current |
| S-005 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\dispute-resolver.md` | codebase (reuse candidate) | HIGH | current |
| S-006 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\deep-research-verifier.md` | codebase (reuse candidate) | HIGH | current |
| S-007 | `C:\Users\jbell\.local\bin\JASON-OS\.claude\agents\deep-research-gap-pursuer.md` | codebase (unused reference) | HIGH | current |
| S-008 | `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-executor.md` | codebase (executor pattern inspiration) | HIGH | current |
| S-009 | `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-phase-researcher.md` | codebase (research/author pattern inspiration) | HIGH | current |
| S-010 | `C:\Users\jbell\.local\bin\sonash-v0\.claude\agents\gsd-plan-checker.md` (inferred from listing) | codebase (plan-checker pattern inspiration) | MEDIUM (listed, not read) | current |

All sources are filesystem ground truth (T1). Verdict legend (D23), Phase 5 content (D24), output modes (D26), nothing-silent rule (D8), and iterative re-entry norm (D28) all drawn from BRAINSTORM.md directly. Frontmatter field conventions (name, model, description, tools, disallowedTools, color, maxTurns, permissionMode) confirmed across 4+ existing agents in JASON-OS and SoNash.
