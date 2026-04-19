# D1d — Medium Skills Inventory Findings

**Agent:** D1d
**Profile:** codebase
**Date:** 2026-04-18
**Sub-Questions:** Piece 1b SoNash Discovery Scan — 15 medium skills (30-50KB tier)
**Scope:** `.claude/skills/` — synthesize, pr-review, doc-optimizer, analyze, pr-retro, systematic-debugging, comprehensive-ecosystem-audit, create-audit, audit-process, multi-ai-audit, audit-agent-quality, recall, ecosystem-health, convergence-loop, github-health

---

## Summary

15 skills inventoried. 2 confirmed ported to JASON-OS (pr-review, convergence-loop). 1 spawn-prompt error (systematic-debugging listed as "ported" but NOT present in JASON-OS). 12 SoNash-only.

| Portability      | Count | Skills                                                                                       |
|------------------|-------|----------------------------------------------------------------------------------------------|
| portable         | 1     | convergence-loop                                                                             |
| sanitize-then-portable | 8 | synthesize, pr-review, doc-optimizer, analyze, pr-retro, systematic-debugging, create-audit, audit-agent-quality, github-health |
| not-portable     | 5     | comprehensive-ecosystem-audit, audit-process, multi-ai-audit, recall, ecosystem-health       |

**Corrected count:** sanitize-then-portable = 9 (systematic-debugging should be sanitize-then-portable once its SoNash-specific refs are removed), not-portable = 5.

---

## Ported vs SoNash-Only Breakdown

### Ported to JASON-OS (2)

**pr-review** (v4.6 → JASON-OS v4.6-jasonos-v0.1, ported 2026-04-17)
- Deliberate scope reduction: CodeRabbit + Gemini reviewers dropped, pipeline-style learning capture removed, TDMS replaced with /add-debt stub, reference set trimmed to 2 files
- JASON-OS reference/ has only PRE_CHECKS.md + PARALLEL_AGENT_STRATEGY.md (vs SoNash's 5)
- Core DAS framework (Step 2), Security Threat Model (Step 0), and 8-step protocol are fully preserved
- Port lineage: `SoNash pr-review v4.6 → JASON-OS v0.1 trimmed port`

**convergence-loop** (v1.1, ported 2026-04-17)
- Full port — no sanitization needed (portability: portable, no external scripts or SoNash-specific deps)
- JASON-OS version uses compatibility: agentskills-v1, metadata.version: 1.1
- This is THE highest-inbound-dependency hub skill in this batch — 8+ callers

### Spawn Prompt Error — systematic-debugging

The spawn prompt stated "pr-review, systematic-debugging, convergence-loop are ported." However systematic-debugging is **NOT present in JASON-OS** `.claude/skills/`. It remains SoNash-only. This should be flagged to the orchestrator.

---

## Hub Skills (Inbound Dependencies)

### convergence-loop — CRITICAL HUB

Inbound callers confirmed via grep of all SKILL.md files:
- `/analyze` — N/A (mentioned as caller of synthesize but not direct CL caller)
- `/brainstorm`
- `/debt-runner`
- `/deep-plan` (integration complete Session #222)
- `/deep-research`
- `/pr-retro` (Step 1.2 deliverable verification)
- `/skill-creator` (integration complete Session #222)
- `/synthesize` (Phase 2.5 and 4.5 gates — quick preset)

**8 confirmed inbound callers.** More skills reference convergence loop in their body text (create-audit Phase 2, all audit skills T25 pending). This is a required dependency for any skill that implements multi-pass verification.

JASON-OS already has this ported — the hub is available.

### synthesize — HIGH-DEPENDENCY

Inbound callers (downstream from /analyze ecosystem):
- /analyze (--synthesize flag delegates here)
- /recall (listed in routing — synthesize interprets, recall queries)
- 4 CAS handler skills (repo-analysis, website-analysis, document-analysis, media-analysis)
- /session-end
- /skill-audit

The synthesize + analyze + recall triangle forms the CAS (Content Analysis System) — a major SoNash feature cluster. None of the three are ported to JASON-OS. The entire CAS would need to land together.

### pr-review — HIGH-DEPENDENCY

Inbound callers:
- /add-debt (mentions it)
- /code-reviewer (neighbor routing)
- /debt-runner
- /pr-ecosystem-audit
- /pr-retro (feeds data to pr-retro via reviews.jsonl)

pr-review → pr-retro is a tight couple (pr-retro reads pr-review's reviews.jsonl output). In JASON-OS the port excludes pr-retro from Foundation scope.

---

## _shared/ Patterns

**_shared/ecosystem-audit/** is used by the D1a/D1b ecosystem audit skills (hook, tdms, pr, session, script, doc, skill, health ecosystem audits). None of D1d's 15 skills directly use `_shared/ecosystem-audit/` — **comprehensive-ecosystem-audit** only calls those audits' run scripts and doesn't load the shared modules directly.

**_shared/AUDIT_TEMPLATE.md** is referenced by `audit-process` ("Read `.claude/skills/_shared/AUDIT_TEMPLATE.md` for standard audit procedures"). This is the standard audit procedures shared module — separate from the ecosystem-audit shared modules.

**skills/shared/CONVENTIONS.md** (a separate `shared/` not `_shared/`) is referenced by `analyze` and `recall`. This is the CAS skill family's conventions document.

**Key distinction:** Two separate shared-doc patterns exist:
1. `.claude/skills/_shared/` — hook ecosystem audit family (AUDIT_TEMPLATE.md, SELF_AUDIT_PATTERN.md, SKILL_STANDARDS.md, TAG_SUGGESTION.md, ecosystem-audit/)
2. `.claude/skills/shared/` — CAS skill family (CONVENTIONS.md)

---

## `skills: [sonash-context]` Usage

No skills in this batch use a `skills:` frontmatter field with a sonash-context value. The frontmatter fields observed in this batch are:
- `name`, `description` — universal
- `supports_parallel`, `fallback_available`, `estimated_time_*` — doc-optimizer, comprehensive-ecosystem-audit
- `compatibility: agentskills-v1` — in JASON-OS ports (pr-review, convergence-loop); NOT in SoNash originals
- `metadata: { short-description, version }` — in JASON-OS pr-review port

The `skills:` (sonash-context) frontmatter pattern from D1a (hook/session/health ecosystem audits that cross-reference context skills) does not appear in this batch. Possible conclusion: that pattern is specific to the ecosystem-audit family, not the broader skill population.

---

## Notable Portability Findings

### CAS Cluster — all-or-nothing port

`analyze`, `synthesize`, `recall` form an interdependent cluster (the Content Analysis System, T28 epic). None are ported. The cluster requires:
- `scripts/cas/` pipeline scripts (update-index.js, rebuild-index.js, recall.js, generate-extractions-md.js, self-audit.js)
- `scripts/lib/analysis-schema.js` (Zod schema)
- SQLite database (`.research/content-analysis.db`)
- Handler skills: repo-analysis, website-analysis, document-analysis, media-analysis
- CAS data files: extraction-journal.jsonl, tag-vocabulary.json

Portability level: **sanitize-then-portable** (all 3) but only after the full CAS infrastructure lands. Until then: not-useful as standalone ports.

### TDMS Dependency — major portability blocker

7 of 15 skills have TDMS (`scripts/debt/`) as a critical dependency:
- pr-review (Step 5 deferrals via /add-debt — mitigated in JASON-OS port)
- doc-optimizer (Step 9 TDMS intake)
- audit-process (Stages 2-6 + post-audit)
- multi-ai-audit (Phases 7-8)
- audit-agent-quality (post-audit)
- create-audit (generated audits MUST use 4 TDMS scripts)
- pr-retro (Step 2.3 cross-ref + Step 8 TDMS)

JASON-OS has `/add-debt` as a stub replacement, but the full intake pipeline (intake-audit.js, validate-schema.js, generate-views.js, generate-metrics.js) is SoNash-only.

### Episodic Memory MCP References

`systematic-debugging` (Phase 0) and `audit-process` (Step 0) both reference `mcp__plugin_episodic-memory` for pre-task memory search. This is a SoNash-specific MCP plugin not present in JASON-OS. These calls would need to be removed or substituted in any port.

### systematic-debugging — Highest portability (but not ported)

The core 5-phase debugging protocol (Phase 0-4) is almost entirely procedural — no scripts, no external deps beyond MCP episodic memory. Removing the `superpowers:` skill namespace refs (use plain skill names), dropping Phase 0 MCP search, and keeping the rest would make this fully portable. 11 files include valuable companion docs (root-cause-tracing.md, defense-in-depth.md, condition-based-waiting.md, find-polluter.sh). This skill should be HIGH priority for JASON-OS port.

### ecosystem-health + github-health — infrastructure-locked

`ecosystem-health` requires `scripts/health/` (10 checkers + scoring lib) — fully SoNash-specific infrastructure. `github-health` is more portable (gh CLI is universal) but depends on session-begin hook coupling, gh-fix-ci skill (not in JASON-OS), and ROADMAP.md structure.

---

## SoNash-Specific Patterns Observed

### Invocation Tracking (`npx tsx write-invocation.ts`)

Present in: pr-review, pr-retro, create-audit, audit-agent-quality. This calls `scripts/reviews/write-invocation.ts` (TypeScript, SoNash product code) to log skill invocations to a registry. Must be dropped or stubbed in JASON-OS ports.

### `_shared/AUDIT_TEMPLATE.md`

Referenced by audit-process as the "standard audit procedures" shared module. Not present in JASON-OS. Any port of audit-style skills would need this or an equivalent.

### `.planning/` References

Several skills reference planning artifacts by path (create-audit → `.planning/content-analysis-system/DECISIONS.md`, convergence-loop → `.planning/system-wide-standardization/DIAGNOSIS-v2.md`, github-health → `.planning/github-health-skill/DECISIONS.md`). These are SoNash project planning artifacts — sanitize or drop in ports.

### `data/ecosystem-v2/` Data Store

Referenced by: ecosystem-health (ecosystem-health-log.jsonl, warnings.jsonl), audit-agent-quality (invocations.jsonl). This is SoNash's ecosystem monitoring data directory — not present in JASON-OS. State files live in `.claude/state/` (portable pattern) but the data/ store is SoNash product.

---

## Learnings for Methodology

1. **Spawn prompt portability claims need verification against filesystem.** The spawn prompt stated systematic-debugging was "ported" but the JASON-OS skills/ directory shows it is absent. Cross-check port claims against actual JASON-OS file presence.

2. **Port scope reduction is a first-class artifact.** The pr-review JASON-OS port explicitly documents what was dropped (CodeRabbit, Gemini, TDMS, invocation tracking) in its version history. Future port ledger should capture these reduction decisions, not just the port date.

3. **CAS skills form an all-or-nothing cluster.** analyze, synthesize, recall cannot be usefully ported in isolation — the SQLite backend + cas/ scripts are the shared substrate. Any port decision should treat all three as a bundle.

4. **Companion-file layouts in this tier:** SKILL.md + REFERENCE.md (2-file) = 9 of 15. SKILL.md + prompts.md (2-file, prompts extracted) = 2 of 15 (doc-optimizer, audit-process). SKILL.md only (compact) = 1 of 15 (comprehensive-ecosystem-audit, create-audit — but these have REFERENCE.md). Full multi-file with scripts = 3 of 15 (systematic-debugging 11 files, pr-review 7, comprehensive-ecosystem-audit 4).

5. **`skills: [sonash-context]` pattern absent from this tier.** That frontmatter key appears to be ecosystem-audit specific. The D1d batch uses no such field. This reduces the schema field's universality claim.

6. **State file path variability:** Most skills use `.claude/state/task-{skill-name}.state.json`. Exception: multi-ai-audit uses `.claude/multi-ai-audit/session-state.json` (non-standard subdir). This should be flagged as inconsistency in the SoNash skill conventions.

7. **"Deferred" features need tracking even when minor.** ecosystem-health's `warning-lifecycle.js` is documented as "not yet wired" — an Active Warnings section in the dashboard is non-functional. recall's self-audit.js is a scaffold. These are partial implementations that could mislead portability assessment if not flagged.

8. **_shared/ vs shared/ distinction.** Two separate shared-doc directories serve different skill families (_shared/ for audit/ecosystem family, shared/ for CAS family). Future D-agents scanning these dirs need to track which family references which.

---

## Gaps and Missing References

1. **comprehensive-ecosystem-audit reference/ contents not in JSONL schema's component_units.** SKILL.md delegates to `reference/RECOVERY_PROCEDURES.md`, `reference/WAVE_DETAILS.md`, `reference/AGGREGATION_GUIDE.md` — these are effectively companion docs but the schema doesn't have a clean place for reference/ subdir contents. Recorded in notes.

2. **pr-review reference/ subdir in SoNash has 5 files; JASON-OS port has 2.** The 3 excluded files (LEARNING_CAPTURE.md, SONARCLOUD_ENRICHMENT.md, TDMS_INTEGRATION.md) are SoNash-specific. The port's reference/ retains PRE_CHECKS.md and PARALLEL_AGENT_STRATEGY.md. The delta is not documented in the port's SKILL.md — only discoverable by comparing dirs.

3. **systematic-debugging port status is incorrect in spawn prompt.** Flagged above. No file evidence of systematic-debugging in JASON-OS.

4. **audit-process prompts.md file count.** The SKILL.md says "22 parallel agents" but the agent table shows 22 agents with types. prompts.md (23588b) was not fully read — agent prompts not fully enumerated. Recorded in active_scripts and agent_types_spawned as best effort.

5. **multi-ai-audit templates.md phases 2-9 not read.** SKILL.md delegates Phases 2-9 detail to templates.md. Only Phase 1 workflow is in SKILL.md. The agent_types_spawned list is empty (no agents dispatched — it's a human-pasted-findings aggregator, not an agent orchestrator).
