# D1e: Small-Medium Skills Inventory Findings

**Agent:** D1e
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** 18 skills under `.claude/skills/` (12-30KB range)

---

## Per-Skill Summaries

### 1. `deep-plan` — PORTED (version delta)

- **SoNash version:** 3.3 (2026-03-15) | **JASON-OS version:** 3.0
- **Files:** SKILL.md + REFERENCE.md (flat layout)
- **Size:** 28,324 bytes
- **Port status:** Ported but 3 minor versions behind. SoNash 3.1 added code-state
  verification (UNVERIFIED flag), 3.2 added convergence-loop integration to Phase 0
  and Phase 3.5, 3.3 added failure paths and an Integration section. These are
  behavioral-only changes — no scripts added. Gap risk: low but the CL integration
  in 3.2 is a meaningful behavioral improvement.
- **Key dependency gap:** Phase 0 step 3 reads `.research/EXTRACTIONS.md` and
  `.research/extraction-journal.jsonl` (SoNash-specific prior-art tracking). JASON-OS
  v0.1 does not have these files; the phase gate silently skips.
- **Invocation tracking:** SoNash calls `npx tsx write-invocation.ts`; JASON-OS port
  omits this step (write-invocation.ts absent in JASON-OS).

---

### 2. `webapp-testing` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md, LICENSE.txt, scripts/with_server.py, examples/*.py (3 files)
- **Size:** 23,300 bytes
- **Port status:** Not ported. Skill is fully portable in principle (no SoNash-specific
  references) but Python infrastructure is not standard in JASON-OS v0.
- **Unique:** Only skill in this tier (and possibly all tiers) with a LICENSE.txt
  companion file. Python-based skill throughout.
- **Architecture:** Black-box script methodology — run `--help` first, never read
  source; reconnaissance-then-action pattern for dynamic apps.

---

### 3. `code-reviewer` — PORTED (partial — SKILL.md only)

- **SoNash version:** 2.2 (2026-03-13) | **JASON-OS:** SKILL.md present, no companion files
- **Files:** SKILL.md + references/code_review_checklist.md + references/coding_standards.md
  + references/common_antipatterns.md + scripts/code_quality_checker.py +
  scripts/pr_analyzer.py + scripts/review_report_generator.py
- **Size:** 23,243 bytes
- **Port status:** JASON-OS has SKILL.md only. Companion reference docs and Python
  scripts are absent. The SKILL.md in JASON-OS is stripped of SoNash-specific content
  (Firebase/Firestore collection names, MCP episodic memory calls, docs/agent_docs/
  references).
- **Sanitize fields:** Firebase section (journal/daily_logs/inventoryEntries
  collections), React/Next.js App Router conventions, docs/agent_docs/ references,
  mcp__plugin_episodic-memory calls.
- **reference_layout: subdirectory** — unique in this tier; references/ subdir uses
  2-depth glob pattern.

---

### 4. `ux-researcher-designer` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md, scripts/persona_generator.py
- **Size:** 22,795 bytes
- **Port status:** Not ported. Skill is conceptually portable but scope is project
  because persona generation is calibrated to SoNash's user base (recovery domain).
- **Structural note:** Thin SKILL.md — no phases, no guard rails, no compaction
  resilience, no invocation tracking. Early-bootstrap creation pattern.

---

### 5. `brainstorm` — PORTED (version delta)

- **SoNash version:** 1.1 (2026-04-01) | **JASON-OS version:** 1.0
- **Files:** SKILL.md + REFERENCE.md (flat layout)
- **Size:** 20,326 bytes
- **Port status:** Ported but one minor version behind. SoNash 1.1 added phase gates,
  convergence-loop integration, guard rails, and UX improvements via an 18-decision
  skill-audit. These are behavioral-only changes — no scripts added.
- **Key dependency gap:** Phase 0 step 3 reads `.research/EXTRACTIONS.md` (same gap
  as deep-plan). JASON-OS does not have this file yet.
- **Invocation tracking:** SoNash calls write-invocation.ts; JASON-OS port omits.

---

### 6. `ui-design-system` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md, scripts/design_token_generator.py
- **Size:** 19,747 bytes
- **Port status:** Not ported. Python-based. Design tokens are brand-specific.
- **Structural note:** Thin SKILL.md — same early-bootstrap creation pattern as
  ux-researcher-designer.

---

### 7. `todo` — PORTED (versions match)

- **SoNash version:** 1.2 (2026-04-10) | **JASON-OS version:** 1.2
- **Files:** SKILL.md + REFERENCE.md (flat layout)
- **Size:** 19,113 bytes
- **Port status:** FULLY IN SYNC. Both are v1.2 with the T30 fix (locked
  regression-guarded CLI for all JSONL mutations through todos-cli.js).
- **Key dependency:** scripts/planning/todos-cli.js (locked, regression-guarded) is
  the load-bearing script. JASON-OS has equivalent CLI scripts. The advisory file
  lock + regression guard (7-step mutation flow) is the defining safety feature.
- **Invocation tracking:** SoNash calls write-invocation.ts; JASON-OS port omits.

---

### 8. `audit-ai-optimization` — SONASH-ONLY (not ported)

- **SoNash version:** 1.1 (2026-02-23)
- **Files:** SKILL.md only
- **Size:** 18,948 bytes
- **Port status:** Not ported. Depends on SoNash TDMS pipeline for intake.
- **Unique frontmatter:** `supports_parallel: true`, `fallback_available: true`,
  `estimated_time_parallel: 30 min`, `estimated_time_sequential: 90 min`.
- **JASON-OS relevance:** Domain 5 ('AI instruction bloat') directly examines
  SKILL.md line counts across `.claude/skills/*/SKILL.md`. Domain 8 ('skill overlap')
  checks for overlapping skill purposes. Both would be immediately applicable to
  JASON-OS. The 'AI security patterns' domain (Domain 13) checks `.claude/` configs
  for prompt injection — universally applicable.
- **Agent type note:** Uses `subagent_type: "Explore"` for stages 1-2, `"general-purpose"`
  for synthesis. Explore agents are read-only; general-purpose can write files.

---

### 9. `session-end` — PORTED (significant delta)

- **SoNash version:** 2.2 (2026-03-13) | **JASON-OS version:** 2.2-jasonos-v0.1 (2026-04-17)
- **Files:** SKILL.md only (both SoNash and JASON-OS)
- **Size:** 18,365 bytes (SoNash)
- **Port status:** Ported with substantial trimming. JASON-OS port has explicit
  Lineage frontmatter: `"Lineage: SoNash 41526 session-end v2.2 → JASON-OS v0.1 port"`.

**SoNash LIVE vs JASON-OS live:**

| Phase | SoNash | JASON-OS v0.1 |
|---|---|---|
| Phase 1: Context Preservation (Steps 1-3) | LIVE | LIVE |
| Phase 2: Compliance Review (Steps 4-6) | LIVE | MOSTLY NO-OP (Layer 2 gated) |
| Phase 3: Metrics Pipeline (Step 7) | LIVE (TDMS/reviews/health) | STRIPPED |
| Phase 4: Cleanup & Closure (Steps 8-10) | LIVE | LIVE |
| Learning Loop | LIVE | LIVE |

**Deferred in JASON-OS:**
- Steps 4/4b/4c/5/5b/6 (Layer 2 hook state files absent)
- Entire Phase 3 (reviews:sync, ecosystem-health, TDMS consolidation/metrics)
- Step 7g commit analytics
- `npm run session:end` → replaced with `node scripts/session-end-commit.js`
- SESSION_HISTORY.md archival pattern (SoNash: 3-session rolling window to docs/SESSION_HISTORY.md)

**SoNash capabilities missing from JASON-OS:**
- TDMS debt consolidation + metric generation (session:end is the trigger for MASTER_DEBT freshness)
- Review sync pipeline (reviews.jsonl)
- Ecosystem health snapshot (run-ecosystem-health.js)
- D26 data flow steps (agent-invocations.jsonl, decisions.jsonl, commit-log.jsonl)

---

### 10. `debt-runner` — NOT PORTED (blocked on TDMS)

- **SoNash version:** 1.1 (2026-03-15)
- **Files:** SKILL.md + REFERENCE.md (flat layout)
- **Size:** 18,260 bytes
- **Port status:** Not ported. JASON-OS has `add-debt` as a stub but NOT debt-runner.
  Per MEMORY.md: debt-runner is the TDMS upgrade target for JASON-OS's add-debt stub.
- **Blocking factor:** Every mode hardcodes the TDMS infrastructure: MASTER_DEBT.jsonl
  (4,500+ items), docs/technical-debt/staging/, and 12+ scripts/debt/* scripts.
  Cannot be ported without first porting the TDMS pipeline.
- **Porting path:** Port TDMS pipeline first → then debt-runner becomes
  sanitize-then-portable (REFERENCE.md provides menu/schema templates).
- **Key design principle:** Never writes MASTER_DEBT.jsonl directly — all mutations
  go through staging files, then existing scripts apply. CL verification at every mode.

---

### 11. `audit-enhancements` — SONASH-ONLY (not ported)

- **SoNash version:** 1.2 (2026-02-23)
- **Files:** SKILL.md only
- **Size:** 17,871 bytes
- **Port status:** Not ported. Depends on TDMS pipeline + SoNash product context.
- **Critical agent type distinction:** Phase 1 agents MUST be `"general-purpose"` NOT
  `"Explore"`. Explore is read-only and cannot write JSONL output files. This is a
  documented trap in the SKILL.md.
- **Unique:** Phase 2 is OPT-IN after user sees Phase 1 results. Mandatory
  counter_argument field for every finding — the skill explicitly guards against
  AI confirmation bias.
- **Recovery domain:** Agents 2-3 have special sensitivity flags for SoNash's
  therapeutic content domains — must be removed on any port.
- **SKIP_AUDIT_VALIDATION=1** escape hatch: enhancement audit JSONL uses a different
  schema that fails SoNash's standard pre-commit audit validator.

---

### 12. `audit-documentation` — SONASH-ONLY (not ported)

- **SoNash version:** 2.2 (2026-02-24)
- **Files:** SKILL.md + prompts.md
- **Size:** 16,531 bytes
- **Port status:** Not ported. Depends on TDMS pipeline.
- **Architecture:** SKILL.md is orchestration-only; all 18 agent prompts, JSONL
  schemas, and report templates live in prompts.md (extracted at v2.2 to keep SKILL.md
  under 500 lines). A port must carry both files.
- **18 agents across 6 stages:** Most comprehensive agent count in this tier. Stage 2B
  (external URL checker) is broadly useful for any project with documentation.
- **Context recovery:** State file keyed by audit date: `.claude/state/audit-documentation-<date>.state.json`.

---

### 13. `developer-growth-analysis` — SONASH-ONLY (not ported, blocked on Rube MCP)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md only
- **Size:** 16,357 bytes
- **Port status:** Not ported. Hard dependency on Rube MCP (proprietary service) for
  both HackerNews search (Step 5) and Slack DM delivery (Step 7). Without Rube MCP,
  the skill's two output channels are non-functional.
- **Scope: user** — reads personal coding history from `~/.claude/history.jsonl`.
  Cross-locale concern but technically portable if the file exists.
- **Thin protocol:** No phases, guard rails, compaction resilience, or invocation
  tracking. Heavily narrative skill.
- **Rube MCP calls:** `RUBE_SEARCH_TOOLS`, `RUBE_MULTI_EXECUTE_TOOL`,
  `RUBE_MANAGE_CONNECTIONS` — these are the SoNash-specific external service calls.
  Not listed in `.claude/mcp.json` (would need to check D17 for MCP config).

---

### 14. `audit-aggregator` — SONASH-ONLY (not ported)

- **SoNash version:** 1.6 (2026-02-24)
- **Files:** SKILL.md + examples.md
- **Size:** 16,150 bytes
- **Port status:** Not ported. Downstream consumer of the full 9-audit comprehensive
  pipeline; depends on TDMS 5-step post-audit checklist.
- **Architecture:** Orchestration-only SKILL.md + examples.md (dedup code, merge
  examples, formula weights). Examples.md extracted at v1.6.
- **Cross-domain insight:** The deduplication and cross-domain pattern detection logic
  (file:line grouping, domain overlap detection, priority ranking formula) is broadly
  reusable for any multi-audit synthesis problem.
- **Partial input guard:** If fewer than 5 of 9 reports present, skips TDMS intake
  and marks output as PARTIAL.

---

### 15. `session-begin` — PORTED (JASON-OS v2.1 > SoNash v2.0)

- **SoNash version:** 2.0 (2026-03-16) | **JASON-OS version:** 2.1 (2026-04-17)
- **Files:** SKILL.md + REFERENCE.md (flat layout) — both SoNash and JASON-OS
- **Size:** 14,223 bytes (SoNash)
- **Port status:** Ported. Unusual: JASON-OS is v2.1 while SoNash is v2.0 — the port
  received a version bump for bootstrap-specific DEFERRED marker additions.

**SoNash LIVE vs JASON-OS live:**

| Section | SoNash | JASON-OS v2.1 |
|---|---|---|
| Duplicate detection | LIVE | LIVE |
| Session counter increment | LIVE | LIVE |
| SESSION_CONTEXT.md load | LIVE | LIVE |
| Branch validation | LIVE | LIVE |
| Stale docs check | LIVE | LIVE |
| Phase 1.1 Secrets decryption | LIVE | DEFERRED |
| Phase 1.2 Cross-session validation | LIVE (hook) | DEFERRED |
| Phase 2.4 Session gap detection | LIVE (npm script) | DEFERRED |
| Phase 2.5 Consolidation status | LIVE (hook) | DEFERRED |
| Phase 2.6 Prior research surface | SHOULD | DEFERRED |
| Phase 3: All 8 health scripts | LIVE | DEFERRED (entire phase) |
| Phase 4.1 Override/health trend | LIVE | DEFERRED |
| Phase 4.2 Warning gate | LIVE | PARTIAL (hook-warnings-log.jsonl check only) |
| Phase 4.3 Infra failure gate | LIVE | DEFERRED |
| Phase 4.4 Tech debt snapshot | SHOULD | DEFERRED |
| Goal selection | LIVE | LIVE |

**8 SoNash health scripts absent in JASON-OS:**
`patterns:check`, `review:check`, `lessons:surface`, `session:gaps`,
`roadmap:hygiene`, `reviews:lifecycle`, `hooks:analytics`, `run-github-health.js`

Note: `scripts/velocity/` references were removed from SoNash in commit `7e74fada`
(alerts:full consolidation) — this is annotated directly in the SoNash SKILL.md itself,
indicating the skill tracks its own infra cleanup history.

---

### 16. `audit-security` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md only
- **Size:** 13,223 bytes
- **Port status:** Not ported. Parallel architecture: 4 agents. Agents 2-3 are
  deeply Firebase/Next.js-specific. Agent 1 (auth/input validation) and the AI
  security patterns domain are broadly portable.
- **Notable portable element:** Domain 12/13 'AI Security Patterns' specifically
  targets `.claude/` configs for prompt-injection surfaces, hallucinated security APIs,
  and AI-suggested insecure defaults. This is universally applicable to any Claude
  Code project including JASON-OS itself.
- **Unique frontmatter:** `supports_parallel`, `fallback_available`,
  `estimated_time_parallel`, `estimated_time_sequential` — matches other audit-* skills.

---

### 17. `audit-refactoring` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-02-25)
- **Files:** SKILL.md only
- **Size:** 12,398 bytes
- **Port status:** Not ported. 3-agent parallel. Agents target Next.js/React dirs
  (app/, components/, lib/, hooks/). SonarCloud baseline references are
  SoNash-specific (778 total issues, 47 CRITICAL cognitive complexity).
- **Notable portable element:** God-object threshold (>300 lines), function complexity
  (>50 lines), circular dependency detection via `npm run deps:circular` — all
  framework-agnostic. These patterns apply directly to JASON-OS's scripts/ infrastructure.
- **Step 2 baseline includes hardcoded SoNash metric:** "47 CRITICAL as of 2026-01-05
  baseline" — must be reset for any port.

---

### 18. `data-effectiveness-audit` — SONASH-ONLY (not ported)

- **SoNash version:** 1.0 (2026-03-13)
- **Files:** SKILL.md only
- **Size:** 12,259 bytes
- **Port status:** Not ported. Depends on 6 SoNash-specific scripts and the
  lifecycle-scores.jsonl state bootstrap.
- **Most portable element:** The lifecycle scoring framework (Capture/Storage/Recall/
  Action, 0-3 each, 0-12 total, A-F grades) is a reusable analytical model for any
  project's data systems. The 8 audit domains are broadly applicable.
- **Bootstrap requirement (Critical Rule 1):** MUST read lifecycle-scores.jsonl first —
  skill has no entry point without prior bootstrapping of the scoring state.
- **Learning-to-automation pipeline:** Phase 5 routes gaps through
  `scripts/route-lifecycle-gaps.js` → `scripts/route-enforcement-gaps.js` — SoNash-
  specific enforcement pipeline that would need full reimplementation.

---

## JASON-OS Version Delta Summary

| Skill | SoNash Version | JASON-OS Version | Delta |
|---|---|---|---|
| deep-plan | 3.3 | 3.0 | 3 minor versions behind (behavioral only) |
| brainstorm | 1.1 | 1.0 | 1 minor version behind (behavioral only) |
| todo | 1.2 | 1.2 | IN SYNC |
| session-begin | 2.0 | 2.1 | JASON-OS ahead (bootstrap DEFERRED markers) |
| session-end | 2.2 | 2.2-jasonos-v0.1 | Same base, major Phase 3 stripped |
| code-reviewer | 2.2 | SKILL.md only | Companion files absent |
| debt-runner | 1.1 | NOT PORTED | Blocked on TDMS infra |
| All audit-* | various | NOT PORTED | SoNash-only |
| webapp-testing | 1.0 | NOT PORTED | Python infra not in JASON-OS |
| ux-researcher-designer | 1.0 | NOT PORTED | SoNash product scope |
| ui-design-system | 1.0 | NOT PORTED | Python + brand-specific |
| developer-growth-analysis | 1.0 | NOT PORTED | Rube MCP dependency |
| data-effectiveness-audit | 1.0 | NOT PORTED | SoNash infra pipeline |

---

## Session-Begin/Session-End: SoNash-Live vs JASON-OS-Deferred Comparison

### session-begin

**SoNash has LIVE, JASON-OS has DEFERRED:**
- Secrets decryption gate (scripts/secrets/decrypt-secrets.js)
- SessionStart hook cross-session validation
- Session gap detection (npm run session:gaps)
- Consolidation status (scripts/run-consolidation.js)
- Prior research surface (.research/research-index.jsonl)
- All 8 health scripts (patterns:check, review:check, lessons:surface, session:gaps, roadmap:hygiene, reviews:lifecycle, hooks:analytics, run-github-health.js)
- Cross-document dependency check (npm run crossdoc:check)
- Task dependency resolver (scripts/tasks/resolve-dependencies.js)
- Override trend analysis (.claude/override-log.jsonl)
- Health score drop detection (.claude/state/health-score-log.jsonl)
- Warning acknowledgment gate (partially — JASON-OS checks hook-warnings-log.jsonl only)
- Infrastructure failure gate (session-start-failures.json, pending-test-registry.json)
- Technical debt snapshot (docs/technical-debt/INDEX.md S0/S1 counts)

**JASON-OS LIVE (foundation):**
Duplicate detection, session counter increment, SESSION_CONTEXT.md load, branch validation, stale docs check (via git log), hook-warnings-log.jsonl check (10+ entries), goal selection, closure signal.

### session-end

**SoNash has LIVE, JASON-OS has DEFERRED or STRIPPED:**
- Phase 3 entire: reviews:sync, ecosystem-health snapshot, TDMS debt consolidation, TDMS metric generation
- Step 4b: agent-invocations.jsonl summary (Layer 2 hook output)
- Step 4c: decisions.jsonl / changelog.jsonl (.planning/system-wide-standardization/)
- Step 5: override audit (scripts/log-override.js)
- Step 5b: hook learning synthesizer (override-log, hook-warnings-log, health-score-log)
- Step 6: npm run hooks:health -- --end
- Step 7g: commit analytics (commit-log.jsonl)
- SESSION_HISTORY.md archival (SoNash: 3-session rolling window to docs/)

**JASON-OS LIVE (foundation):**
Duplicate detection, session work review (git log), SESSION_CONTEXT.md update (5-field contract per D12), plan file check, state file cleanup (Steps 8-10), pre-commit summary, final commit via node scripts/session-end-commit.js, learning loop.

---

## Audit-* Family Taxonomy

The audit-* skills in this tier form a coherent ecosystem:

| Skill | Stage | Purpose | Agent Count | Portability |
|---|---|---|---|---|
| audit-ai-optimization | single-session | AI infra efficiency (12 domains) | 11 | sanitize-then-portable |
| audit-enhancements | single-session | What could be better (8 domains) | 8+ | sanitize-then-portable |
| audit-documentation | single-session | Doc quality/lifecycle (6 stages) | 18 | sanitize-then-portable |
| audit-security | single-session | Security (12 categories) | 4 | sanitize-then-portable |
| audit-refactoring | single-session | Code structure (5 categories) | 3 | sanitize-then-portable |
| audit-aggregator | post-audit | Synthesize 9 domain audits | 0 (sequential) | sanitize-then-portable |

**Shared infrastructure dependencies:**
- `_shared/AUDIT_TEMPLATE.md` (shared protocol: evidence requirements, dual-pass, TDMS intake)
- `scripts/debt/intake-audit.js` (TDMS pipeline — blocking dependency for portability)
- `docs/technical-debt/FALSE_POSITIVES.jsonl` (false positive filter)
- `mcp__plugin_episodic-memory` (pre-audit context search — SoNash-specific MCP)
- `AUDIT_TRACKER.md` (threshold tracking — audit trigger conditions)
- `docs/audits/` output path structure

**Common non-portable elements across all audit-* skills:**
1. `_shared/AUDIT_TEMPLATE.md` — must be ported or reimplemented
2. TDMS intake pipeline (`scripts/debt/intake-audit.js`)
3. `mcp__plugin_episodic-memory` MCP calls
4. SoNash-stack-specific agent file scopes (app/, components/, Firebase, Next.js)
5. Output paths (`docs/audits/single-session/{domain}/audit-YYYY-MM-DD/`)

**Common portable elements:**
1. Agent architecture patterns (parallel waves + sequential synthesis)
2. JSONL finding schema (category, title, fingerprint, severity S0-S3, effort E0-E3, confidence, files, why_it_matters, suggested_fix, acceptance_tests)
3. Severity calibration model
4. Pre-audit validation steps (check thresholds, load false positives, verify output dir)
5. Sequential fallback mode when Task tool unavailable
6. Checkpoint format for context recovery

---

## `skills: [sonash-context]` Usage on This Tier

Frontmatter `skills:` field (D2a surface — context_skills[]) analysis across the 18 skills in this tier: **none of the 18 skills use the `skills:` frontmatter field**. All skills in this tier use `name:` and `description:` as the standard frontmatter fields. The `skills:` field observed in D2a agents (which declares which skills the agent operates within) does not appear in SKILL.md frontmatter for this tier.

Unique frontmatter extensions found in audit-* skills: `supports_parallel: true/false`, `fallback_available: true/false`, `estimated_time_parallel: N min`, `estimated_time_sequential: N min`. These are not part of the core schema and belong in `notes`.

---

## Learnings for Methodology

1. **Version direction can be inverted.** JASON-OS session-begin is v2.1 while SoNash
   is v2.0 because bootstrap-specific DEFERRED markers incremented the version in
   JASON-OS. Future agents should not assume SoNash is always the higher version.

2. **Companion file completeness varies within a single port.** code-reviewer is
   "ported" but only SKILL.md traveled — 3 reference docs and 3 Python scripts are
   absent. The JSONL `active_scripts` field caught this because scripts are listed but
   absent in JASON-OS. Recommendation: D22 should define a `companion_ported` boolean
   or per-file list for partial ports.

3. **prompts.md extraction pattern.** audit-documentation and audit-aggregator both
   extract agent prompts to companion .md files (prompts.md, examples.md) to stay
   under 500 lines. The SKILL.md becomes orchestration-only. This affects how a synth
   agent must fetch skill content — reading SKILL.md alone is insufficient; must also
   read prompts.md/examples.md. `reference_layout: flat` covers this case but the
   semantic distinction (prompts vs reference) is lost.

4. **Audit-* frontmatter schema extensions.** Five audit skills use non-standard
   frontmatter (`supports_parallel`, `fallback_available`, `estimated_time_*`). These
   are useful metadata but undeclared in SCHEMA_SPEC.md. Recommend D22 add these as
   optional fields in the skill category extension (Section 3A).

5. **Rube MCP is a hard portability blocker.** developer-growth-analysis depends on
   Rube MCP for both HackerNews search and Slack delivery. Rube MCP is not documented
   in the MCP config visible to D-agents — D17 should flag it if present in
   `.claude/settings.json` or mcp.json.

6. **Early-bootstrap skill signature.** webapp-testing, ux-researcher-designer,
   ui-design-system, developer-growth-analysis, audit-security, audit-refactoring all
   share: version 1.0, date 2026-02-25, thin SKILL.md protocol (no phases, no guard
   rails, no compaction resilience, no invocation tracking). These appear to be from
   the same early-bootstrap creation batch. This is a reliable signal for identifying
   skills that predate the standardized SKILL_STANDARDS.md protocol.

7. **debt-runner portability requires a TDMS prerequisite.** It cannot be
   sanitize-then-portable until TDMS infrastructure lands in JASON-OS. The correct
   classification is not-portable today, with a forward note that it upgrades to
   sanitize-then-portable once TDMS arrives. Future schema might benefit from a
   `portability_condition` field.

8. **Invocation tracking as portability signal.** All SoNash skills in this tier that
   have mature protocol (v1.0+ with phases/guard rails) include `cd scripts/reviews &&
   npx tsx write-invocation.ts`. JASON-OS ports systematically omit this. D22 could
   use presence/absence of write-invocation.ts to flag "ported vs SoNash-native" more
   reliably than version number alone.

9. **DEFERRED section naming convention is informal.** JASON-OS session-begin marks
   sections DEFERRED with prose annotations like `### Phase 1.1 Secrets Decryption
   Check (DEFERRED)`. There is no machine-readable DEFERRED tag in the JSONL yet.
   The `deferred_sections` array I'm emitting captures the section names as strings,
   which is usable but informal. D22 should standardize the deferred section naming
   convention.

10. **Agent type note on Explore vs general-purpose.** audit-enhancements has an
    explicit CRITICAL note: Explore agents are READ-ONLY and cannot write JSONL output
    files — use general-purpose instead. This is a practical gotcha not obvious from
    the agent name. Worth flagging in the D2a agent inventory for Explore agents.

---

## Gaps and Missing References

1. **Rube MCP configuration:** developer-growth-analysis references Rube MCP
   (`RUBE_SEARCH_TOOLS`, `RUBE_MULTI_EXECUTE_TOOL`) but I did not locate a Rube MCP
   config in `.claude/settings.json` or mcp.json during this scan. D17 should verify
   whether Rube MCP is actually configured in SoNash.

2. **_shared/AUDIT_TEMPLATE.md not read:** This shared library is referenced by
   audit-ai-optimization, audit-enhancements, audit-documentation, audit-security,
   audit-refactoring. I did not read it in this pass. D1b or a separate agent should
   inventory `_shared/` — it is the load-bearing shared protocol for all audit-*
   skills.

3. **mcp__plugin_episodic-memory:** Multiple audit-* skills reference this MCP for
   pre-audit context search. Not confirmed whether this is a real MCP server or an
   in-house SoNash plugin. D17 should identify it in the MCP config.

4. **`.research/EXTRACTIONS.md` and `.research/extraction-journal.jsonl`:** Referenced
   by both deep-plan and brainstorm Phase 0. Not present in JASON-OS. D14 (research
   session scanner) should flag these as SoNash-specific artifacts if they exist.

5. **`audit-comprehensive` parent skill:** audit-aggregator references
   `audit-comprehensive` as its parent orchestrator. This skill was not in my assigned
   18 — D1b or D1c likely covers it. Should be verified as the top-level audit
   orchestrator that calls all 9 domain audits.

6. **code-reviewer companion scripts not verified:** references/code_review_checklist.md,
   references/coding_standards.md, references/common_antipatterns.md were listed via
   `ls` but not read. Full content scan of these reference docs would be needed to
   assess portability depth.

7. **session-end JASON-OS scripts/session-end-commit.js:** JASON-OS uses
   `node scripts/session-end-commit.js` instead of `npm run session:end`. This script
   was not inventoried in this pass — D6/D7 (scripts inventory) should capture it.

---

## Confidence Assessment

- All 18 skills fully read from SKILL.md source
- JASON-OS comparison done for 7 ported skills (deep-plan, brainstorm, todo, session-begin, session-end, code-reviewer, debt-runner)
- Port status verified via direct filesystem ls checks
- Companion file inventory verified via ls
- Version numbers extracted directly from frontmatter and Version History tables
- Agent types extracted from explicit Task() calls in SKILL.md bodies
- Active scripts extracted from inline bash blocks and Invocation Tracking sections
