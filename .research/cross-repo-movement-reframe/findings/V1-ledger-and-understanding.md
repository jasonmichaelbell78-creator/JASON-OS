# Verification V1 — Ledger + Understanding-Mechanical Strands

**Verifier:** deep-research-verifier (V1)
**Date:** 2026-04-23
**Scope:** 37 claims (28 ledger + 9 understanding-mechanical)

---

## Verification Summary

| Verdict | Count | % |
|---|---|---|
| VERIFIED | 25 | 67.6% |
| REFUTED | 2 | 5.4% |
| UNVERIFIABLE | 7 | 18.9% |
| CONFLICTED | 3 | 8.1% |

---

## Per-claim verdicts

### Ledger strand

#### C-001
**Claim:** The minimum viable ledger record has exactly 12 fields: record_id, verb, source_project, source_path, dest_project, dest_path, source_version, moved_at, unit_type, scope_tag, verdict, ledger_schema_version. All four movement verbs (port, sync-back, extract, context-sync) can be served by these 12 fields.
**Type:** DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** The 12-field minimum is an architectural design decision derived from reasoning in D1, not confirmed against any implemented schema. No ledger schema file exists yet in the codebase. The pruning of parent_record_id, status, and notes is a reasonable design argument but cannot be verified empirically. The claim that all four verbs are served by these 12 fields is a forward-looking design assertion.
**Notes:** The field names and pruning logic in D1 are internally consistent and match the existing lineage object shape in `.claude/sync/schema/EXAMPLES.md` (which shows `source_project`, `source_path`, `source_version`, `ported_date`). However, D2 introduces `source_status` and `source_content_hash` as additional fields for edge representation (section 6 of D2), which would push the total past 12 fields if included. There is a tension between D1's 12-field cap and D2's 4-field edge budget — D2 explicitly flags this gap. This is a design conflict internal to the research, not a codebase verification failure.

#### C-002
**Claim:** The lineage ledger must be an append-only event log, not a mutable record design. /sync-back's three-way diff demands the original port record be preserved intact. Current state for a (source_project, source_path, dest_project) tuple is derivable as the most-recent record for that tuple.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** The append-only pattern is confirmed as the established JASON-OS house style: all 4 existing `.claude/state/*.jsonl` files are append-only event logs (confirmed by filesystem inspection of commit-log.jsonl, hook-warnings-log.jsonl, commit-failures.jsonl, label-promote-audit.jsonl). The derivation-by-most-recent-record pattern is a standard pattern for event-sourced systems, confirmed by the Microsoft Azure Event Sourcing Pattern documentation cited in D3.
**Notes:** The append-only design also eliminates the rollback complexity for the ledger (confirmed by D3's analysis of preview.js precedent).

#### C-003
**Claim:** The parent_record_id field is unnecessary in an append-only log. Temporal ordering plus the identity tuple (source_project, source_path, dest_project) provides the back-reference without a dedicated field.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** This is a logical consequence of C-002 (append-only log). In an append-only log, the most-recent record per identity tuple is the current state, and /sync-back can query for the most recent `verb: port` record matching the tuple. The reasoning is sound and consistent with event-sourcing patterns. No codebase evidence contradicts this design decision.
**Notes:** The claim's confidence hinges on the identity tuple being sufficient for disambiguation. D1 does not address the edge case where the same file is ported to two different destination paths in the same target repo (would both match the tuple). This is a minor gap in the reasoning but does not refute the claim.

#### C-004
**Claim:** The status field is redundant in an append-only log. Event ordering implies current state; a mutable status field in an immutable log is a contradiction.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** All four existing `.claude/state/*.jsonl` files in JASON-OS confirm this pattern — none carry a `status` field that tracks lifecycle state across records. Each record is a timestamped event (confirmed by reading commit-log.jsonl, hook-warnings-log.jsonl, commit-failures.jsonl). The event-sourcing principle (state derivable from event sequence) is cited by the Azure Event Sourcing Pattern documentation.
**Notes:** D2 separately proposes a `source_status` field with values `active | source_deleted | source_renamed | standalone` — this is a different field that encodes the relationship state of the source file pointer, not a mutable "record lifecycle status." C-004's claim specifically rejects a mutable record-lifecycle status field, which remains valid. The D2 `source_status` is an edge-state field that would need evaluation against the 12-field cap.

#### C-005
**Claim:** The notes field (free-text catch-all) must be rejected from the ledger. The G.1 lesson: agents that cannot populate it set it to null universally, making it a landing pad for information that should have been structured or not stored.
**Type:** DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** The "G.1 lesson" references an internal prior experience (the G.1 collapse in Piece 2's schema). No codebase file named or explaining "G.1" was verified during this pass. The principle itself (free-text fields get null-filled by agents) is a plausible design lesson but the specific incident cannot be confirmed from available files.
**Notes:** The recommendation to reject notes is architecturally sound regardless of the G.1 specifics, consistent with the 12-field cap discipline.

#### C-006
**Claim:** git-subrepo is a negative example for ledger design: its mutable single-record .gitrepo block cannot answer what a subrepo looked like three syncs ago, and it loses the upstream connection silently when the upstream URL changes.
**Type:** EXTERNAL
**Verdict:** VERIFIED
**Evidence:** Web search confirmed `.gitrepo` field structure: remote, branch, commit, parent, method, cmdver — a single mutable metadata block (Debian manpage; GitHub ingydotnet/git-subrepo wiki). This is a mutable single-record design that overwrites on each pull. The loss-of-connection-on-URL-change behavior is confirmed by D2 source [4] (Giant Swarm Handbook) and is structurally implied by the file format (stores remote as a mutable value with no history).
**Notes:** The git-subrepo design is well-confirmed as a negative example. The specific field `cmdver` was not listed in D1's field survey (which listed: remote, commit, branch, parent, method, version) — version vs cmdver is a minor terminology difference, does not affect the claim.

#### C-007
**Claim:** Nix derivation immutability (each .drv is permanent and immutable; lineage built by following inputDrvs chain) is the correct positive analogue for ledger design: each record is permanent, ancestry is the chain of records.
**Type:** EXTERNAL
**Verdict:** VERIFIED
**Evidence:** Nix Reference Manual (nix.dev/manual/nix/2.34/) confirms: derivations in the Nix store are permanent and immutable; `inputDrvs` attribute lists all derivations a given derivation depends on (confirmed via web search, NixOS Discourse, and multiple Nix documentation sources). The analogy — each ledger record is permanent, ancestry follows the chain — is structurally sound.
**Notes:** D1's claim that "lineage built by following inputDrvs chain" accurately describes the Nix model. The analogy is for inspiration only (JASON-OS does not use content-addressing); it validates the append-only immutable record design.

#### C-008
**Claim:** The ledger edge model should be a forward pointer (destination knows its source) plus content hash at port time. This gives: where-did-this-come-from (forward pointer), has-source-changed (hash comparison), no writes into source repos, no consistency hazard.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** The four design goals stated in the claim (origin query, drift detection, no source writes, no consistency hazard) are internally consistent with the forward-pointer-only approach. The no-source-writes constraint is confirmed by BRAINSTORM.md (extraction from unowned repos is a stated use case). D2's analysis of the five patterns (A through E) with multi-source corroboration supports this recommendation. SPDX 3.0.1's Relationship element design (confirmed via WebFetch) validates the Pattern D approach but D2 correctly identifies it as overengineering for JASON-OS's scale.
**Notes:** The content hash at port time is recommended by D2 but is NOT one of the 12 fields in C-001's minimum viable set (D1 rejected `content_hash` as a minor-bump addition for later). This is a cross-claim tension: C-008 asserts content hash as part of the recommended model but C-001's 12-field cap does not include it. Verified as architecturally sound, but the field budget conflict is a planning concern.

#### C-009
**Claim:** Bidirectional ledger pointers create consistency hazards when one side updates and the other does not. Not recommended for JASON-OS.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D2 claim 9 rates this MEDIUM confidence based on "first-principles reasoning, supported by git-submodule design decisions." The consistency hazard argument is a well-established principle in distributed systems design. The claim is architecturally sound. No codebase or web evidence contradicts it.
**Notes:** Confidence appropriately rated MEDIUM in the original source — the hazard is real but the severity at JASON-OS's small scale (user owns a handful of repos) is low. Verified as structurally correct reasoning.

#### C-010
**Claim:** Repo-evolution events (rename, file split, file merge, delete) do not invalidate ledger records — they mean the record describes a past state. The source_status field (active | source_deleted | source_renamed | standalone) is the resolution mechanism.
**Type:** DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** The design principle (records describe past state, not live references) is sound and consistent with the event-log architecture. However, `source_status` is a field proposed by D2 that is NOT in C-001's 12-field minimum viable set. If `source_status` is added, the ledger exceeds 12 fields. D2 explicitly flags this tension (section 6: "source_status is the second candidate for consolidation"). The claim conflates D1's 12-field design with D2's edge model field requirements — these have not been reconciled.
**Notes:** The resolution mechanism (source_status) is plausible but unresolved against the field cap. Mark as UNVERIFIABLE pending field-cap reconciliation in planning.

#### C-011
**Claim:** For repo-rename events, the fix-up is a bulk update (find all records with source_repo = old_name, rewrite to new_name) triggered when the orchestrator detects a 404 on any ledger pointer resolution.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D2 section 4a describes this exact pattern with clear reasoning. The bulk-update approach is consistent with the forward-pointer model (only destination records need updating, no source-side writes). The 404-trigger mechanism is a natural consequence of pointer resolution failing. No codebase or external evidence contradicts this pattern.
**Notes:** The claim uses the word "rewrite" for what is, in an append-only log, more precisely a "new record superseding old records" (since append-only logs don't mutate). This is a minor imprecision in the claim language. Verified as structurally sound.

#### C-012
**Claim:** Multi-hop transitive edges should use one record per hop, not full ancestry chains in a single record. Ancestry is the chain of ledger records. At JASON-OS's realistic depth (2-3 hops), recursive lookup cost is trivial.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D2 section 5 (Option 1 vs 2 vs 3 analysis) provides the multi-source case for one-record-per-hop. Data lineage theory supports per-hop edges (D2 claim 5, Wikipedia data lineage). The "2-3 hops at realistic JASON-OS depth" assessment is contextually grounded (user owns a small number of repos). No evidence from external systems contradicts this at small scale.
**Notes:** The recursive cross-repo lookup dependency (if an intermediate repo is unavailable, the chain cannot be fully traversed) is the one acknowledged weakness. Not a refutation — just a documented limitation.

#### C-013
**Claim:** The lineage ledger should live at .claude/state/ledger.jsonl — the existing gitignored state directory. This matches the convention of all six existing .claude/state/*.jsonl files.
**Type:** CODEBASE
**Verdict:** CONFLICTED
**Evidence:**
- VERIFIED PART: `.claude/state/` is confirmed gitignored at `.gitignore:46` (not line 47 as cited in D3 — off by 1). The state directory exists and contains JSONL files.
- REFUTED PART: There are only **4** JSONL files in `.claude/state/`, not 6: `commit-log.jsonl`, `commit-failures.jsonl`, `hook-warnings-log.jsonl`, `label-promote-audit.jsonl`. The remaining files in the directory are `.json` state files (brainstorm/deep-plan/deep-research/task-pr-review state files) and one `.md` file.
**Conflicts:**
- sourceA: D3 findings claim "all six existing .claude/state/*.jsonl files" and D3 claim #1 repeats this — "All six existing .claude/state/ files are JSONL."
- sourceB: Filesystem inspection confirms 4 JSONL files (bash: `ls .claude/state/*.jsonl | wc -l` = 4)
- Conflict type: Misinformation (D3 overcounts JSONL files by 2)
**Notes:** The claim's recommendation (location at `.claude/state/ledger.jsonl`) is sound despite the count error. The gitignore confirmation and house-style argument hold with 4 files; the "six" is a factual error in evidence but does not undermine the recommendation.

#### C-014
**Claim:** The ledger must NOT be git-tracked. JSONL produces real merge conflicts on independent appends; no JSONL merge driver auto-resolves. Git tracking also raises CLAUDE.md §2 security constraints for path/content data.
**Type:** CODEBASE + DERIVED
**Verdict:** VERIFIED
**Evidence:** `.gitignore:46` gitignores `.claude/state/` entirely (filesystem verified). CLAUDE.md §2 security constraints confirmed (path traversal guards, input validation requirements — read from codebase CLAUDE.md). The JSONL merge conflict argument is a well-established property of line-delimited formats (confirmed by D3 reasoning and web evidence). No JSONL merge driver is confirmed in the JASON-OS `.gitattributes` (no .gitattributes file found in the repo at all — Glob search).
**Notes:** The .gitignore line is at line 46, not line 47 as cited in D3. Off-by-one error in D3's evidence citation, does not affect the verdict.

#### C-015
**Claim:** safe-fs.withLock (coarse whole-file) is the correct locking primitive for ledger writes. Writes are short (microseconds), nested companion invocations are sequential in practice, 5s timeout is generous, and stale locks are auto-broken via PID liveness check.
**Type:** CODEBASE
**Verdict:** VERIFIED
**Evidence:**
- `withLock` confirmed at `/c/Users/jason/Workspace/dev-projects/JASON-OS/scripts/lib/safe-fs.js:614-621`
- `LOCK_TIMEOUT_MS = 5_000` confirmed at line 372
- `isLockHolderAlive` function confirmed at lines 442-456 — uses `process.kill(pid, 0)` for PID liveness check, falls back to age heuristic for cross-host
- `Atomics.wait` for non-busy-spin sleep confirmed at lines 374-379
- Lock file format `{ pid, timestamp, hostname }` confirmed at lines 551-555 (acquireLock)
- `withLock` is exported (confirmed at line 635)
**Notes:** The D3 claim that withLock is at "614-621" is confirmed exactly. The PID liveness check description is accurate (process.kill(existing.pid, 0) at line 446).

#### C-016
**Claim:** The ledger record must be the last step of a movement — files-first, then ledger append. If any file write fails before the ledger append, the ledger is untouched (no rollback needed). If the ledger append fails after all files are written, the result is an orphaned movement (detectable on next scan), not torn state.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D3 identifies this pattern from the `preview.js` precedent (`.claude/sync/label/backfill/preview.js` lines 183-233). The pattern is: read up-front, snapshot in memory, write in sequence, recover from failure. The "ledger last" ordering is the simplest case of this pattern (no rollback needed for the file writes if ledger is last). The orphan detection fallback is a named recovery mechanism.
**Notes:** The "orphan detection on next scan" mechanism is referenced but not implemented — its mechanics are a gap noted in D3. The claim itself is verified as the correct ordering discipline; the orphan detection implementation is for planning.

#### C-017
**Claim:** Cross-machine sync of the ledger file is handled by /context-sync, not by git. The ledger is a user-scoped artifact that /context-sync includes in its managed set.
**Type:** DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** This is a planning/architectural decision, not a verified codebase fact. `/context-sync` does not yet exist. D3 claim 5 rates this MEDIUM confidence ("Requires /context-sync to include ledger in managed set — design decision for planning"). D4 corroborates: the separate drift record is the correct sync vehicle for context-sync-style artifacts. However, the specific inclusion of `ledger.jsonl` in /context-sync's managed set is an open design question (D3 gap 1).
**Notes:** Architecturally plausible but not confirmed. The claim should be downgraded to a planning recommendation, not a verified design fact.

#### C-018
**Claim:** Single ledger file is appropriate at launch; sharding threshold is approximately 2,000 records (roughly 3-5 years of heavy use at estimated rates). Year-based sharding (ledger.2026.jsonl, ledger.2027.jsonl) is the right strategy if reached.
**Type:** METRIC + DERIVED
**Verdict:** CONFLICTED
**Evidence:**
- VERIFIED: `DEFAULT_READ_MAX_BYTES = 2 * 1024 * 1024` confirmed at `safe-fs.js:265`
- VERIFIED: commit-log.jsonl measured at 68 records, 39,813 bytes (filesystem confirmed — `wc -l` and `wc -c` ran against the file)
- CONFLICTED: The 2,000-record sharding threshold is derived from the 2 MiB ceiling at 800 bytes/record = ~2,621. However:
  - D3 uses commit-log.jsonl as the byte-per-record baseline ("Each commit-log record is moderately large. Ledger record similar (~500–800 bytes)"). But commit-log records are 39,813 bytes / 68 records = ~586 bytes/record. Ledger records with 12 fields in JSONL would be much smaller (likely 300-500 bytes, not 500-800). The upper estimate inflates the per-record byte count.
  - `streamLinesSync` removes the 2 MiB ceiling for streaming readers, so the threshold is only relevant for `readTextWithSizeGuard` callers. D3 mentions this mitigation (line 143 of D3: "streamLinesSync removes the ceiling for streaming readers anyway").
  - The "3-5 years of heavy use" estimate (5/session × 3 sessions/week = 780 records/year) is unsubstantiated by any measurement — pure assumption.
**Conflicts:**
- sourceA: D3 claims 2,000 records / 3-5 years at ~800 bytes/record
- sourceB: Filesystem measurement shows commit-log records average ~586 bytes/record; ledger records (12 flat fields, shorter paths) would likely be smaller still, meaning the real threshold is higher (possibly 4,000+ records for 800 bytes/record is a ceiling, not a baseline)
- Conflict type: The metric is directionally correct (single file is fine for years) but the specific number (2,000) is derived from an inflated per-record estimate. The practical recommendation (single file at launch) is still correct.

#### C-019
**Claim:** The ledger schema versioning should mirror the existing JASON-OS EVOLUTION.md approach: per-record ledger_schema_version stamp, addition with a default = minor bump, addition requiring re-reading existing records = major bump with migration plan.
**Type:** CODEBASE
**Verdict:** VERIFIED
**Evidence:** EVOLUTION.md confirmed at `.claude/sync/schema/EVOLUTION.md`. The schema versioning approach is documented:
- Per-record stamp: each record carries `schema_version` (confirmed in examples at `.claude/sync/schema/EXAMPLES.md`)
- Addition with default = minor bump: EVOLUTION.md §1 table confirms "Non-breaking additions: Existing records still validate"
- Addition requiring re-read = major bump: EVOLUTION.md §3 confirms "Breaking (major bump) IF: Field requires per-record computation that can't be done automatically"
- The approach has been applied successfully from v1.0 through v1.3 (EVOLUTION.md §11)
**Notes:** EVOLUTION.md §8 (mirror rule) is separately addressed in C-020.

#### C-020
**Claim:** The EVOLUTION.md §8 mirror rule (ledger schema must be mirrored identically to SoNash) does NOT apply to the lineage ledger. The ledger tracks movements between repos and lives in one canonical location.
**Type:** CODEBASE + DERIVED
**Verdict:** VERIFIED
**Evidence:** EVOLUTION.md §8 is confirmed at `.claude/sync/schema/EVOLUTION.md`. §8 applies specifically to the sync-mechanism registry schema (the schema for `files.jsonl` records). The lineage ledger is a separate artifact — it tracks movements between repos and lives in `.claude/state/` (gitignored), not in `.claude/sync/schema/`. The mirror rule's stated purpose is preventing schema desyncs between JASON-OS and SoNash for the sync engine. A lineage ledger in a single location has no mirror obligation by definition.
**Notes:** D1 claim 6 correctly identifies this with MEDIUM confidence, acknowledging that "A3 owns the canonical location decision." Given that A3 (D3) confirmed `.claude/state/` as the location, the mirror inapplicability follows logically.

#### C-021
**Claim:** /context-sync does NOT need the full lineage ledger. Lineage is universally unneeded for context-sync — all brainstorm-listed source categories are user-authored in place, none ported from an external repo. A separate 7-field drift record is sufficient and minimal.
**Type:** DERIVED + CODEBASE
**Verdict:** VERIFIED
**Evidence:** D4 finding table (Finding 1) documents all context-sync source categories and confirms "UNNEEDED" for lineage in every row. The 7-field drift record shape is specified: `path`, `category`, `src_hash`, `dst_hash`, `source_wins`, `machine_exclude`, `synced_at`. The codebase confirmation: all 4 existing `.claude/state/*.jsonl` files are pure event logs without lineage/origin fields — consistent with D4's house-style observation. The bootstrap paradox argument (C-059) provides an independent architectural reason for separation.
**Notes:** D4 claims the 7-field drift record fits one .jsonl file with "no shared infra needed" — confirmed as architecturally achievable given the existing state file infrastructure.

#### C-059
**Claim:** The bootstrap paradox: /context-sync must ship first as the bootstrap scaffold. Forcing it to depend on the lineage ledger (which is designed in parallel) inverts the dependency and prevents /context-sync from being the simplest first companion. This is a definitive argument for the separate drift record.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D4 Finding 3 explicitly analyzes this: "Bootstrap-time cost: LARGE — tips the recommendation." The BRAINSTORM.md states context-sync ships first. The ledger is being designed in parallel (this research session). The dependency inversion would block /context-sync from functioning as the bootstrap scaffold.
**Notes:** The claim is verified as a design-reasoning chain, not a codebase fact. The bootstrap ordering argument is internally consistent and not contradicted by any evidence.

#### C-066
**Claim:** SPDX 3.0.1 stores relationships as separate Relationship element records with from and to properties — not as inline pointers within element records.
**Type:** EXTERNAL
**Verdict:** VERIFIED
**Evidence:** WebFetch of `spdx.github.io/spdx-spec/v3.0.1/model/Core/Vocabularies/RelationshipType/` and secondary WebSearch confirmed: SPDX 3.0.1 has a dedicated `Relationship` class in the Core model with `from` (source element), `to` (target element(s)), and `relationshipType` properties. Relationships are stored as separate element records, not as inline pointers. The SPDX 3.0.1 Relationship class page and the PDF specification both confirm this architecture.
**Notes:** D2 claim 1 is fully corroborated. The SPDX evidence also confirms that "from" and "to" are the exact property names used.

#### C-067
**Claim:** Content hash alone cannot represent derived-from relationships once content diverges. The relationship must be explicitly recorded at port time. This confirms that source_content_hash in the ledger record is a drift-detection tool, not a substitute for the forward pointer.
**Type:** DERIVED + EXTERNAL
**Verdict:** VERIFIED
**Evidence:** Nix content-addressed derivation documentation confirms that once content diverges, the hash link breaks — two files with different content cannot be linked by hash alone. The explicit-recording requirement is confirmed by SPDX's design (explicit Relationship elements) and by OpenLineage (explicit run events with inputs/outputs). The claim's reasoning is sound: hash equality proves identity, not lineage.
**Notes:** D2 claim 10 rated HIGH confidence, supported by Nix manual and first-principles reasoning.

#### C-068
**Claim:** git log --follow uses content-similarity heuristics (default 50% threshold) for rename detection but fails when files are heavily modified during a rename/move. Content hash at port time provides a fallback.
**Type:** EXTERNAL
**Verdict:** VERIFIED
**Evidence:** D2 claim 3 cites two independent sources: thelinuxcode.com (2026) and labex.io for the 50% similarity threshold. The default rename detection threshold in git is 50% (confirmed in git documentation as `-M50%` default for diff). The failure mode (heavy modification during rename) is a known limitation documented in multiple git tutorials.
**Notes:** The secondary claim (content hash as fallback for finding renamed files) is a sound design principle. D2 rates this HIGH confidence with independent confirmation.

#### C-071
**Claim:** The existing scope-tag enum (universal/user/project/machine/ephemeral) applies to the lineage ledger without modification. This enum was validated across five independent systems in PHASE_0_LANDSCAPE.md.
**Type:** CODEBASE + EXTERNAL
**Verdict:** VERIFIED
**Evidence:**
- Codebase: `enums.json` at `.claude/sync/schema/enums.json` confirms the enum exists: `source_scope` and `runtime_scope` both have values `["universal", "user", "project", "machine", "ephemeral"]` — exactly 5 values
- PHASE_0_LANDSCAPE.md confirms at line 56: "The scope-tag enum (5 values) is well-validated. Universal/user/project/machine/ephemeral converged from five independent systems (chezmoi, VSCode, Nx, XDG, Agent Skills)."
**Notes:** The enum is confirmed as `source_scope`/`runtime_scope` in the existing schema, not named `scope_tag` — the D1 claims use `scope_tag` as the proposed ledger field name. This is a naming convention difference, not a structural discrepancy.

#### C-072
**Claim:** safeAtomicWriteSync (tmp + rename) is NOT appropriate for ledger appends — it rewrites the whole file and is expensive for a growing log. Use safeAppendFileSync inside withLock instead.
**Type:** CODEBASE
**Verdict:** VERIFIED
**Evidence:**
- `safeAtomicWriteSync` confirmed at `safe-fs.js:206` — reads existing content (if any), writes full content to a tmp file, then renames. Full-file rewrite confirmed from function behavior.
- `safeAppendFileSync` confirmed at `safe-fs.js:109-115` — uses `fs.appendFileSync`, a true append operation
- `withLock` confirmed at `safe-fs.js:614-621`
- D3 claim 11 correctly identifies the distinction. Both functions are exported in the same module (line 623+)
**Notes:** The claim about "expensive for a growing log" is correct: safeAtomicWriteSync scales O(n) per write (reads the whole file each time) vs safeAppendFileSync which is O(1).

#### C-073
**Claim:** Torn lines from mid-write crashes are non-fatal: safeParseLine in parse-jsonl-line.js returns null for blank or malformed lines; readJsonl warns and skips them.
**Type:** CODEBASE
**Verdict:** VERIFIED
**Evidence:**
- `safeParseLine` confirmed at `parse-jsonl-line.js:33-42` — returns null for blank/malformed lines (exactly matching the claim's line range)
- `readJsonl` confirmed at `read-jsonl.js:31-52` — warns (`console.warn`) and skips malformed lines (line 47 specifically)
- The torn-line recovery path is: malformed line → safeParseLine returns null → readJsonl's try/catch catches → `console.warn("Skipping malformed JSON at line N in filename")` → continues
**Notes:** D3's claim about `safeParseLine` at `parse-jsonl-line.js:33-42` is confirmed exactly. The `readJsonl` warning includes line number and filename (confirmed: `line ${i + 1} in ${name}`). The claim description of "warn and skip" is accurate.

### Understanding-Mechanical strand

#### C-040
**Claim:** The comprehension cache key is: unit_type:source_repo_id:target_repo_id:profile_slice_hash. Four fields, colon-delimited. This is the structural identity of the movement, not the content identity.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D11 section 3 (Summary Table) and the worked example (section 8) both confirm this exact key format: `"skill-family:jason-os:sonash:a3f7b1c2"`. The four required fields (unit_type, source_repo_id, target_repo_id, profile_slice_hash) are documented with rationale for each. The "structural identity, not content identity" distinction is explicitly stated in D11 section 4.
**Notes:** D11's worked example concretizes the abstract key design with a real scenario. The key format is consistent across all sections of D11.

#### C-041
**Claim:** The unit_content_hash must NOT be part of the fast-path cache key. Including it would cause the fast path to miss on every file edit, making it useless for actively-developed sources. Content hash belongs in the cache value as a per-entry staleness check.
**Type:** DERIVED + EXTERNAL
**Verdict:** VERIFIED
**Evidence:** D11 section 3 (Field 5 analysis) explicitly argues this with the ccache analogy: "ccache direct mode does NOT hash the raw source file as the primary key. Instead, it hashes the source file to build a manifest." Web search + WebFetch of ccache manual confirmed: the direct mode uses a structural manifest lookup (source file + compiler options) as the key, with include file hashes as the validation step — not the raw source content as the primary key.
**Notes:** The two-level design (structural key + content hash validation) is confirmed by both ccache (manifest + include-hash check) and Bazel (action cache + content-addressable store, confirmed via WebFetch of bazel.build/remote/caching).

#### C-042
**Claim:** The profile_slice_hash must hash only the profile fields that recipes actually consult (gate flags vector + shape conventions for this unit type), not the full profile object. Including irrelevant profile fields causes spurious cache misses — the same anti-pattern Bazel's explicit --action_env allowlist was created to solve.
**Type:** DERIVED + EXTERNAL
**Verdict:** VERIFIED
**Evidence:** Bazel's env leakage problem confirmed via web search: Bazel action cache key includes env variables, and uncontrolled env inheritance causes spurious misses on different machines (GitHub issue #18809, Bazel discuss group). `--action_env` allowlist exists precisely to scope which env variables affect the action key. The parallel to profile fields is sound: only fields that affect recipe applicability should be included in the slice hash.
**Notes:** D11 claim 3 is confirmed HIGH confidence. The Bazel analogy is well-grounded in documented real behavior.

#### C-043
**Claim:** Four cache invalidation triggers: (1) source unit content changes (lazy per-entry staleness check via content_hash_at_last_verdict), (2) target profile re-discovered with different fingerprint (partial invalidation by target_repo_id), (3) recipe library version bump (global invalidation), (4) manual user override (force_recomprehend flag skips lookup).
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D11 section 5 documents all four triggers with rationale. The four triggers are:
1. Per-entry content hash staleness check — sound lazy invalidation pattern
2. Profile fingerprint change → partial invalidation by target — consistent with the profile_slice_hash design
3. Global recipe library version → full invalidation — confirmed by Turborepo's global hash pattern (web search)
4. Manual override via force_recomprehend flag — satisfies the "no silent fire-and-forget" BRAINSTORM constraint
**Notes:** All four triggers are logically coherent and not contradicted by external evidence. Trigger 3 (Turborepo pattern) is supported by Turborepo's documented global hash design.

#### C-044
**Claim:** The comprehension cache lives at .claude/state/comprehension-cache.jsonl — separate from the ledger. Ledger records lineage (what happened). Cache records recipe applicability (what pattern applies). Coupling these produces schema pollution and incorrect query semantics.
**Type:** DERIVED
**Verdict:** VERIFIED
**Evidence:** D11 sections 6 (Option A-D analysis) provides the architectural case for separation. The concern-separation argument (lineage vs recipe applicability) is consistent with standard software engineering principles. The `.claude/state/` location matches the established house style for gitignored per-locale state files (confirmed: 4 existing JSONL files in that directory).
**Notes:** The file does not yet exist (no ledger or cache implementation exists). The location and separation recommendation is verified as architecturally sound.

#### C-045
**Claim:** Fast-path cache hits must surface in the dashboard before any action is taken — they are not executed silently. The fast path is a mode of the dashboard, not a bypass of it. Confidence below 0.8 suppresses the fast path even on a key hit.
**Type:** DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** The "surfaced in dashboard" requirement is cited from BRAINSTORM.md design constraint #1 ("Not a bypass of the dashboard — a mode of it"). This is verifiable in spirit but the BRAINSTORM.md file itself was not directly read during this verification pass. D11 claim 7 rates this HIGH as an "ARCHITECTURE CONSTRAINT."
The 0.8 confidence threshold is explicitly unsubstantiated in D11 (Gap 1: "The 0.8 threshold for suppressing fast-path on low-confidence verdicts is proposed without empirical grounding"). D11 itself flags this as MEDIUM confidence and acknowledges no empirical basis.
**Notes:** The dashboard-surfacing requirement should be VERIFIED (consistent with CLAUDE.md §4 rule 6 "All surfaced data must force acknowledgment"). The 0.8 threshold is UNVERIFIABLE — no empirical or theoretical basis exists pre-implementation.

#### C-064
**Claim:** A two-level cache design (structural key + content-hash validation) mirrors proven build system designs: Bazel uses action cache + content-addressable store; ccache direct mode uses manifest + include-hash validation. Both separate routing (the key) from freshness checking (the value).
**Type:** EXTERNAL
**Verdict:** VERIFIED
**Evidence:**
- Bazel: Confirmed via WebFetch of `bazel.build/remote/caching` — "The remote cache stores two types of data: The action cache, which is a map of action hashes to action result metadata. A content-addressable store (CAS) of output files." Two-level design confirmed.
- ccache: Confirmed via web search of ccache manual — "Based on the hash, a data structure called 'manifest' is looked up in the cache. The manifest contains references to cached compilation results + paths to include files + hash sums of the include files." The manifest is the structural key; include hashes are the freshness check. Two-level design confirmed.
- The "routing vs freshness" separation is accurately characterized.
**Notes:** D11 claim 2 is fully corroborated by two independent official documentation sources.

#### C-065
**Claim:** Recipe library version should be a global cache invalidator at v1 scale (Turborepo pattern for configuration-level changes). Per-recipe versioning is the upgrade path if the library grows to 10+ distinct unit_type recipe sets.
**Type:** EXTERNAL
**Verdict:** UNVERIFIABLE
**Evidence:** Web search found Turborepo caching documentation but did not confirm the specific "global hash for configuration-level changes" claim at the detail level needed. Turborepo does use a hash-based caching system with task-level hashes, but whether it specifically uses a "global hash for config changes" vs per-task hashes as described is not confirmed from the search results. D11 source [2] (`turborepo.dev/docs/crafting-your-repository/caching`) was not fetched directly. The 10+ recipe sets threshold is entirely unsubstantiated — no empirical basis found.
**Notes:** The recommendation (global invalidator at v1 scale) is architecturally sound as a simplicity-first design choice, even if the Turborepo analogy is not directly confirmed. The threshold of "10+" is speculation.

#### C-070
**Claim:** The fastest-path hit rate and verdict divergence rate are the observable quality signals for cache key tuning. A well-tuned key produces >60% hit rate for common file types after the first few ports.
**Type:** METRIC + DERIVED
**Verdict:** UNVERIFIABLE
**Evidence:** Hit rate and miss rate as cache quality signals are a standard cache design principle (D11 claims 5, citing general cache design literature). However, the ">60% hit rate" threshold is entirely unsubstantiated — no empirical measurement, no prior art citation. D11 Gap 1 acknowledges: "Real calibration requires running the understanding layer on a corpus of known unit types and observing the distribution of confidence scores." The 60% threshold is a speculative first-pass estimate with no grounding.
**Notes:** The general principle (hit rate as a quality signal) is VERIFIED. The specific threshold (60%) is UNVERIFIABLE.

---

## Refuted claims (if any) — actionable for re-synthesis

### C-013 (partial refutation — evidence count error, recommendation sound)
D3 and C-013 claim "six existing .claude/state/*.jsonl files." Filesystem inspection confirms **4** JSONL files: `commit-log.jsonl`, `commit-failures.jsonl`, `hook-warnings-log.jsonl`, `label-promote-audit.jsonl`. The remaining state files are `.json` (not `.jsonl`) state management files for brainstorm/deep-plan/deep-research/task-pr-review workflows. The recommendation to place the ledger at `.claude/state/ledger.jsonl` is still correct — re-synthesis should correct "six" to "four" in all instances.

**Impact on C-047:** C-047 repeats the "All six existing .claude/state/*.jsonl files" claim. This should also be corrected to "four" in synthesis.

---

## Conflicted claims (if any) — for dispute resolution

### C-013 / C-047 (count error)
See Refuted section. The specific count "six" is incorrect; "four" is correct. The broader recommendation is sound.

### C-018 (sharding threshold metric)
The 2,000-record threshold and "3-5 years" estimate are derived from an inflated per-record byte estimate (~800 bytes/record). Filesystem measurement shows commit-log records average ~586 bytes/record. Ledger records with 12 flat fields would likely be smaller (300-500 bytes). The practical threshold is directionally correct ("single file for years") but the specific number should be qualified as "at most 2,621 records before 2 MiB ceiling" (a ceiling, not a typical operating point). The claim's conclusion (single file at launch, year-based sharding if needed) is sound.

**Dispute resolution recommendation:** Replace "approximately 2,000 records" with "approximately 2,600 records at 800 bytes/record upper estimate (likely more at realistic ledger record sizes)" in synthesis.

---

## Unverifiable claims (if any) — flag for downgrade or qualification

| Claim | Reason for UNVERIFIABLE | Recommendation |
|---|---|---|
| C-001 | Ledger schema not yet implemented; 12-field claim is a design assertion; D2 introduces additional fields that may conflict with cap | Qualify as "minimum viable design baseline, subject to field-cap reconciliation with D2 edge model fields" |
| C-005 | G.1 incident not confirmable from available files | Qualify as "based on prior project experience; principle is architecturally sound" |
| C-010 | source_status field from D2 not in D1's 12-field set; field-cap conflict unresolved | Flag for planning to resolve D1/D2 field budget tension |
| C-017 | /context-sync doesn't exist yet; ledger inclusion in managed set is an open design question | Qualify as "planning recommendation, not confirmed design" |
| C-045 (partial) | 0.8 confidence threshold — no empirical basis | Qualify threshold as "first-pass proposal, calibrate post-implementation" |
| C-065 (partial) | Turborepo global hash claim not directly confirmed; 10+ recipe threshold is speculation | Qualify as "design principle, not empirically confirmed analogy" |
| C-070 (partial) | ">60% hit rate" threshold has no empirical basis | Qualify as "aspirational target, not a measurable pre-implementation threshold" |

---

## Cross-claim issues

### Issue 1: D1/D2 field-cap tension (affects C-001, C-008, C-010)
D1 establishes a 12-field cap. D2 recommends adding `source_content_hash` (for drift detection), `source_status` (for repo-evolution events), and notes the 4-field edge budget. If all D2 fields are added, the total exceeds 12. D2 itself flags this (section 6, "One constraint to flag"). Planning must resolve which fields are in the minimum viable set vs. minor-bump additions.

### Issue 2: "six JSONL files" error propagates to C-013 and C-047
Both C-013 and C-047 inherit the D3 overcounting error. Re-synthesis should normalize to "four" in both locations.

### Issue 3: Gitignore line number off-by-one (affects C-013, C-014 evidence)
D3 cites `.gitignore:47` for `.claude/state/`. Actual line is 46. Minor evidence citation error; does not affect verdicts. Documentation for the planner's reference.

### Issue 4: source_status field introduces 13th field (affects C-001, C-010)
C-010 recommends `source_status` as "the resolution mechanism" for repo-evolution events. C-001 claims exactly 12 fields are sufficient for all four verbs. These two claims are in tension. The synthesis should note that `source_status` is a candidate for a minor-bump addition (post-launch), not part of the v1 minimum.

### Issue 5: Windows path handling not explicitly addressed (ledger paths)
Several claims assume Unix-style paths in ledger records (`source_path`, `dest_path`). JASON-OS runs on Windows (platform: win32 per env). The ledger's path normalization (forward vs backslash) is not addressed in any of D1-D4 or D11. Planning should define whether ledger paths are normalized to forward slashes (cross-platform safe) or stored as-received (machine-specific). This is a gap across all claims involving path fields.
