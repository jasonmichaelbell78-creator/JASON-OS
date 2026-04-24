# Contrarian Challenge — Deep-Research Output

**Challenger:** contrarian-challenger
**Date:** 2026-04-23
**Target:** RESEARCH_OUTPUT.md (cross-repo-movement-reframe, Session 19)
**Builds on:** Session 18 brainstorm contrarian (challenges/contrarian.md) — NOT duplicating

---

## Summary

8 challenges total. Severity breakdown: 2 Critical, 4 Major, 2 Minor.

The Session 18 contrarian already raised the 8 structural risks in direction D' itself. This report pre-mortems the RESEARCH — the specific answers the research produced about ledger shape, profile discovery, drift detection, and cache key design. The question is: six months from now, when the plan landed and people are saying "the tool hit a wall," what specifically in this research was wrong?

---

## Challenge 1: The 12-Field Ledger Cap Is an Inherited Constraint, Not a Derived One

**Severity:** CRITICAL
**Claims challenged:** C-001, C-010, C-008

**Steel-man:** The strongest version of the cap argument is this: a 12-field minimum was derived from a disciplined pruning exercise — 15 candidates evaluated, 3 rejected with explicit rationale (parent_record_id redundant in an append-only log, status contradicts immutability, notes creates null-fill). The cap is not arbitrary; it is the result of saying "what is the minimum set that serves all four movement verbs?" and stopping there. The G.1 lesson (30+ fields collapsed the prior schema) is the correct motivation. 12 is not a round number plucked from the air — it is what remained after principled pruning.

**Why this could happen:** The research converged on 12 via a single-agent bottom-up derivation (D1), but the verifier (V1) immediately identified a live tension: D2's edge model adds `source_content_hash` and `source_status` as recommended fields, both with clear functional justification. If either is included — and C-010 recommends `source_status` as "the resolution mechanism" for repo-evolution events — the ledger exceeds 12 fields. The research presents this as a planning concern, but it is actually a design inconsistency: C-001 claims 12 fields serve all four verbs, C-010 names a fifth required field, and C-008 requires a content hash at port time that is also not in the 12. Three of the 80 claims are structurally inconsistent with each other, and the research marks all three HIGH confidence.

More specifically: `source_status` (active / source_deleted / source_renamed / standalone) is the proposed mechanism for handling repo-evolution events. Without it in the record, orphan detection requires scanning all ledger records every time the orchestrator resolves a pointer — the alternative is worse. The 12-field cap resolves this tension by asserting `source_status` is a "minor-bump addition for later," but that defers exactly the design question that planning needs to answer. When planning sits down and actually enumerates what `/sync-back`'s three-way diff needs, it will find that 12 fields are not enough and will add fields. The cap will slip on the first implementation pass.

**Evidence in the research:**
- V1 (C-001): "D2 introduces `source_content_hash` and `source_status` as additional fields... This is a design conflict internal to the research."
- V1 (C-010): "source_status field from D2 not in D1's 12-field set; field-cap conflict unresolved."
- V1 (C-008): "content hash at port time is recommended by D2 but is NOT one of the 12 fields in C-001's minimum viable set."
- V1 cross-claim Issue 4: "source_status introduces 13th field — these two claims are in tension."
- The research's own open questions section notes: "whether source_content_hash fits within the 12-field cap" remains unresolved.

**Mitigation:** Planning must resolve the D1/D2 field budget conflict before designing the schema. The question is not "is 12 right?" — it's "what does `/sync-back`'s three-way diff actually need at runtime?" Answer that first, derive the minimum, cap to that number (which may be 13 or 14). The cap's value is in preventing gold-plating, not in the specific number 12. Concede that 12 was a reasonable first-pass floor, not a ceiling proven by measurement.

---

## Challenge 2: The Drift-Record / Ledger Split Doubles the Operational Surface Without Proven Simplicity

**Severity:** MAJOR
**Claims challenged:** C-021, C-017, C-046, C-059

**Steel-man:** The strongest version of the split argument is: `/context-sync` does not produce lineage — it produces drift state. The two data structures answer fundamentally different questions. The ledger answers "where did this artifact come from and how has it evolved?" The drift record answers "is this machine's artifact still in sync with the canonical source?" These are different questions with different schemas, different consumers, and different lifecycles. Forcing the lineage ledger to also carry drift state would couple bootstrap ordering (context-sync ships first) to the ledger's existence, which is designed in parallel. The separation is architecturally clean. The bootstrap paradox alone is a definitive argument.

**Why this could happen:** The split is correct at the concept level. The operational risk is that two storage formats means two code paths for the "always-last-step" rule (C-046), two locking stories, two schema versioning paths, and two sources of truth for state that `/context-sync` needs to read. C-017 (ledger cross-machine sync handled by `/context-sync` itself) is marked MEDIUM confidence and rated UNVERIFIABLE by V1 — this is the load-bearing claim that makes the design circular: the ledger needs context-sync to sync it across machines, but context-sync uses a different file and does not depend on the ledger. The design thus requires that context-sync explicitly include the ledger in its managed set, which is a planning decision that has not been made. If that decision is missed, the ledger never syncs across machines and the cross-machine use case silently fails.

The deeper issue: six months after shipping, if a user adopts a third machine, the ledger on that machine starts empty. The drift record on that machine starts empty. These can be synced by context-sync — but only if context-sync includes ledger.jsonl in its 18-category inventory (C-033). That inventory does not list `ledger.jsonl` as a category. C-017 says "the ledger is a user-scoped artifact that /context-sync includes in its managed set" but this is the one cross-cutting design claim the research treated as obvious rather than resolved.

**Evidence in the research:**
- V1 (C-017): "UNVERIFIABLE — /context-sync doesn't exist yet; ledger inclusion in managed set is an open design question."
- C-033 lists 18 categories for context-sync inventory; `ledger.jsonl` is not explicitly named among them.
- V1 flags this as an open design question (D3 gap 1): "whether ledger.jsonl is in /context-sync managed set."
- The research open questions list does not include this gap explicitly, suggesting it slipped through synthesis.

**Mitigation:** Planning must add an explicit 19th item to the context-sync inventory: `ledger.jsonl` (user-scoped, sync across machines, never machine_exclude). Without this, the two-file split design has a hole that will surface on first multi-machine setup. This is a one-line fix to the inventory but it is currently invisible in the research output.

---

## Challenge 3: The Fast-Path Cache Key Cannot Be Calibrated Before the Recipe Library Exists

**Severity:** CRITICAL
**Claims challenged:** C-040, C-042, C-045, C-065, C-070

**Steel-man:** The strongest version of the cache key design is: `unit_type:source_repo:target_repo:profile_slice_hash` is structurally correct because it encodes the identity of the movement (not the content), mirroring proven two-level designs from ccache and Bazel. Content hash belongs in the value as a staleness check, not in the key as a routing signal. The 0.8 confidence threshold for fast-path suppression is a reasonable first-pass starting point, explicitly flagged as needing post-implementation calibration. The design is sound even if the specific numbers are estimates.

**Why this could happen:** The research identified this problem itself: D11 flagged the 0.8 confidence threshold as speculation with no empirical grounding, and both V1 and the research synthesis acknowledge that `profile_slice_hash` field enumeration "cannot be calibrated before the recipe library exists." This is not a minor gap — it is a structural incompleteness in the cache design. The recipe library has zero entries. The comprehension cache is designed to cache decisions against a recipe library that does not exist. The cache invalidation trigger for "recipe library version bump" (C-043) is a global invalidation — which means when the recipe library eventually reaches version 0.2 (whenever the first real recipes are authored), all cache entries are wiped. The entire accumulated cache from the first months of use is discarded on the first recipe library update.

More concretely: the `profile_slice_hash` must hash "only the profile fields that recipes actually consult" (C-042). But which profile fields do recipes consult is unknown because there are no recipes. This is acknowledged as open question 6. Planning "must enumerate recipe-relevant profile fields when the first recipes are authored" — but the cache schema must be finalized before implementation, which is before the first recipes exist. The cache schema references a subset of profile fields that will be determined by an artifact that does not yet exist. This is the definition of a circular dependency in design.

In the six-months-later pre-mortem: the cache ships with a placeholder `profile_slice_hash` that hashes the full profile (the safe choice) or an educated guess at relevant fields. Recipes are authored and some reference profile fields outside the initial hash scope. The cache produces spurious misses for three months before someone realizes the `profile_slice_hash` scope is wrong. By then, fixing it requires global cache invalidation — which is already built in as trigger 3. So the failure is recoverable, but the design pretends to solve a problem it cannot actually solve pre-launch.

**Evidence in the research:**
- C-045 (partial UNVERIFIABLE per V1): "0.8 confidence threshold — no empirical basis."
- V1 (C-065): "Turborepo global hash claim not directly confirmed; 10+ recipe threshold is speculation."
- V1 (C-070): ">60% hit rate threshold has no empirical basis."
- Open question 6: "profile_slice_hash — which profile fields are recipe-relevant. Requires knowing the full recipe library structure, which does not exist at v1 design time."
- C-042 explicitly: "profile_slice_hash must hash only the profile fields that recipes actually consult" — but no recipes exist.

**Mitigation OR concession:** The research is correct that the two-level cache design (structural key + content-hash validation) is sound and validated against real build systems. The mitigation is explicit: planning should specify that `profile_slice_hash` at v1 hashes the entire profile object (not a slice), accepting that this produces more frequent misses than optimal, and documents that the slice optimization is a post-recipe-library calibration. This avoids the circular dependency. The 0.8 threshold should be explicitly marked as a "post-implementation tuning parameter" with a stated first check at 50-port corpus. Do not embed it as a hard constant in the schema.

---

## Challenge 4: The Profile's "3 Fields Per Unit Type" Was Locked by a Challenge Resolution, Not by Evidence

**Severity:** MAJOR
**Claims challenged:** C-028, C-026

**Steel-man:** The 3-field shape block (directory, companion_files, naming_scheme) came directly from the Session 18 contrarian Challenge 6 resolution — which itself was the strongest challenge at brainstorm time. The contrarian identified that shape-expectations were being demoted without a replacement, and the resolution was "three fields per unit type is sufficient." This is a principled answer to a principled challenge. It is the minimum shape information needed to produce gate-compliant, structurally correct output. More fields would be gold-plating; fewer would be insufficient for directory placement.

**Why this could happen:** Three fields was specified as the answer to "what shape information does the companion need?" — but it was answered in the abstract, not by reading the actual destination repos and asking "is this enough to produce a correct port?" The specific three fields (directory, companion_files, naming_scheme) cover the nominal case (where does the file go, what travels with it, what is it named). They do not cover: the required file structure within the directory (does SoNash's skill directory require an EXAMPLES.md?), the validation rules for companion files (is the companion required or optional and under what conditions?), or the human-readable description of the unit type (what is this for, which helps the understanding layer recognize it).

More practically: `companion_files` as a field contains "required/optional accompanying files, with path patterns." This is a non-trivial field to populate from static file scanning. D6 reads the top 30 lines of `.claude/hooks/*.js` for gate classification, but for shape discovery it is reading directory conventions and naming patterns — which are implicit in the file system rather than explicit in any config file. When the discovery companion encounters a repo with an unconventional layout, the 3-field shape block either underpopulates (missing companion_files) or overpopulates (listing everything as a companion file) because there is no signal-carrying file that explicitly declares "this unit type requires these companion files." The shape discovery logic for populating `companion_files` is unspecified in the research.

**Evidence in the research:**
- C-028 notes: "This is the Challenge 6 resolution from the BRAINSTORM made concrete." It is a resolution to a challenge, not a finding from signal-file analysis.
- Open question 9: "Whether `shapes` in the profile is always fully populated or only for observed unit types" — the research did not resolve whether the shape block is complete or partial.
- V2 (C-028): VERIFIED, but with no adversarial check on whether 3 fields are sufficient in practice.
- The research does not describe the algorithm for populating `companion_files` from the source files listed in C-022. This is a gap in the profile discovery design.

**Mitigation:** Planning must specify the companion_files population algorithm — how does the discovery companion determine what files accompany each unit type in the target repo? Options: static heuristic (scan what co-exists with unit type files in the target), convention file (a `.claude/unit-types.json` that the repo author maintains), or default-empty with manual override. Without specifying this, the profile shape block for `companion_files` will be underpopulated in practice, reducing the profile to a 2-field shape block (directory + naming_scheme) that does not cover companion file requirements.

---

## Challenge 5: The Cross-Machine Design Assumes a Two-Machine Personal Setup; It Will Break on CI Runners and Sandboxed Extensions

**Severity:** MAJOR
**Claims challenged:** C-036, C-038, C-055

**Steel-man:** The per-record `machine_exclude` boolean (Layer 1) plus content-time pattern detection (Layer 2) is the right hybrid for the personal multi-machine case. The design handles the user's home machine and work machine cleanly. Layer 2 catches files that have machine-bound content that wasn't manually flagged at registration time. The `~/.claude/projects/<hash>/` walk (C-038) is an elegant solution to the path-encoding problem — find the directory empirically by known filename rather than computing the hash. The design is pragmatic and grounded.

**Why this could happen:** The design is grounded in a two-machine personal use case (home + work). The research does not address what happens when the same user's JASON-OS instance is cloned into a CI runner, a GitHub Codespace, a sandboxed VSCode extension host, or a Docker container. These are all machines in the sense that they have different absolute paths and machine-local state, but they are ephemeral — they will never be a sync source and should never receive context-sync writes. The `machine_exclude` flag is a binary per-record toggle. There is no concept of "this machine is ephemeral and should be excluded from sync participation entirely."

The `~/.claude/projects/<hash>/` walk (C-038) is marked MEDIUM confidence by V1 specifically because the hash function encoding the project path is undocumented and verified only by observation on one machine. On a CI runner, the absolute path to the project may be `/home/runner/work/repo` or `/workspace/repo` — the hash will differ from both home and work machines, and the empirical walk will find no matching directory. The research describes the fallback: "create the directory with user confirmation." In an automated CI context, there is no user to confirm. The drift record state file for a CI run, if written, pollutes the managed state with records from an ephemeral machine.

C-055 (no dotfile manager provides automated machine-bound detection) is marked UNVERIFIABLE — meaning the research's Layer 2 novelty claim has no prior art confirmation. If chezmoi or home-manager actually does provide this, the Layer 2 design may be re-inventing a solved problem in a way that has known failure modes the research missed.

**Evidence in the research:**
- C-036 and C-038 are grounded in home/work machine scenarios only. No CI, Codespace, or ephemeral machine scenarios appear in D10.
- V2 (C-055): UNVERIFIABLE — "absence claim across 4 tools. Cannot definitively confirm absence without exhaustive documentation review."
- V1 (C-038): "The empirical resolution approach is reasonable but unverified against actual Claude Code behavior."
- The 18-category sync inventory (C-033) does not address what happens when context-sync is invoked from an ephemeral machine.

**Mitigation:** Planning must define an "ephemeral machine" concept in the drift record. Options: a `machine_type` field (personal / ephemeral) that context-sync sets at first run based on a heuristic (is this `~/.claude/` directory older than X days? does it contain more than Y memories?), or a `--dry-run` mode that reads drift state without writing, or simply documenting that context-sync is a manually-invoked personal workflow that requires a real user. The failure mode is recoverable — but the design should explicitly state the assumption that the invoking machine is a long-lived personal machine, not an ephemeral environment.

---

## Challenge 6: Metric Claims Throughout the Research Are Architectural Vibes, Not Measurements

**Severity:** MAJOR
**Claims challenged:** C-018, C-045 (0.8 threshold), C-070 (>60% hit rate), C-015 (5s timeout)

**Steel-man:** All the numerical claims in this research are design parameters, not empirical measurements — and the research is honest about this. D11 explicitly flags the 0.8 confidence threshold as speculation, and V1 marks C-070 UNVERIFIABLE. The numbers are calibration starting points, not performance claims. The design is correct to separate "the architecture is validated" (HIGH confidence via external analogues) from "the calibration parameters are empirically grounded" (MEDIUM or UNVERIFIABLE). The architecture is what planning needs; calibration happens post-implementation.

**Why this could happen:** The problem is not that the numbers are estimates — it is that the numbers will survive from research into planning into specification into implementation as if they were measurements. The 0.8 fast-path suppression threshold will appear in the implementation as a hard constant. The "approximately 2,000 records / 3-5 years" sharding threshold (C-018) will appear in a comment and never be revisited. The ">60% hit rate" (C-070) will appear as a success metric in a test suite. None of these numbers have empirical grounding. When the implementation ships and the real hit rate is 30% (because there are almost no recipes in the library), someone will look at the 60% threshold in the tests and not know whether to trust it.

Specific metric risks:
- **5-second lock timeout (C-015):** Verified in code (`LOCK_TIMEOUT_MS = 5_000`). But this is the existing timeout for small state files. The ledger, after 6 months of use, may be much larger. On a slow Windows filesystem with a cold disk, reading a 500KB ledger file under lock may take more than 5 seconds. The timeout was not re-evaluated for ledger-scale operations.
- **2,000-record sharding threshold (C-018):** V1 found the actual bytes/record estimate was inflated (actual ~586 bytes/record from commit-log measurements, not 800 as assumed). The threshold is directionally right but the specific number is overstated. V1 recommends revising to "~2,600 at 800 bytes upper bound, likely higher at realistic sizes."
- **0.8 confidence threshold (C-045):** No empirical basis. Will become a hard constant in implementation.

**Evidence in the research:**
- V1 (C-018): "3-5 years of heavy use estimate is unsubstantiated by any measurement — pure assumption."
- V1 (C-045): "0.8 threshold is UNVERIFIABLE — no empirical or theoretical basis exists pre-implementation."
- V1 (C-070): ">60% hit rate threshold has no empirical basis."
- V1 cross-claim: sharding threshold uses inflated per-record byte count, leading to underestimate of safe record count.

**Mitigation:** Planning should identify every numerical constant that appears in the research and tag it explicitly as: (A) MEASURED (grounded in codebase measurement), (B) DERIVED (computed from measured inputs), or (C) ESTIMATED (first-pass design parameter requiring post-implementation calibration). Constants tagged ESTIMATED should be named as calibration parameters in the implementation (not magic numbers) with a named post-implementation review point. The 0.8 threshold, the 60% hit rate, and the 3-5 year sharding estimate all belong in category C.

---

## Challenge 7: The "18-Category Inventory Is Empirically Confirmed" Claim Masks a Granularity Problem

**Severity:** MINOR
**Claims challenged:** C-033, C-051

**Steel-man:** The 18-category inventory (C-033) is the right scope for context-sync: it was derived by direct filesystem inspection of the user's actual machines, split mixed-scope items at the item level (not category level), and added items the brainstorm missed. The V2 verifier confirmed all 6 key additions are present. The count of 18 is accurate for sync units. This is the most empirically grounded claim in the research — it was derived by reading the actual filesystem, not by reasoning from first principles.

**Why this could happen:** V2 flagged C-033 as CONFLICTED on exactly this point: "18 categories" vs "18 sync units within fewer categories." Rows 1-3 in the D9 table are all "Canonical memories" split by type (user/project/reference). These are not 3 categories — they are 1 category (canonical memories) with 3 sync-unit classifications. This matters because the implementation must walk one directory and classify files by frontmatter field, not walk 3 directories. The 18-row table gives the impression of 18 implementation targets when some of those rows share a single directory glob with different filtering criteria.

More concretely: C-062 (memory_type → scope-tag mapping) and C-063 (tenet identification gap) together reveal that the inventory's "empirical" character is partly aspirational. The tenet row in the inventory assumes `type: tenet` frontmatter — but no file currently uses that frontmatter type. The walk cannot classify tenet files by frontmatter because the frontmatter type is wrong (`reference` not `tenet`). This means the 18-category inventory includes a category (tenets) that the implementation cannot actually populate by the claimed mechanism. Planning must resolve the tenet identification gap (open question 4) before the inventory count of 18 is correct.

**Evidence in the research:**
- V2 (C-033): "18 categories framing is ambiguous when rows 1-3 are sub-splits of one brainstorm category."
- C-063: "No file currently uses type: tenet in frontmatter. Tenet identification is currently by naming convention, not by frontmatter type field."
- Open question 4: "Planning must decide: adopt type: tenet as canonical and backfill existing tenets, or use naming convention as the identification mechanism."
- V2 (C-063): VERIFIED — confirmed 0 files use type: tenet, confirmed t3_convergence_loops.md uses type: reference.

**Mitigation:** The research is directionally correct. The specific fix: planning must (a) resolve the tenet identification mechanism before spec-ing the walk, and (b) restate the inventory as "18 sync-unit classifications across approximately 12 distinct category implementations." This does not change the design; it prevents a planning document that lists 18 categories from generating 18 separate implementation stories when some share implementation.

---

## Challenge 8: The Bootstrap Scaffold Assumes `/context-sync` Ships First But the Research Designs All Four Companions in Parallel

**Severity:** MINOR
**Claims challenged:** C-059, C-017, C-021

**Steel-man:** The strongest version of the bootstrap argument is: C-059 is definitive and verified. Context-sync ships first precisely because it does not depend on the lineage ledger, the comprehension cache, or the full profile discovery system. The research correctly designed a minimal 7-field drift record that context-sync can use independently. The Session 18 contrarian Challenge 8 ("bootstrap paradox") was explicitly resolved by this separation. The research is internally consistent with the bootstrap ordering.

**Why this could happen:** The research designs all four data structures (ledger, profile, drift record, comprehension cache) in parallel within a single session, which is appropriate for research. But the planning document will inherit all four designs simultaneously. A `/deep-plan` that sees all four designs will be tempted to implement all four structures before shipping anything — because the schema versioning convergence finding (C-048) argues for "one shared schema-versioning policy document" across all four files. Writing that shared policy requires knowing all four schemas. Knowing all four schemas before implementing any of them re-introduces the bootstrap problem at the planning level.

Specifically: C-017 (ledger synced by context-sync) is UNVERIFIABLE and an open design question. If planning decides that context-sync must include the ledger in its managed set (which is the right decision), that creates a sequencing dependency: ledger schema must be finalized before context-sync's inventory can be finalized. Which comes before the other? The research's "context-sync ships first" principle is at risk from its own open design question.

**Evidence in the research:**
- C-017: MEDIUM confidence, UNVERIFIABLE — "ledger inclusion in managed set is an open design question."
- The research synthesis identifies C-017 as unresolved but does not name it as a bootstrap dependency.
- C-048: "planner should adopt a single naming convention and write one shared schema-versioning policy document" — this is a cross-schema deliverable that requires all four schemas to be stable before it can be written.

**Mitigation:** Planning must explicitly sequence the four implementations: (1) context-sync drift record and mechanism first (C-021, C-034 — no ledger dependency), (2) ledger schema second (resolving D1/D2 field budget tension from Challenge 1), (3) profile discovery third (can reference finalized ledger field names), (4) comprehension cache last (depends on recipe library existence per Challenge 3). The shared schema-versioning policy should be written after step 2, not as a pre-step. This sequencing is implicit in the research but never stated; planning must make it explicit.

---

## Top 3 Risks for /deep-plan to Address

1. **D1/D2 field budget conflict (from Challenge 1):** The 12-field ledger cap has a live three-claim inconsistency (C-001 vs C-010 vs C-008). Planning must resolve whether `source_status` and `source_content_hash` are in the v1 schema before any implementation begins. This is the highest-risk unresolved conflict in the research.

2. **`profile_slice_hash` circular dependency (from Challenge 3):** The comprehension cache key references a hash of recipe-relevant profile fields, but no recipes exist to determine which fields are relevant. Planning must either (a) specify that v1 hashes the full profile and optimize later, or (b) enumerate the recipe-relevant fields from first principles. Leaving this unresolved means the cache schema cannot be finalized.

3. **`ledger.jsonl` missing from context-sync inventory (from Challenge 2):** The 18-category inventory does not explicitly include `ledger.jsonl`. If this is not added as category 19, the ledger never syncs across machines and the multi-machine use case silently fails on first adoption of a third machine.

---

## Where the Research Is Solid

The contrarian could not find meaningful weaknesses in:

- **The append-only event log decision (C-002, C-016):** Verified against existing house style, supported by multiple analogues. The "ledger-last" rule is the correct rollback mechanism.
- **The forward-pointer edge model (C-008, C-067):** Structurally sound. Content hash as drift detection, not as lineage substitute, is correct.
- **The 7-field drift record separation from the ledger (C-021, C-059):** The bootstrap paradox argument is verified and definitive. The separation is correct.
- **The context-sync normalization rules (C-035, C-053, C-054):** CRLF-to-LF default-on, RFC 8785 JCS for JSON, and frontmatter volatile field stripping are all grounded in confirmed prior art.
- **The per-record `machine_exclude` boolean (C-036):** The Layer 1 / Layer 2 hybrid is a pragmatic design with good fallback behavior.
- **The profile signal-file inventory (C-022, C-023, C-025):** All claims verified by direct codebase reads. The exclusion of `.husky/_/` is correct and confirmed.
- **The scope-tag enum stability (C-037, C-071):** Not extending the enum is correct. The existing five values cover all cases including the partial-portability detection problem.
- **The `safeAppendFileSync` + `withLock` implementation choice (C-072, C-015):** Both verified in code at exact line numbers. This is implementation-ready.
