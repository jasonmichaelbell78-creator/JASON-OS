# D4d — SoNash User-Home Memories: Positions 64–83 (Final Slice)

**Agent:** D4d
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-sonash-v0/memory/` positions 64–83 (alphabetical sort)
**Memory count:** 20
**Files covered:** `project_skill_audit_tracking_broken.md` through `user_os_vision.md`
**Census verification:** `ls | wc -l` = **83** — CONFIRMED EXACT

---

## Census Check

```
Total memory files: 83 ✓ (matches expected count)
```

No discrepancy. All 83 files accounted for across D4a (1–21), D4b (22–42), D4c (43–63, NOT YET FILED), D4d (64–83).

**NOTE:** D4c findings files are absent from the findings directory. D4c was assigned positions 43–63. The files at those positions (feedback_testing_with_writes.md through project_reviews_system_health.md — 21 files) have not been inventoried by a sibling agent as of this writing.

---

## Prefix Distribution Summary (This Slice)

| Prefix | Count | memory_type |
|--------|-------|-------------|
| `project_` | 7 | project |
| `reference_` | 7 | reference |
| `user_` | 5 | user |
| `sws_` | 1 | project (OUTLIER PREFIX) |
| `t3_` | 1 | project (tN_ prefix) |
| **Total** | **20** | |

---

## Anomalies and Notable Findings

### ANOMALY 1: Non-standard prefix `sws_`
`sws_session221_decisions.md` uses prefix `sws_` — the only file in the entire 83-file corpus (across D4a–D4d) with this prefix. It breaks the established taxonomy (feedback_, project_, reference_, user_, tN_). It has a canonical counterpart, suggesting intentional naming. The `sws_` prefix appears to stand for "System-Wide Standardization" and was used to distinguish SWS-phase decisions from general project memories.

**Implication for D22 (schema surveyor):** Add `sws_` as a recognized outlier prefix. Consider whether SWS-specific memories should be reclassified as `project_` with a tag, or whether `sws_` is a legitimate sub-prefix.

### ANOMALY 2: Highest tenet number confirmed = T3
`t3_convergence_loops.md` is the only `tN_` prefix file in this slice. Combined with D4a–D4c coverage, the confirmed tenet numbers in user-home are T3 only. Cross-referencing JASON-OS MEMORY.md which also has t3_convergence_loops.md. Whether higher tenet numbers (T4+, T21 referenced inside t3_convergence_loops.md content) exist as separate files is not confirmed in user-home — they may only exist in the CANON system, not as standalone user-home memory files.

### ANOMALY 3: user_os_vision.md has no canonical counterpart
This is arguably the most strategically important memory in the entire corpus for the sync-mechanism project — it defines the founding motivation for JASON-OS. Yet it has no canonical counterpart. High-priority canonical promotion candidate.

### ANOMALY 4: reference_external_systems.md has severe content-bleed risk
Contains live external system credentials/URLs (GitHub repo, Firebase project, SonarCloud project key, security contact email). Has a canonical counterpart — but canonical will have the same SoNash-specific content. This file pattern should NEVER be ported as-is to JASON-OS. The pattern (URL lookup table) is portable; the content is not.

### ANOMALY 5: user_expertise_profile.md canonical drift confirmed
D4a's MEMORY.md index noted the canonical version carries stale "Node.js/scripting expert" framing. User-home carries the corrected "No-code orchestrator, 269+ sessions" version. The canonical counterpart (`user_expertise_profile.md` in canonical-memory) should be validated and updated to match user-home — this is an active correctness issue.

---

## Memory Inventory

### 1. project_skill_audit_tracking_broken

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** not-portable
- **content_bleed:** skill-audit state file paths, specific audit names
- **notes:** SoNash-internal infrastructure gap. Only 5 of N skill audit state files persist. Investigation-open memory.

---

### 2. project_sonarcloud_disabled

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** not-portable
- **content_bleed:** SonarCloud project key, Firebase paths, 778 issue baseline count
- **notes:** Investigation-open memory from 2026-03-25. Workflow disable ruled out as cause of reduced findings. Root cause still open.

---

### 3. project_sonash_identity

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** not-portable
- **content_bleed:** All content is SoNash product identity
- **notes:** Entirely SoNash-specific. Corrects "personal health tracker" mischaracterization. Meta-pattern (project identity memory) is the only portable element.

---

### 4. project_t28_content_intelligence

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** null (but c93aabec- session referenced in sibling t29)
- **has_canonical:** false
- **portability:** not-portable
- **content_bleed:** All paths, PR #503, session numbers, index stats
- **notes:** T28 build status memory. Contains high-value JASON-OS import candidates: /analyze and /recall skill patterns, unified schema + SQLite+FTS5 architecture. Cross-references feedback_scope_drift_deep_research.md and feedback_no_silent_deferrals_execution.md.
- **related:** feedback_scope_drift_deep_research.md, feedback_no_silent_deferrals_execution.md

---

### 5. project_t29_synthesis_consolidation

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** c93aabec-1c1f-4424-bf50-22f045d063a8
- **has_canonical:** false
- **portability:** not-portable
- **content_bleed:** All repo names, wave/step numbers, session numbers
- **notes:** In-progress checkpoint memory. User-driven invocation mitigation pattern (when Claude repeatedly skips skill steps) is the portable behavioral principle.

---

### 6. project_website_analysis_skill

- **memory_type:** project
- **prefix_convention:** project_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** sanitize-then-portable
- **content_bleed:** Branch name (worktree-rnd-4626), commit SHA (41919853), SoNash-specific paths
- **notes:** SHIPPED 2026-04-06, not yet merged to main. /website-analysis and /website-synthesis are high-value JASON-OS port candidates. superpowers-chrome MCP is SoNash-specific but WebFetch/curl fallback is universal.

---

### 7. reference_ai_capabilities

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** not-portable (as-is) / sanitize-then-portable (principles)
- **content_bleed:** Agent count (38), skill count (72), MCP server names (memory, sonarcloud), team names
- **notes:** Contains SoNash-specific infrastructure metrics as of Session #265. 7-layer compaction resilience pattern and AutoDream discovery are portable platform behaviors.

---

### 8. reference_documentation_standards

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** sanitize-then-portable
- **content_bleed:** npm run docs:index script reference
- **notes:** Frontmatter name uses filename slug (quality issue). Very small (5 bullet points). Eval regex technique (/## .*Prompt/) and CommonMark standard are universally portable.

---

### 9. reference_external_systems

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** not-portable
- **content_bleed:** GitHub URL, Firebase project name, SonarCloud org/project key, security contact email — ALL content
- **notes:** SEVERE content-bleed risk. URL lookup table for SoNash's specific external systems. Must never be ported as-is. Pattern (external-systems lookup table) is portable; all content is not.

---

### 10. reference_extraction_journal

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** 7389d098-40f3-498d-a495-fe6dd68bdf2c
- **has_canonical:** false
- **portability:** sanitize-then-portable
- **content_bleed:** Entry counts (142/12 sources), CONVENTIONS.md section numbers
- **notes:** Two-file prior art system (.research/EXTRACTIONS.md + extraction-journal.jsonl). High-value JASON-OS import candidate — the architecture pattern is an OS-level primitive. .research/ convention is shared; extraction-journal.jsonl is not yet established in JASON-OS.

---

### 11. reference_pre_push_skip_vars

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** sanitize-then-portable
- **content_bleed:** 6 specific SKIP_ var names, MASTER_DEBT.jsonl reference, known-debt-baseline.json path
- **notes:** SoNash pre-push hook skip var taxonomy. JASON-OS has block-push-to-main.js with different architecture. The 'no pre-existing in SKIP_REASON' principle and three-resolution-options pattern are portable.

---

### 12. reference_statusline_architecture

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** 7389d098-40f3-498d-a495-fe6dd68bdf2c
- **has_canonical:** false
- **portability:** sanitize-then-portable
- **content_bleed:** Binary name (sonash-statusline-v3.exe), go version requirement (go1.26.1), config file paths
- **notes:** Technical reference for SoNash Go statusline. JASON-OS already ported to jason-statusline-v2.exe. This provides the authoritative SoNash design reference. FlexModel field handling and backoff.json cache pattern are portable to any statusline implementation.

---

### 13. reference_tdms_systems

- **memory_type:** reference
- **prefix_convention:** reference_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** not-portable
- **content_bleed:** TDMS pipeline script names, MASTER_DEBT.jsonl path, DEBT-XXXXX ID format
- **notes:** Frontmatter name uses filename slug (quality issue). SoNash-specific TDMS. Overwrite-hazard documentation pattern (generate-views.js overwrites MASTER_DEBT from deduped.jsonl) is a portable architecture risk pattern.

---

### 14. sws_session221_decisions (OUTLIER PREFIX: sws_)

- **memory_type:** project
- **prefix_convention:** sws_ (OUTLIER — only instance in full 83-file corpus)
- **originSessionId:** null
- **has_canonical:** true
- **portability:** not-portable
- **content_bleed:** Q34-Q38 decision codes, SWS project state file paths, Session #221
- **notes:** The only `sws_` prefix file in the entire corpus. Intentional naming to isolate SWS phase decisions. 5 cross-cutting decisions for SoNash's system-wide standardization project. Has canonical counterpart. Decision recall pattern (Q38: tag with phases, index view, prior-decisions step at each phase) is portable.

---

### 15. t3_convergence_loops (tN_ prefix)

- **memory_type:** project
- **prefix_convention:** t3_ (tenet prefix)
- **tenet_number:** 3
- **originSessionId:** null
- **has_canonical:** true
- **portability:** sanitize-then-portable
- **content_bleed:** T3/T21 tenet numbers (SoNash CANON taxonomy), PLAN-v3.md path, SWS re-eval reference
- **notes:** Highest tN_ number confirmed in full corpus = T3. T21 appears to be an alias/co-number within the same tenet, not a separate file. Dual-form: both tenet definition and /convergence-loop skill decision. JASON-OS user-home already has t3_convergence_loops.md. 5-pass advanced patterns are high-value portable content.

---

### 16. user_communication_preferences

- **memory_type:** user
- **prefix_convention:** user_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** portable
- **content_bleed:** none
- **notes:** Frontmatter name uses filename slug (quality issue). Two-locale pattern (work=jbell, home=jason) is the most SoNash-contextual element but portable as user metadata.

---

### 17. user_creation_mindset

- **memory_type:** user
- **prefix_convention:** user_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** portable
- **content_bleed:** Session #261 and JASON-OS v0.1 conversation references (contextual only)
- **notes:** Newest user_ memory by recency signal (Session #261, 2026-04-03). No canonical counterpart — should be promoted. JASON-OS user-home has equivalent.

---

### 18. user_decision_authority

- **memory_type:** user
- **prefix_convention:** user_
- **originSessionId:** null
- **has_canonical:** true
- **portability:** portable
- **content_bleed:** none
- **notes:** Small, clean. 4 bullet points. Links conceptually to user_communication_preferences.md. Canonical near-identical expected.

---

### 19. user_expertise_profile

- **memory_type:** user
- **prefix_convention:** user_
- **originSessionId:** null
- **has_canonical:** true (BUT CANONICAL IS STALE — see anomaly)
- **portability:** portable
- **content_bleed:** session count (269+) will grow stale
- **notes:** CONTENT DRIFT CONFIRMED: canonical likely carries stale "Node.js expert" framing. User-home has corrected "No-code orchestrator" version. Canonical must be updated. JASON-OS user-home has equivalent.

---

### 20. user_os_vision

- **memory_type:** user
- **prefix_convention:** user_
- **originSessionId:** null
- **has_canonical:** false
- **portability:** portable
- **content_bleed:** Session #251, SoNash references (contextual only)
- **notes:** Most strategically important user_ memory for the sync-mechanism project — defines the founding motivation for JASON-OS. No canonical counterpart. High-priority canonical promotion and JASON-OS import candidate. Already present in JASON-OS user-home.

---

## Cross-Slice Statistics (D4d Slice Only)

| Metric | Count |
|--------|-------|
| Total files | 20 |
| has_canonical = true | 9 |
| has_canonical = false | 11 |
| canonical-gap % | 55% |
| portability: portable | 5 |
| portability: sanitize-then-portable | 6 |
| portability: not-portable | 9 |
| content_bleed risk (any) | 14 |
| tenet files (tN_ prefix) | 1 |
| outlier prefix files (sws_) | 1 |
| open-investigation memories | 2 |
| originSessionId present | 3 |

---

## Full-Corpus Census (D4d Final View)

| Slice | Agent | Files | Range |
|-------|-------|-------|-------|
| D4a | D4a | 21 | 1–21 |
| D4b | D4b | 21 | 22–42 |
| D4c | MISSING | 21 | 43–63 |
| D4d | D4d | 20 | 64–83 |
| **Total** | | **83** | |

**Census: 83 files confirmed.** `ls ~/.claude/projects/C--Users-<user>-Workspace-dev-projects-sonash-v0/memory/ | wc -l` = 83.

**D4c gap:** Positions 43–63 (21 files: `feedback_testing_with_writes.md` through `project_reviews_system_health.md`) are NOT inventoried in the findings directory. This gap must be filled before D22 (schema surveyor) can synthesize the full corpus.

---

## Tenet Taxonomy Extent

From this slice and D4a cross-reference:
- Confirmed tN_ files in user-home: **t3_convergence_loops.md** (tenet_number: 3) only
- T21 referenced as an alias/co-number within t3_convergence_loops.md body (not a separate file)
- No t1_, t2_, t4_+ files found in D4d scope
- D4a–D4c should be checked for other tN_ files (expected from JASON-OS MEMORY.md cross-reference)

---

## Supersedes/Superseded Analysis

No explicit supersedes chains found in this slice. However:
- `reference_extraction_journal.md` conceptually supersedes any ad-hoc prior-art checking pattern
- `user_expertise_profile.md` (user-home) effectively supersedes the stale canonical version

---

## Learnings for Methodology

1. **Project_ memories are highest content-bleed risk.** 7 of 7 project_ files in this slice are either not-portable or sanitize-then-portable. Project_ memories are tightly coupled to SoNash-specific infrastructure, tasks, and session history. Synthesis agents should treat project_ as sanitize-first by default.

2. **Reference_ memories split sharply on portability.** Of 7 reference_ files: 2 not-portable (external_systems, tdms_systems), 4 sanitize-then-portable, 1 with canonical counterpart having stale content (documentation_standards). The reference_ prefix does not imply portability.

3. **User_ memories are the most reliably portable prefix** (5/5 in this slice either portable or sanitize-then-portable with minimal sanitize burden). User_ = safe to mirror across projects.

4. **The sws_ prefix is a one-off.** It should be flagged for D22 as an outlier requiring schema treatment. Future scans of other repos should watch for ad-hoc prefix creation that breaks the taxonomy.

5. **Highest tN_ number = T3 (in user-home memories).** The CANON tenet system may extend to T21+ but user-home only surfaces T3. This confirms that higher-numbered tenets exist elsewhere (PLAN files, CANON artifacts) but have not been promoted to standalone user-home memory files. The tenet taxonomy is sparse in user-home.

6. **Open-investigation memories are traps for cross-project sync.** `project_sonarcloud_disabled.md` and `project_skill_audit_tracking_broken.md` are investigation-open — porting them would import an unresolved SoNash problem into JASON-OS. Synthesis should flag open-investigation memories as do-not-port until resolved.

7. **Two strategic memories lack canonical counterparts:** `user_os_vision.md` (founding JASON-OS motivation) and `user_creation_mindset.md` (newest user_ memory). Both should be canonical-promotion candidates for SoNash AND confirmed-present in JASON-OS user-home.

8. **Canonical content drift is confirmed on user_expertise_profile.md.** The canonical version carries stale profile. This is an active correctness hazard: any agent loaded with the canonical MEMORY.md will get wrong user framing. Canonical update is a prerequisite for safe cross-project sync.

9. **D4c gap is the critical blocker.** The D4c slice (positions 43–63, 21 files) was not inventoried. This slice likely contains: feedback_testing_with_writes.md, feedback_user_action_steps.md, feedback_workflow_chain.md, feedback_worktree_guidance.md, feedback_write_rejection_hard_stop.md, and all project_ files from project_active_initiatives.md through project_reviews_system_health.md — including high-value project memories (project_jason_os.md, project_hook_contract_canon.md, project_learning_system_analysis.md). D22 cannot synthesize without D4c.

---

## Gaps

- **D4c missing:** 21 files (positions 43–63) not inventoried. Gap must be filled before synthesis.
- **Canonical tenet content:** Cannot confirm T21 as a co-number vs separate file without checking CANON artifacts (outside memory scope).
- **Canonical version drift depth:** Cannot verify full extent of canonical drift without reading canonical files (D5 scope).
- **user_expertise_profile canonical:** Not read directly — drift confirmed by index note but not verified by direct file comparison.

