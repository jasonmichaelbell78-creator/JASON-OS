# D1b Skill Inventory: pre-commit-fixer through todo

**Agent:** D1b
**Date:** 2026-04-18
**Skills covered:** pre-commit-fixer, session-begin, session-end, skill-audit, skill-creator, todo
**Profile:** codebase (Read + Glob + Bash)

---

## Summary Table

| Name | scope_hint | portability_hint | Purpose (1-line) |
|------|-----------|-----------------|-----------------|
| pre-commit-fixer | universal | sanitize-then-portable | Diagnose and fix pre-commit hook failures via classify-fix-report-confirm workflow with user gates. |
| session-begin | project | sanitize-then-portable | Pre-flight checklist that loads session context, validates environment, surfaces warnings, and prompts for goal selection. |
| session-end | project | sanitize-then-portable | Session closure pipeline: update SESSION_CONTEXT.md, run compliance review, commit and push. |
| skill-audit | universal | portable | Interactive 12-category behavioral quality audit for individual skills, producing a decision record and implemented fixes. |
| skill-creator | universal | sanitize-then-portable | Structured discovery-through-audit workflow for creating or updating skills, producing SKILL.md + companion packages. |
| todo | universal | sanitize-then-portable | Cross-session todo management: 8-option menu, JSONL-backed persistence via a locked CLI, AI context capture. |

---

## Per-Skill Notes

### pre-commit-fixer (v2.0-jasonos-v0.1)

- Foundation-scoped: currently only gitleaks is wired. All other recipe categories (ESLint, Prettier, tsc, lint-staged, pattern-compliance, cognitive-complexity, etc.) are "armed but inactive" pending Post-Foundation Deferrals.
- No REFERENCE.md — everything in a single 288-line SKILL.md. Just under the 300-line limit.
- Portability: the workflow logic is universal but it targets `.husky/pre-commit` and references CLAUDE.md guardrails by number. SoNash port needs guardrail-number references updated and hook categories re-enabled.
- Deferred neighbors: `/systematic-debugging` and `/quick-fix` are referenced but not in JASON-OS.

### session-begin (v2.1)

- Phases 3 and most of Phase 4 are DEFERRED — health scripts, warning ack gate, infrastructure failure gate, and debt snapshot all pend Layer 2 hooks.
- Uses a REFERENCE.md (routing table, anti-patterns pointer). REFERENCE.md is short (58 lines).
- Scope classified as `project` because SESSION_CONTEXT.md 5-field contract and BOOTSTRAP_DEFERRED.md pointers are JASON-OS/SoNash conventions, not generic OS conventions.
- Portability: requires destination to have SESSION_CONTEXT.md with matching 5-field structure; DEFERRED markers need rewiring against destination infrastructure.

### session-end (v2.2-jasonos-v0.1)

- Phase 3 metrics pipeline stripped entirely. Phase 2 silently no-ops in v0.
- Hardcoded D33 plan target (`.planning/jason-os-mvp/PLAN.md`) — fragile if a second planning directory appears.
- Depends on `scripts/session-end-commit.js` (Node script, must exist and be wired).
- Learning loop writes to `memory/session-end-learnings.md` — canonical-first memory architecture (D27).
- Scope `project` for same reason as session-begin.
- Largest of the session-boundary pair (17 KB vs 10 KB).

### skill-audit (v3.1)

- Largest skill in this batch by size (65 KB total; SKILL.md is 599 lines, REFERENCE.md is 928 lines).
- The skill enforces a 300-line limit on OTHER skills but its own SKILL.md exceeds that. Intentional because of the 3-mode (single/batch/multi) complexity, but worth flagging for SoNash census.
- Three modes introduced in v4.0 per skill-audit-batch-mode plan (version field is 3.1 in frontmatter but 4.0 in version history — minor inconsistency).
- No JASON-OS-specific port suffix in version field, unlike pre-commit-fixer and session-end — likely ported without modification.
- `npm run skills:validate` not wired in JASON-OS v0; uses a manual structural check instead.
- Portable to SoNash as-is (no project-specific file refs), with one caveat: `scripts/skills/skill-audit/self-audit.js` must exist.

### skill-creator (v3.4)

- References multiple resources that appear absent from JASON-OS v0: `init_skill.py` (scaffold script, Phase 4.2), ROADMAP.md, `.research/EXTRACTIONS.md`, `.research/extraction-journal.jsonl`, `/create-audit` skill.
- References `docs/agent_docs/SKILL_AGENT_POLICY.md` — not verified in this scan.
- `npm run skills:validate` not wired (same as skill-audit).
- REFERENCE.md (55 KB total dir) carries the 12-item anti-pattern list, full content checklist, state file schema, and a minimal example skill.
- Portability: `sanitize-then-portable` — several referenced scripts/files are absent in v0 and will need resolution before use.

### todo (v1.2)

- Most operationally complete skill in this batch — actual Node.js scripts exist and are wired (todos-cli.js, render-todos.js, todos-mutations.js).
- T30 fix is the critical correctness guarantee: all mutations MUST route through the locked CLI to prevent data loss. Bypassing with Write/Edit tool reintroduces the T26/T27/T28 bug.
- References `/gsd:add-todo` (neighbor differentiation) — GSD system may not be present in SoNash or destination.
- References `/task-next` — not in JASON-OS skill inventory; likely SoNash-only or deferred.
- `.planning/todos.jsonl` path is hardcoded — projects with different layouts need adjustment.
- Portability: `sanitize-then-portable` because it requires the full scripts/planning/ ecosystem.

---

## Learnings for Methodology

### Agent sizing

Six skills read. Right-sized for one agent. The two large skills (skill-audit and skill-creator, each with substantial REFERENCE.md files) pushed reading time longer than the simpler skills (session-begin, pre-commit-fixer), but the total was manageable in a single pass. If skill-audit or skill-creator had additional companion files beyond REFERENCE.md (examples/, scripts/), this agent would have been at the edge of comfortable scope. Rule of thumb: 6 skills is fine when 4 are standard-sized; 6 skills where all have 500+ line REFERENCE.md files would require splitting.

Estimated vs actual time: estimated 20-25 min for 6 skills with REFERENCE.md reads; actual was consistent with that given the two large REFERENCE.md files.

### File-type observations

- All 6 skills follow the `SKILL.md` + optional `REFERENCE.md` pattern. No `examples/` subdirs, no `references/` subdirs, no `assets/` dirs.
- `todo` is the only skill with a `scripts/` subdirectory (but it was empty or not present under `.claude/skills/todo/scripts/` — the actual scripts live at the repo level under `scripts/planning/`). This means the `scripts/` anatomy described in skill-creator's REFERENCE.md (skill-local scripts) is not used in practice; scripts live at repo root.
- REFERENCE.md size varies dramatically: session-begin (58 lines), skill-creator (322 lines), skill-audit (928 lines). When scanning SoNash, REFERENCE.md line count is a better size signal than SKILL.md alone.
- One skill (pre-commit-fixer) had no REFERENCE.md at all despite being complex enough to warrant one.

### Classification heuristics

- The 5-scope enum (universal/user/project/machine/ephemeral) worked cleanly with one nuance: session-begin and session-end are conceptually universal (every project has sessions) but the specific artifact contracts (SESSION_CONTEXT.md 5-field format, BOOTSTRAP_DEFERRED.md, D33 plan target) make them `project`-scoped in practice. A `project-flavored-universal` sub-label would be useful for SoNash scanning — skills that are universal in intent but project-anchored in implementation.
- `machine` and `ephemeral` were not needed for any of these 6 skills.
- `user` was not applicable here either.
- The three portability values (portable/sanitize-then-portable/not-portable) covered every skill cleanly. No edge cases required a fourth category.

### Dependency extraction

Dependency extraction was moderately difficult. Dependencies appear in three forms: (1) explicit neighbor mentions in Integration sections (easy), (2) file path references buried in step descriptions (medium — requires reading every step), (3) implicit dependencies on scripts that are referenced by name but not linked (hardest — requires knowing repo layout). The `skill-creator` references to `init_skill.py` and `npm run skills:validate` are examples of form 3 that are easy to miss.

Pattern observed: skills with Phase 2.5 (Operational Dependency Check) in skill-audit's vocabulary tend to document dependencies better. Skills without such a phase (like pre-commit-fixer) bury dependency refs in step prose.

### Schema-field candidates

Beyond scope/portability, these attributes emerged as valuable for the census schema:

- `deferred_sections`: list of named phases/steps that are explicitly DEFERRED to future infrastructure. session-begin and session-end have significant deferred surfaces; knowing this upfront signals sync risk.
- `has_self_audit_phase`: boolean. skill-audit and skill-creator reference scripts/skills/*/self-audit.js; other skills don't. This signals a quality tier distinction.
- `version_lineage`: "upstream" vs "jason-os-port" vs "original". pre-commit-fixer and session-end carry lineage headers; skill-audit does not. Tracking lineage helps identify which JASON-OS skills are ports vs originals vs upstreams.
- `active_scripts`: list of Node/Python scripts actually invoked (not just referenced as neighbors). The todo skill invokes 2 scripts; session-end invokes 1; skill-audit invokes 1 (self-audit.js). This is more useful than `dependencies` for sync risk assessment.
- `state_files`: list of .json/.jsonl state files the skill reads/writes. Several skills have state schemas that need to travel with the skill — identifying them explicitly would aid schema design.
- `deferred_infrastructure`: list of systems the skill waits on (Layer 2 hooks, specific npm scripts, etc.). Distinct from `dependencies` because these are future-gated, not current requirements.

### Adjustments recommended for SoNash skill scan

SoNash has 81 skills. Specific adjustments:

1. **Split into 4-5 agent batches, not 2.** With 81 skills, even D1a/D1b's 6-skill split should scale to ~14-16 skills per agent (5-6 agents). But if SoNash has many large skills like skill-audit (65 KB), keep batches to 6-8 skills per agent to avoid reading fatigue.
2. **REFERENCE.md line count as a pre-filter.** Before assigning skills to agents, run `wc -l .claude/skills/*/REFERENCE.md` to identify outliers. Skills with REFERENCE.md > 500 lines should be assigned solo or in pairs.
3. **Prioritize reading SKILL.md first, REFERENCE.md second.** For census purposes, SKILL.md gives purpose/scope/portability; REFERENCE.md gives operational detail. If time-boxing is needed, SKILL.md is sufficient for most schema fields.
4. **Add `version_lineage` to the JSONL schema.** In JASON-OS, 3/6 skills have explicit SoNash lineage headers. SoNash likely has the inverse — many originals and some cross-project imports. Tracking this enables "what needs to come back to JASON-OS" analysis.
5. **Flag DEFERRED markers explicitly.** session-begin and session-end have substantial DEFERRED infrastructure. SoNash likely has the corresponding live implementations. A `deferred_sections` field in the JSONL lets Piece 2 schema design map "SoNash live" → "JASON-OS deferred" automatically.
6. **Check for scripts/ under each skill dir.** In JASON-OS, no skill has scripts/ under its own directory (scripts live at repo root). SoNash may differ. `ls .claude/skills/*/scripts/ 2>/dev/null` as a one-shot check before the scan would avoid per-skill Bash calls.
7. **Note `npm run` commands vs `node scripts/` directly.** JASON-OS v0 uses `node scripts/` directly because package.json scripts are not fully wired. SoNash likely uses `npm run`. This distinction matters for portability — capturing which invocation pattern a skill assumes would flag migration effort.
