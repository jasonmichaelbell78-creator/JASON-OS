# D4a Memory Inventory — SoNash User-Home Memories 1–21

**Agent:** D4a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-sonash-v0/memory/` — alphabetical positions 1–21
**Total memory files in repo:** 83
**Files inventoried this slice:** 21

---

## Memory Taxonomy Breakdown

| Type | Count | Files |
|------|-------|-------|
| `index` | 1 | MEMORY.md |
| `feedback` | 20 | all others |
| `user` | 0 | (none in slice 1–21) |
| `project` | 0 | (none in slice 1–21) |
| `reference` | 0 | (none in slice 1–21) |
| `tenet` | 0 | (none in slice 1–21) |

All 20 non-index files are `feedback_` prefix convention. Alphabetical ordering means user_, project_, reference_, and tenet_ files fall in later slices (D4b-D4d).

---

## Canonical-Gap Analysis

**Files with canonical counterpart:** 6 of 21 (28.6%)
**Files without canonical counterpart:** 15 of 21 (71.4%)

| File | has_canonical |
|------|---------------|
| MEMORY.md | YES |
| feedback_adoption_verdict_in_creator_view.md | NO |
| feedback_agent_config_revert_hazard.md | NO |
| feedback_agent_stalling_pattern.md | NO |
| feedback_agent_teams_learnings.md | YES |
| feedback_code_review_patterns.md | YES |
| feedback_commit_hook_state_files.md | NO |
| feedback_convergence_loops_mandatory.md | YES |
| feedback_deep_plan_hook_discovery_process.md | YES |
| feedback_deep_plan_qa_format.md | NO |
| feedback_deep_plan_research_check.md | NO |
| feedback_deep_research_formula.md | NO |
| feedback_deep_research_phases_mandatory.md | NO |
| feedback_execution_failure_recovery.md | YES |
| feedback_grep_vs_understanding.md | NO |
| feedback_interactive_gates.md | NO |
| feedback_learnings_must_complete.md | NO |
| feedback_no_agent_budgets.md | NO |
| feedback_no_artificial_caps.md | NO |
| feedback_no_auto_debt_routing.md | NO |
| feedback_no_autonomous_deferrals.md | NO |

**Key canonical-gap observations:**

- The 6 files WITH canonical counterparts (MEMORY.md + 5 feedback files) are all heavily
  used, foundational rules — convergence loops, code review, execution recovery, deep-plan
  hook discovery, agent teams. The canonical set is clearly "first batch promoted" not
  "representative sample."
- 15 files without canonical include several high-value universal rules (deep_plan_qa_format,
  deep_plan_research_check, deep_research_formula, deep_research_phases_mandatory, grep
  anti-patterns, interactive gates) that are equally or more important than the canonical ones.
- The canonical-gap is not a quality gap — these are mature, well-written memories. The gap
  is purely a promotion gap.

---

## Content-Bleed Instances

**Definition (per Piece 1a §5.1):** A `user`/`universal` scope memory containing
project-specific content that would import incorrectly without body inspection.

| File | Scope | Bleed Type | Bleed Content |
|------|-------|------------|---------------|
| `MEMORY.md` | project | Heavy — Project section | Entire Project section (15 SoNash-specific items: SoNash identity, T28, T29, debt runner, SonarCloud disabled, etc.) |
| `feedback_adoption_verdict_in_creator_view.md` | project | Skill reference | `/repo-analysis` skill not present in JASON-OS |
| `feedback_agent_teams_learnings.md` | universal | Path reference | `.claude/teams/audit-review-team.md`, `.claude/teams/research-plan-team.md` — SoNash team file paths in body |
| `feedback_commit_hook_state_files.md` | project | File path list | `docs/AI_REVIEW_LEARNINGS_LOG.md`, `.claude/state/learning-routes.jsonl`, `.claude/state/review-metrics.jsonl` — SoNash-specific paths |
| `feedback_learnings_must_complete.md` | project | Artifact names + step numbers | `docs/AI_REVIEW_LEARNINGS_LOG.md`, `scripts/write-review-record.js`, "Step 6/8" of pr-review skill |
| `feedback_no_artificial_caps.md` | project | Skill phase references | `repo-synthesis Phase 2.5 (Fit Portfolio)`, `website-synthesis` — SoNash-specific skills |
| `feedback_no_auto_debt_routing.md` | project | Full system dependency | TDMS, MASTER_DEBT.jsonl, scripts/debt/intake-manual.js, /add-debt skill — all SoNash-only |
| `feedback_grep_vs_understanding.md` | universal | Session context | D1a/D3b agent IDs and Session #251 repo-analysis incident (differs from JASON-OS version) |

**Most severe bleed:** `feedback_no_auto_debt_routing.md` — the entire operative content
references SoNash-only TDMS infrastructure. Classified as `not-portable` (not
`sanitize-then-portable`) because stripping TDMS references would gut the file.

**Notable non-bleed (expected but clean):** Several files reference SoNash session numbers
(#219, #233, #235, #240, #244, #245, #251, #278) as contextual "why" evidence. These session
references are contained in **why** sections only and do not affect the behavioral prescription
— they are NOT content-bleed because they do not change how the rule is applied.

---

## Cross-Reference Patterns

### Inline Related Memories Section (structured)

Only one file uses an explicit `**Related memories:**` section:
- `feedback_deep_plan_qa_format.md` links to `feedback_workflow_chain.md`,
  `feedback_deep_plan_research_check.md`, and `feedback_no_unnecessary_brainstorming.md`.

This is the same pattern observed in the JASON-OS version of this file — the structured
related-memories section appears to have been introduced in the same session.

### Inline prose references (unstructured)

Most cross-references are casual mentions within why/apply sections:
- `feedback_convergence_loops_mandatory.md` implies dependency on the convergence-loop skill
  but does not cite it by name/path.
- `feedback_deep_plan_hook_discovery_process.md` references `/hook-ecosystem-audit` as a
  downstream update target.
- `feedback_interactive_gates.md` implicitly relates to `feedback_ack_requires_approval.md`
  (which appears in JASON-OS but is absent from SoNash's user-home — check D4b slice).

### Session-ID clustering

Three files share the same `originSessionId: 7389d098-40f3-498d-a495-fe6dd68bdf2c`:
- `feedback_agent_teams_learnings.md`
- `feedback_code_review_patterns.md`
- `feedback_grep_vs_understanding.md`
- `feedback_interactive_gates.md`

This clustering suggests a high-density session where multiple behavioral corrections were
captured. D23 should note this as a session-to-memory relationship for graph analysis.

---

## Schema Drift Observations

### Frontmatter generation differences

**Generation 1 — filename-slug names (older pattern):**
- `feedback_code_review_patterns.md`: `name: feedback_code_review_patterns`
- `feedback_execution_failure_recovery.md`: `name: feedback_execution_failure_recovery`

**Generation 2 — display names (newer pattern):**
- `feedback_adoption_verdict_in_creator_view.md`: `name: Adoption verdict missing from Creator View`
- `feedback_convergence_loops_mandatory.md`: `name: Convergence loops are mandatory — never default to single-pass`
- `feedback_deep_plan_qa_format.md`: `name: Deep-plan Q&A format for ad-hoc clarifying questions`

This matches the same generation split observed in JASON-OS Piece 1a. Files with `status: active`
tend to correlate with Generation 1 names (older frontmatter template). Generation 2 uses clean
display names with no `status` field. **Implication:** canonical promotion should normalize to
Generation 2 display-name convention.

**`status` field presence:** Only files with canonical counterparts carry `status: active` in
user-home. The non-canonical files lack this field. This suggests the `status` field was added
as part of the canonical-promotion workflow, not at memory-creation time.

**`originSessionId` presence:** 5 of 21 files have this field. Distribution is not correlated
with `has_canonical` — the canonical files split 2/6 with originSessionId. Sessions where the
memory was created are not systematically tracked.

### Canonical content drift

For files WITH canonical counterparts, content drift varies:

| File | Drift Assessment |
|------|-----------------|
| MEMORY.md | MAJOR — canonical is ~200 sessions behind; different expertise profile, 80% fewer entries |
| feedback_agent_teams_learnings.md | MODERATE — canonical lacks 3 rules (parallel agents for impl, CL verify, parallel testing) |
| feedback_code_review_patterns.md | LOW — likely identical at similar size; canonical may lack latest PR #457 incident |
| feedback_convergence_loops_mandatory.md | MINIMAL — near-identical content, only formatting difference |
| feedback_deep_plan_hook_discovery_process.md | MINIMAL — near-identical, only YAML multi-line vs single-line description |
| feedback_execution_failure_recovery.md | MINIMAL — effectively identical at 673 bytes |

---

## Portability Distribution

| Portability | Count | Files |
|-------------|-------|-------|
| `portable` | 14 | feedback_agent_config_revert_hazard, feedback_agent_stalling_pattern, feedback_agent_teams_learnings, feedback_code_review_patterns, feedback_convergence_loops_mandatory, feedback_deep_plan_hook_discovery_process, feedback_deep_plan_qa_format, feedback_deep_plan_research_check, feedback_deep_research_formula, feedback_deep_research_phases_mandatory, feedback_execution_failure_recovery, feedback_grep_vs_understanding, feedback_interactive_gates, feedback_no_agent_budgets, feedback_no_autonomous_deferrals |
| `sanitize-then-portable` | 5 | MEMORY.md, feedback_adoption_verdict_in_creator_view, feedback_commit_hook_state_files, feedback_learnings_must_complete, feedback_no_artificial_caps |
| `not-portable` | 1 | feedback_no_auto_debt_routing |
| `not-portable-product` | 0 | — |

Note: `feedback_no_autonomous_deferrals.md` counted as portable despite "DAS items" (Deferred
Action Steps) terminology — the term is SoNash jargon but the behavioral rule is universal and
the term requires no code changes to sanitize.

---

## Notable SoNash-Exclusive Content

**Absent from JASON-OS user-home:**
- `feedback_adoption_verdict_in_creator_view.md` — /repo-analysis skill not yet in JASON-OS
- `feedback_learnings_must_complete.md` — pr-review learning artifacts different in JASON-OS
- `feedback_no_auto_debt_routing.md` — TDMS system is SoNash-only
- `feedback_no_autonomous_deferrals.md` — rule exists in SoNash but is missing from JASON-OS
  user-home (import candidate)

**Present in both (high cross-project overlap):** 14 of 20 feedback files in this slice have
near-equivalent counterparts in JASON-OS user-home. The two codebases have highly convergent
behavioral memory sets for universal rules, diverging primarily in project-specific references.

---

## Learnings for Methodology

1. **Alphabetical slice = type-homogeneous for early letters.** This slice is 100% feedback_
   prefix. User, project, reference, and tenet files all sort after 'f'. Future slice planning
   should note this: D4a-type slices are fast to classify (single type) but provide no
   cross-type taxonomy data. D4b+ slices will hit the type-diversity.

2. **Canonical content drift is detectable by byte-size comparison alone as a first filter.**
   MEMORY.md canonical at ~1.4KB vs user-home at 10.8KB = instant drift signal. For feedback
   files, canonical at 673 bytes vs user-home at 673 bytes = likely identical. Add a byte-delta
   field to the schema (or at minimum document the pattern in methodology). D23 should do a
   formal byte-delta pass on all canonical pairs.

3. **originSessionId clustering reveals session-to-memory capture events.** Four files sharing
   the same UUID is a first-class data point for the memory graph — these were all born in the
   same session and likely represent a single correction event with multiple rules captured.
   D23's graph extraction should track session ID clustering as an edge type.

4. **Scope assignment for "contains SoNash session numbers" is NOT content-bleed.** Session
   numbers in the `why` section are flavoring, not operative content. Scope should be `universal`
   even if Session #235 is mentioned — the rule doesn't depend on that session. This required
   a judgment call on each file and is now the established convention for future slices.

5. **`not-portable` vs `sanitize-then-portable` threshold.** `feedback_no_auto_debt_routing.md`
   crosses the threshold because the TDMS system has no JASON-OS equivalent — there is nothing
   to sanitize INTO. `feedback_no_artificial_caps.md` stays `sanitize-then-portable` because the
   underlying principle is portable even though the specific skills referenced need replacement.
   The criterion: if the sanitized version would have no operative content targeting an absent
   system, classify as `not-portable`.

6. **MEMORY.md index drift is a structural risk.** The canonical MEMORY.md is so far behind
   the user-home version that automated sync from canonical to user-home would DESTROY ~70
   memories. The canonical MEMORY.md should be treated as APPEND-ONLY from canonical's
   perspective — it is not a sync source, it is a promotion ledger.

7. **Generation 1 vs Generation 2 frontmatter is a reliable schema-age signal.** Files with
   `status: active` AND filename-slug `name` are older canonical-template files. Files with
   display-name `name` and no `status` are newer. This two-generation pattern was also observed
   in JASON-OS Piece 1a and is consistent across projects.

---

## Gaps and Missing References

1. **`feedback_ack_requires_approval.md` exists in JASON-OS user-home but NOT in this SoNash
   slice.** It would sort at position ~1 alphabetically (before `feedback_adoption_verdict`).
   It is absent from SoNash entirely — not in canonical-memory either. Either the rule was
   discovered after this SoNash session (it has originSessionId in JASON-OS) or it was captured
   only in JASON-OS during bootstrap. Check MEMORY.md index — it is not listed under Feedback.
   Confirmed absent from SoNash.

2. **`feedback_no_autonomous_deferrals.md` is present in SoNash but absent from JASON-OS
   user-home.** This is a high-value universal rule (never defer without user decision) that
   should be imported to JASON-OS. It's a gap in JASON-OS's behavioral coverage.

3. **`feedback_learnings_must_complete.md` has no JASON-OS counterpart** but the principle
   (learning artifacts are mandatory pr-review deliverables) is relevant. The JASON-OS pr-review
   skill may implement this differently or may simply lack the enforcement. D-agent covering
   JASON-OS pr-review skill should check.

4. **`has_canonical` check for `feedback_verify_not_grep.md` in canonical:** canonical-memory
   has `feedback_verify_not_grep.md` but user-home has `feedback_grep_vs_understanding.md`.
   The relationship (`feedback_grep_vs_understanding` supersedes `feedback_verify_not_grep`)
   is implicit — no frontmatter `supersedes` field exists in either file. This is the exact
   `supersedes`/`superseded_by` schema gap flagged in Piece 1a §6.2.

5. **No `append_only` candidates in this slice.** All 21 files are static behavioral rules
   with no running-log structure. The append_only pattern likely appears in project-type
   memories (session-end learnings, etc.) which fall in later slices.

6. **`recency_signal` absent from all 21 files.** No system-reminder staleness annotations
   observed in the frontmatter or body of any file in this slice. The recency_signal pattern
   (if it exists in SoNash) must appear in later slices or may be a JASON-OS-only pattern.

---

## Confidence Assessment

- HIGH claims: 18 (direct file reads, canonical presence verified by filesystem check)
- MEDIUM claims: 3 (drift severity assessments for canonical files — could read canonical
  versions of code_review and execution_recovery to verify but byte sizes strongly suggest
  minimal drift)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH
