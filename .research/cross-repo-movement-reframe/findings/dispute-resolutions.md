# Dispute Resolutions — cross-repo-movement-reframe

**Resolver:** dispute-resolver
**Date:** 2026-04-23
**Disputes resolved:** 5

---

## Resolution summary

| Dispute | Type | Verdict |
|---|---|---|
| 1 — Ledger field budget (C-001 vs C-008 vs C-010) | CONTRADICTION | 12-field cap stands at v1; source_status and source_content_hash demote to v1.1 candidates — NOT ignored, tracked explicitly |
| 2 — Context-sync inventory granularity (C-033) | SCOPE-MISMATCH | 18 sync-unit classifications confirmed; "18 categories" framing corrected to "18 sync units across ~12 category implementations" |
| 3 — Ledger sharding threshold (C-018) | METHODOLOGICAL | "~2,000 records" replaced by "~3,500 records at realistic sizes, ~2,600 at upper-bound estimate" — single file at launch still correct |
| 4 — Context-sync ledger inclusion (C-017 vs C-033) | CONTRADICTION | C-033 wins on evidence; ledger.jsonl must be added as explicit category 19 — planning is a one-line fix |
| 5 — Profile shape "3 fields per unit type" (C-026/C-028) | SCOPE-MISMATCH | 3-field count is correct as a schema spec; companion_files population algorithm is an unspecified gap, not a count error |

---

## Dispute 1 — Ledger field budget

**Claims in conflict:** C-001 (12 fields is sufficient for all four verbs), C-008 (forward pointer + content hash at port time is the edge model), C-010 (source_status is the resolution mechanism for repo-evolution events)

**Type classification:** CONTRADICTION — with a temporal undertone. D1 derived the 12-field set by bottom-up pruning from 15 candidates. D2 approached from the edge representation problem and independently concluded that source_content_hash and source_status are load-bearing for drift detection and repo-evolution tracking. Both agents are reasoning about the same v1 schema; their conclusions are structurally inconsistent when held together.

**Evidence weight applied:**

- D1 (12-field cap): DERIVED from codebase context (BRAINSTORM.md hard constraint cited, G.1 lesson cited) plus explicit pruning exercise. T1 codebase grounding (BRAINSTORM.md is the canonical user constraint).
- D2 (source_content_hash and source_status): DERIVED from external survey of SPDX, OpenLineage, git-subrepo, and Nix. These are T2 references used for inspiration, not T1 authority.
- V1 cross-claim Issue 4: "source_status introduces 13th field — these two claims are in tension." Verifier flagged this explicitly.
- Contrarian Challenge 1 (CRITICAL): The challenge correctly identifies that C-010 recommends source_status as "the resolution mechanism" for repo-evolution events — which is an operational requirement, not a nice-to-have. But the challenge also correctly notes that the cap's value is in preventing gold-plating, not in the specific number 12.
- Tiebreaker: The 12-field cap originates from a user-stated constraint in BRAINSTORM.md (T1). D2's additions are design enhancements from external-survey reasoning (T2-T3). T1 wins.

**Verdict:** The 12-field cap stands at v1. C-001 is the governing claim.

source_content_hash and source_status are NOT discarded — they are explicitly demoted to documented v1.1 minor-bump candidates with clear promotion criteria:
- source_status promotes to v1 if /sync-back's three-way diff implementation demonstrates that pointer resolution requires more than "scan all records for this source repo+path."
- source_content_hash promotes to v1 if the forward-pointer-only model proves insufficient for drift detection in practice (i.e., the orchestrator cannot identify "has the source changed?" without the stored hash).

The critical distinction the contrarian surfaced: without source_status in the record, orphan detection requires a full ledger scan every time any pointer fails to resolve. That cost is real but not prohibitive at JASON-OS's scale (hundreds of records, not millions). The scan-based fallback is acceptable for v1.

C-008's core recommendation (forward pointer + content hash as the edge model) remains valid — but "content hash at port time" at v1 is implemented as a scan-based drift check (recompute the source hash on demand), not as a stored field. This costs one file read per drift check; acceptable at JASON-OS scale.

**Rationale:** The 12-field cap exists because the G.1 lesson taught that schemas gold-plate toward infinity without a hard stop. D2's additions are functionally justified but are enhancements to the minimum viable set, not requirements for the minimum viable set. At v1 launch with zero ledger records and no implementation history, the simpler 12-field schema is the correct starting point. The v1.1 promotion criteria give planning a clear, testable decision gate rather than an indefinite deferral.

**Dissent record:**
- Losing position: C-010 and C-008 as written, both marked HIGH confidence, implying source_status and source_content_hash are v1 requirements.
- Why it lost: Both fields are recommended by D2 (external-survey-based, T2-T3 grounding). The user's BRAINSTORM.md 12-field hard cap is T1. D1's pruning exercise was explicitly conducted against the BRAINSTORM constraint. D2 did not have a mandate to override the cap — it had a mandate to design the edge model within it.
- Could revisit: If /sync-back implementation hits the wall on orphan detection (scan cost becomes noticeable at hundreds of records), promote source_status. If drift detection requires stored hash for performance reasons, promote source_content_hash. Both are planned, testable, reversible decisions.

**Action for /deep-plan:** Schema doc should list 12 fields for v1, with a dedicated "v1.1 candidates" subsection documenting source_status and source_content_hash with their promotion criteria. This is not a deferral — it is a documented design decision with a clear review gate.

---

## Dispute 2 — Context-sync inventory granularity

**Claims in conflict:** C-033 (18-category context-sync inventory is empirically confirmed), with tension from V2 (rows 1-3 are sub-types of one category, not 3 distinct categories) and from C-063 (zero files use type: tenet frontmatter, so the tenet row's classification mechanism does not work as described).

**Type classification:** SCOPE-MISMATCH — V2 and the contrarian are describing a different level of granularity than D9 intended. D9 counted 18 sync-unit classifications (the implementation units: each row tells the implementation what glob to walk and what filtering criteria to apply). V2 read "18 categories" as "18 distinct brainstorm-level categories with independent implementations." These are different things talking about the same table.

**Evidence weight applied:**

- D9 §7 table: direct filesystem walk (T1). The 18 rows are confirmed by direct codebase inspection. The rows are accurately counted.
- V2 adversarial check: also filesystem-based (T1). V2 confirmed all 18 rows are present and all 6 key additions are accounted for.
- C-063 (VERIFIED by V2 with HIGH confidence): zero files use type: tenet in frontmatter. This is a direct filesystem fact (T1).
- V2 conflict framing: "18 categories vs 18 sync units within fewer categories" — a framing dispute, not a count dispute.

**Verdict:** C-033's count of 18 is correct as a sync-unit count. The claim's framing as "18 categories" is imprecise.

Precise restatement: The /context-sync inventory contains 18 sync-unit classifications across approximately 12 distinct category implementations. Rows 1-3 (canonical memories split by frontmatter type: user, project, reference) share one directory glob (.claude/canonical-memory/*.md) with three filtering branches — they are one implementation, three classifications.

The tenet row (row 2) is a confirmed gap: the frontmatter-based classification mechanism (type: tenet) does not work today because no file uses that frontmatter value. The walk currently has two options for tenet identification: naming convention (t3_ prefix) or enum value. Planning must resolve which mechanism is authoritative before implementing the walk. The 18 count does not change — the tenet sync unit exists — but its implementation path is unresolved.

C-063 does not refute C-033; it surfaces a gap within a confirmed category.

**Rationale:** The 18 rows in D9 §7 are empirically grounded — each row was located on disk. The framing dispute is about the definition of "category" vs "sync unit." The correct resolution is to accept the more precise term (sync-unit classification) and carry forward the 18 count without inflation. The tenet identification gap is a planning issue within the confirmed inventory, not a reason to reduce the count.

**Dissent record:**
- Losing position: Reading C-033 as "18 fully independent implementation targets" requiring 18 separate directory globs.
- Why it lost: Rows 1-3 demonstrably share one source directory and one walk algorithm. The "18 categories" framing in C-033 is imprecise, not wrong in its count.
- Could revisit: If planning decides that user-type, project-type, and reference-type memories should be separated into distinct source directories (rather than sharing .claude/canonical-memory/), the 12-implementation count could rise toward 18.

**Action for /deep-plan:** Replace "18 categories" with "18 sync-unit classifications across ~12 category implementations" in all planning artifacts. Add an explicit open question: "Tenet identification mechanism — naming convention (t[N]_ prefix) or adopt type: tenet frontmatter universally and backfill existing tenets?" This must be resolved before the walk is implemented.

---

## Dispute 3 — Ledger sharding threshold

**Claims in conflict:** C-018 (approximately 2,000 records / 3-5 years before sharding needed) vs V1 measurement (commit-log records average ~586 bytes/record; at that rate the 2 MiB ceiling maps to ~3,500 records, not 2,000; the "3-5 years" estimate is ungrounded).

**Type classification:** METHODOLOGICAL — D3 used an inflated bytes/record estimate (800 bytes/record) when the actual JASON-OS state file data shows ~586 bytes/record for commit-log records. Both are using the same methodology (compare against DEFAULT_READ_MAX_BYTES = 2 MiB); the difference is in the input measurement.

**Evidence weight applied:**

- V1 direct filesystem measurement: commit-log.jsonl at 68 records, 39,813 bytes = 586 bytes/record. T1 (direct codebase measurement). This is the most authoritative input available.
- D3's estimate (800 bytes/record): Derived from reasoning about ledger record size ("~500-800 bytes"). The upper bound is plausible for a 12-field ledger record with longer paths; the lower bound (~500 bytes) is more realistic for short paths. The 800 figure was used as a ceiling estimate, not a typical-case estimate.
- safe-fs.js DEFAULT_READ_MAX_BYTES = 2 MiB: confirmed at line 265 by V1. T1.
- The "3-5 years" estimate (5 movements/session × 3 sessions/week = 780 records/year): pure assumption with no measurement. No usage-rate data exists pre-implementation.

**Verdict:** C-018's conclusion (single file at launch, year-based sharding if threshold approached) is correct. The specific number "approximately 2,000 records" is replaced by the more precise formulation:

- Upper bound: ~2,600 records before hitting the 2 MiB ceiling (at 800 bytes/record — the inflated estimate)
- Realistic bound: ~3,500 records before hitting the 2 MiB ceiling (at 586 bytes/record — measured)
- Likely ledger records: smaller than commit-log records (12 flat fields, shorter paths than commit messages) — the realistic bound may be 4,000+ records
- Practical mitigation: streamLinesSync removes the 2 MiB ceiling for streaming readers anyway, so the threshold applies only to readTextWithSizeGuard callers

The "3-5 years" estimate is explicitly flagged as ungrounded. It cannot be computed pre-implementation without usage-rate data.

**Rationale:** The methodological difference (inflated vs measured bytes/record) produces a significant difference in the threshold (2,000 vs 3,500+). The T1 measurement (V1's direct filesystem read) supersedes D3's derived estimate. The practical recommendation does not change — single file at launch is correct regardless of whether the threshold is 2,000 or 4,000 records.

**Dissent record:**
- Losing position: "approximately 2,000 records" as the sharding threshold.
- Why it lost: D3 used an inflated estimate for bytes/record. The T1 measurement from actual JASON-OS state files gives a lower bytes/record figure, which maps to a higher record count before the ceiling. The specific number 2,000 is directionally conservative (errs toward earlier sharding) but is not grounded in measurement.
- Could revisit: The 800 bytes/record estimate could be correct for ledger records if paths in the user's repos are long or if the verdict field includes detailed content. The ceiling is a soft boundary (streamLinesSync bypasses it for streaming). Year-based sharding is the right strategy if the threshold is approached; the specific trigger number is a calibration parameter, not a hard design constraint.

**Action for /deep-plan:** State the sharding threshold as a range ("approximately 2,600-4,000 records, depending on average record size") and tag it as a calibration parameter (ESTIMATED, not MEASURED). Do not embed 2,000 as a hard constant. The "3-5 years" estimate is dropped entirely — replace with "usage-rate dependent; revisit when ledger approaches 2,000 records."

---

## Dispute 4 — Context-sync ledger inclusion

**Claims in conflict:** C-017 (the ledger is synced by /context-sync, described as a user-scoped artifact included in its managed set — MEDIUM confidence, UNVERIFIABLE per V1) vs C-033 (the confirmed 18-category inventory does not list ledger.jsonl as a category — HIGH confidence, direct filesystem-based).

**Type classification:** CONTRADICTION — C-017 asserts a design decision (ledger is included in context-sync's managed set) that directly conflicts with the evidence base for C-033 (the inventory was derived by filesystem walk; ledger.jsonl was not found as a category and was not added). The two claims cannot both be correct as written: either the ledger is in the inventory (making C-033's 18 count 19), or it is not (making C-017's assertion unsupported).

**Evidence weight applied:**

- C-033 (18-category inventory): T1 — derived from direct filesystem walk by D9. The inventory was constructed empirically. ledger.jsonl is absent from the inventory as confirmed.
- C-017: T4 at best — "planning/architectural decision" per V1. V1 explicitly rated this UNVERIFIABLE: "/context-sync doesn't exist yet; ledger inclusion in managed set is an open design question." D3 gap 1 calls this out as unresolved.
- Contrarian Challenge 2: correctly identifies that ledger.jsonl missing from the inventory means the multi-machine use case "silently fails on first adoption of a third machine." The failure mode is real.

**Verdict:** C-033 wins. The current inventory does not include ledger.jsonl, and C-017's assertion is a planning recommendation that was never validated against the actual inventory design.

However: the contrarian is correct that this is a one-line fix. The verdict is not that the ledger should not be synced — it is that the current inventory omits it and planning must explicitly add it.

Resolution for the gap: ledger.jsonl should be added as sync-unit classification 19 in the context-sync inventory, with these properties:
- Source path: .claude/state/ledger.jsonl
- Scope-tag: user (the ledger tracks the user's movements across repos; it is not machine-specific)
- machine_exclude: false (it should cross machines)
- Secrets risk: LOW (paths and repo names, not credentials; already covered by the existing sanitize-error.cjs battery for path PII)
- Sync direction: source_wins=true (the machine where a movement happened is authoritative for that movement's record; append-only means the longer file wins)

This is not a change to the 18-count framing in C-033. C-033 described what D9 found empirically. The 19th item is a planning addition, not a retroactive change to the research finding.

**Rationale:** C-017's MEDIUM confidence and UNVERIFIABLE status make it the weaker claim by every evidence-weight criterion. C-033 is HIGH confidence from T1 codebase evidence. When a planning recommendation (C-017) conflicts with an empirically derived inventory (C-033), the inventory wins and the planning recommendation is converted into a concrete action. The contrarian's framing is accurate: this was an invisible gap in the research synthesis, not a complex design conflict.

**Dissent record:**
- Losing position: C-017 as an implicit "already decided" design fact (the ledger is user-scoped therefore /context-sync obviously includes it).
- Why it lost: An inventory derived from filesystem walk is more authoritative than a forward-looking design claim. The inventory walk did not include ledger.jsonl because ledger.jsonl does not yet exist on disk. D9 walked existing files; the ledger is a future artifact. This creates an asymmetry: the inventory is correct for today's filesystem; C-017 is a design intent for a future artifact.
- Could revisit: If planning decides the ledger should be machine-local only (not crossing machines), C-017 would be simply wrong. The user might want different machines to maintain independent ledgers (each machine tracks only what it has done). This is a legitimate alternative design that the research did not evaluate. It warrants a planning decision, not an assumption.

**Action for /deep-plan:** Explicit planning decision required: "Should ledger.jsonl cross machines via /context-sync?" The default recommendation from this resolution is YES (add as category 19), with source_wins=true. But this is a user decision about multi-machine lineage semantics, not a resolved research finding. Do not auto-include without surfacing the decision.

---

## Dispute 5 — Profile shape "3 fields per unit type"

**Claims in conflict:** C-026 and C-028 (profile shape uses exactly 3 fields per unit type: directory, companion_files, naming_scheme) vs Contrarian Challenge 4 (companion_files requires a population algorithm that D6 does not specify; without that algorithm, companion_files is empty in practice, making the usable shape 2 fields in practice).

**Type classification:** SCOPE-MISMATCH — C-026 and C-028 define a schema specification (what fields exist in the profile JSON). The contrarian is raising an implementation gap (how is companion_files populated during profile discovery). These are different levels of the same design. The schema spec can correctly say "3 fields" while the implementation can be incomplete for one of those fields.

**Evidence weight applied:**

- C-028: VERIFIED by V2. D6 explicitly derived the 3-field shape from the BRAINSTORM Challenge 6 resolution — which is a user-stated design constraint (T1). "Challenge 6 resolution from the BRAINSTORM made concrete" is the strongest possible grounding for a design spec claim.
- Contrarian Challenge 4: correctly identifies that the signal files listed in C-022 (.github/workflows/*.yml, .husky/pre-commit, .claude/settings.json, .claude/hooks/*.js, .github/CODEOWNERS, .github/pull_request_template.md, .gitignore) do not include any file that explicitly declares "unit type X requires companion files Y." The algorithm for populating companion_files from static file scanning is genuinely unspecified in the research.
- Open question 9 (from research): "Whether shapes in the profile is always fully populated or only for observed unit types" — the research acknowledged this gap without resolving it.
- D6 is silent on the companion_files population algorithm. V2 verified C-028 without an adversarial check on whether 3 fields are sufficient in practice (V2 noted this limitation explicitly).

**Verdict:** The 3-field count (directory, companion_files, naming_scheme) is correct as a schema specification. C-026 and C-028 stand.

The companion_files population algorithm is a genuine implementation gap, not a count error. The contrarian is right about the gap; wrong about the implication (that the count should be 2). The correct resolution is: the schema says 3 fields, and the implementation must specify how companion_files is populated, with a documented fallback when it cannot be determined from static analysis.

Recommended fallback for the companion_files population algorithm:
- Heuristic (first-pass): scan what files co-exist with known unit type files in the target repo (e.g., if .claude/skills/audit/ contains SKILL.md + EXAMPLES.md + BRAINSTORM.md, then companion_files for the "skill" unit type in that repo is ["EXAMPLES.md", "BRAINSTORM.md"]).
- Default-empty with advisory flag: if the heuristic cannot determine companion_files with confidence >= "observed", populate as [] and set a discovery_gap flag in the profile. The companion reading the profile then knows the field is unknown, not missing.
- Convention file (future): .claude/unit-types.json that repo authors maintain explicitly — upgrade path if the heuristic proves insufficient.

This resolution does not change the 3-field schema. It adds a required planning deliverable: the companion_files population algorithm must be specified in the planning document before profile discovery implementation begins.

**Rationale:** Schema field count and implementation algorithm are different levels of design. The 3-field schema was derived from a user constraint (BRAINSTORM Challenge 6 resolution) which is T1 authority. The implementation algorithm is an open design question that was always going to be resolved in planning, not research. Demoting the count from 3 to 2 based on a gap in the population algorithm would be incorrect — it would change the schema to match an implementation limitation rather than specifying what the implementation must achieve.

**Dissent record:**
- Losing position: Contrarian's implicit recommendation that companion_files should be dropped or the count reduced to 2 (directory + naming_scheme) because the population algorithm is unspecified.
- Why it lost: The population algorithm being unspecified is a planning gap, not a research error. The 3-field schema reflects a deliberate design decision about what the companion needs to produce correct output; that decision should not be reversed based on implementation difficulty. The heuristic fallback (default-empty with advisory flag) is a standard pattern for "we want this field but can't always populate it."
- Could revisit: If after implementing profile discovery it becomes clear that companion_files is never reliably populated by any algorithm (all repos have idiosyncratic layouts), dropping the field to version 2.0 of the profile schema would be appropriate. But that's an implementation-time decision, not a pre-implementation schema simplification.

**Action for /deep-plan:** Add as a required planning deliverable: "Specify the companion_files population algorithm for profile discovery, including: (1) the heuristic scan approach, (2) the confidence threshold for including a file as a companion candidate, (3) the default-empty fallback with discovery_gap flag, and (4) the future convention-file upgrade path." This must be specified before profile discovery implementation begins.

---

## Cross-dispute patterns

Three patterns emerge across the five disputes:

**Pattern 1 — Counts locked before implementation data existed (Disputes 1, 2, 3)**

Three of five disputes involve counts that were derived from reasoning or estimation before any implementation existed: the 12-field ledger cap, the 18-category inventory count, and the 2,000-record sharding threshold. All three counts are directionally correct. All three need precision adjustments. This is expected for pre-implementation research — the pattern to watch is ensuring planning documents distinguish MEASURED counts from ESTIMATED counts, so calibration parameters are not frozen as hard constants in implementation.

**Pattern 2 — Design decisions vs implementation algorithms are being conflated (Disputes 2, 5)**

Two disputes conflate a design decision (what the schema or inventory says) with an implementation algorithm (how to populate or walk it). The tenet row in the inventory exists as a sync-unit classification even though its identification mechanism is unresolved. The companion_files field exists in the schema even though its population algorithm is unspecified. In both cases the design decision is correct; the implementation gap is real and must be resolved in planning. The resolution is not to remove the design decision — it is to add the algorithm specification to the planning workload.

**Pattern 3 — Inventory-vs-assertion gaps that planning must explicitly close (Disputes 4, 1)**

Two disputes involve a forward-looking assertion (C-017: ledger is synced by context-sync; C-010: source_status is the resolution mechanism) that conflicts with a more grounded finding (C-033: the inventory does not list ledger.jsonl; C-001: the 12-field cap). In both cases, the forward-looking assertion is reasonable as a design intent but was never validated against the more grounded finding. These gaps did not cause planning problems during research — they cause planning problems when the plan tries to implement without resolving them. Both are now surfaced with explicit required planning decisions.
