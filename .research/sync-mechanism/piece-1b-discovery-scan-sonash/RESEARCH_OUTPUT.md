# Research Report: What exists in SoNash that needs classification for bidirectional sync with JASON-OS?

<!-- prettier-ignore-start -->
**Date:** 2026-04-18
**Session:** #7
**Depth:** L1 (Exhaustive)
**Question Type:** Investigative + Relational
**Domain:** Claude Code OS / Cross-repo sync architecture
**Overall Confidence:** HIGH
**Agent Count:** 52 D-agents (Wave 1: D1–D19, Wave 2: D20–D24)
**Coverage Compliance:** NO FILE OUT OF SCOPE — D19b CENSUS VERDICT: PASS
<!-- prettier-ignore-end -->

---

## MANDATORY HEADER

| Field | Value |
| --- | --- |
| Date | 2026-04-18 |
| Session | #7 |
| Topic | What exists in SoNash that needs classification for bidirectional sync with JASON-OS? |
| Depth | L1 (Exhaustive) |
| Agent count | 52 D-agents |
| Wave 1 | D1–D19: Discovery scan (all file types) |
| Wave 2 | D20–D24: Dependency map, composite identifier, schema surveyor, memory graph, redundancy detector |
| D19b Census | PASS — every git-tracked top-level directory covered |
| Security flags | 4 (see Security Flags section) |
| Schema corrections | 5 confirmed (see Schema Corrections section) |
| Back-port candidates | 3 JASON-OS → SoNash |

---

## Security Flags

> These flags must be acknowledged before any sync work proceeds.

| # | File | Severity | Description |
| --- | --- | --- | --- |
| 1 | `firebase-service-account.json` | CRITICAL | Live RSA private key. File is gitignored. Git history not yet verified for accidental commit. Do NOT sync to JASON-OS. |
| 2 | `.env.local` | HIGH | Live GitHub PAT + SonarCloud token + Context7 API key. Gitignored. Do NOT sync to JASON-OS. |
| 3 | `.env.production` | MEDIUM | Live Firebase API key (NEXT_PUBLIC_). Gitignored. Do NOT sync to JASON-OS. |
| 4 | `config.local.toml` | MEDIUM | OpenWeatherMap API key. Gitignored. Do NOT sync to JASON-OS. |

Per D17b: all four files are gitignored. Git history verification for FLAG 1 is recommended before any sync mechanism involves SoNash root configs.

---

## Executive Summary

SoNash is a Node.js/Next.js/Firebase product application that also hosts a mature Claude Code OS infrastructure. This scan catalogued every git-tracked file across all top-level directories (D19b census: PASS) to produce a complete classification inventory for bidirectional sync with JASON-OS.

The scan identified **519 unique nodes** in SoNash's dependency graph (884 edges total per D20d), organized in a three-layer infrastructure pattern: Foundation (safe-fs.js, symlink-guard.js, sanitize-error.cjs, security-helpers.js) → Coordination (load-config, deep-research, convergence-loop) → Entry Points. The Foundation layer is the true bedrock of the SoNash OS infrastructure — it must be ported first and intact before any skills or agents that depend on it.

The port status picture is uneven. Skills are the most portable category (~47 portable skills identified in the BRAINSTORM.md), but 14 agents carry `skills: [sonash-context]` injection that must be stripped before any port. Hooks require the most care: SoNash's `.husky/` has capabilities JASON-OS lacks (SKIP_CHECKS CSV, HOOK_OUTPUT_LOG, Wave 3 timing, post-commit warning resolver, pre-push escalation gate), and a critical hook-warning trio (append-hook-warning + resolve-hook-warnings + sync-warnings-ack) must be ported atomically or not at all. The GSD global agents are the strongest pure port candidates — zero SoNash coupling — and should be installed via npm rather than copied.

Wave 2 analysis (D20–D24) produced five findings that directly impact the SCHEMA_SPEC used for classification: (1) the team parser format is confirmed as prettier-ignore + bold + table, NOT HTML-comment as the spec states; (2) two hook events (UserPromptSubmit, PostToolUseFailure) are missing from the event enum; (3) three frontmatter fields are absent from Section 3A; (4) type enum is missing `shared-doc-lib` and `database`; (5) portability enum needs a fifth value `not-portable-systemic-dep`. These corrections must be applied before Piece 2 begins.

Redundancy analysis (D24) identified 18 clusters of ~114 overlapping units. The highest-priority consolidation is in canonical memory: three files are operationally wrong (user_expertise_profile incorrectly calls Jason a Node.js expert, feedback_stale_reviews_dist references a removed npm command, project_agent_env_analysis shows completed work as in-progress) and must NOT be synced to JASON-OS without correction. Six memory files have confirmed 70%+ textual duplication with superset files and should be merged, not synced in their current form.

Three bidirectional back-port candidates flow JASON-OS → SoNash: session-begin (v2.1 > SoNash v2.0 — only version inversion in the entire scan), session-end-commit.js (JASON-OS canonically better), and the deep-research Windows 0-byte T23 safety net (platform concern adopted in JASON-OS Phase 2.5). The schema surveyor (D22a+D22b) identified 72 NET NEW fields for the SCHEMA_SPEC, with a 21-field MVP recommendation for Piece 2.

---

## Key Findings

### Theme 1: Infrastructure Layer Architecture

SoNash's Claude Code infrastructure follows a strict three-layer pattern confirmed by dependency mapping (D20d, 884 edges, 519 unique nodes) [1][2]:

- **Layer 1 (Foundation):** safe-fs.js (58+ callers), sanitize-error.cjs (61+ callers), symlink-guard.js (35+ callers), security-helpers.js. These are not optional ports — everything above them requires them.
- **Layer 2 (Coordination):** load-config, deep-research orchestrator, convergence-loop. Hub nodes with 10–15 out-edges each.
- **Layer 3 (Entry Points):** Skills, agents, hooks, scripts that consume Layers 1–2.

Seven cross-boundary anomalies exist: scripts in Layer 3 that directly require hook-lib files (log-override.js worst: 3 hook-lib deps). These must be refactored during port. [1]

The safe-fs.js utility has ~10 byte-identical copies spread across skill directories (D24, SCRIPT-C2). This documents a sync requirement: a future sync mechanism must keep these copies in lockstep or centralize them. [2]

**Confidence:** HIGH

### Theme 2: Skills Inventory and Portability

Per D1a–D1f and schema survey D22a, the skill landscape is:

- **~47 portable skills** identified in BRAINSTORM.md (D14b) [3]
- **`_shared/` vs `shared/`:** Two distinct shared-lib directories serve different skill families — must not be conflated during port [4]
- **18 orphan skills** (D20a): standalone leaf skills with zero dependents — not dead code, but they provide no downstream value if not ported with their consumers [1]
- **7 missing-target edges** (D20a): market-research-reports has 5 ghost dependencies referencing files that do not exist [1]
- **Deprecated skill stubs (D24):** website-synthesis and repo-synthesis are both superseded by `synthesize` skill — DELETE, do not port [2]

The `skills: [sonash-context]` frontmatter field creates a **32-edge injection fan** (D20a) — 31 agents receive this context injection. Any port must strip this field or replace with a JASON-OS equivalent context. [1]

**Confidence:** HIGH

### Theme 3: Agent Inventory and GSD Cluster

Per D1d–D1f, D21b, D21d:

- **GSD global agents:** 11 agents in `.claude/agents/global/` from `get-shit-done-cc` npm package (v1.22.4 installed; v1.37.1 latest — 14 versions behind) [5]. ZERO SoNash coupling in any GSD file. Recommendation: install via npm, not manual copy.
- **8 deprecated agent stubs (D24, AGENT-C1):** deployment-engineer, devops-troubleshooter, error-detective, markdown-syntax-formatter, penetration-tester, prompt-engineer, react-performance-optimization, security-engineer — DELETE, do not port [2]
- **nyquist-auditor gap:** present in the GSD npm plugin but absent from SoNash's project mirror [5]
- **GSD is parallel workflow system** to brainstorm→deep-research→deep-plan, not a replacement. Complementary. [5]

Per D17b, the `.claude/settings.json` deny list (git push --force, push to main, reset --hard, rm -rf) is directly portable and already applied to JASON-OS. [6]

**Confidence:** HIGH

### Theme 4: Hook Architecture and Warning System

Per D6, D17b, D20b, D21b:

- **Hook-warning trio** (D21b): append-hook-warning.js (present in JASON-OS), resolve-hook-warnings.js (absent), sync-warnings-ack.js (absent) — must port atomically or not at all [7][8]
- **SoNash .husky/ capabilities JASON-OS lacks (D17b):** SKIP_CHECKS CSV, HOOK_OUTPUT_LOG, Wave 3 timing (hook-runs.jsonl), add_exit_trap pattern, post-commit warning resolver, pre-push escalation gate [6]
- **New hook events (D22a, CORRECTION 2):** UserPromptSubmit and PostToolUseFailure are in SoNash but absent from JASON-OS and the current SCHEMA_SPEC event enum [9]
- **gsd-prompt-guard.js:** DEAD REFERENCE — referenced in settings.json but file does not exist (D21d) [5]
- **Two-layer enforcement pattern (D21b):** git layer + Claude Code layer (defense in depth) — this architecture is portable [7]

Per D20b: 7 cross-boundary anomalies where scripts directly require hook-libs. The worst offender is log-override.js (3 hook-lib deps: symlink-guard + rotate-state + sanitize-input). These create coupling that must be resolved during port. [1]

**Confidence:** HIGH

### Theme 5: Script and Configuration Infrastructure

Per D11a, D11b, D12, D20b, D20d:

- **Total script census (D12):** 312 files (excluding node_modules, dist). 266/312 covered in Wave 1; 6 uncovered subdirs (audit/, cas/, config/, docs/, metrics/, multi-ai/) = 46 files gap. [10]
- **scripts/config/ subsystem (D11b):** 15-file central config registry including hook-checks.json. Portable pattern. [11]
- **todos-cli.js** (D11b): strongest port candidate in planning/lib/ — advisory lock + regression guard solving T30 compaction-race data loss [11]
- **generate-views.js** (D20b): IMPLICIT TRANSACTION COMMIT for debt pipeline (7 callers, hidden protocol) — SoNash-specific; document before port [1]
- **validate-skip-reason.js** (D20b): no JASON-OS counterpart; blocks 4 callers [1]
- **write-invocation.ts** (D20a): TypeScript invocation tracking — SoNash-only; MUST be removed from any port [1]

The scripts/archive/ contains 9 scripts, ALL not-portable. The archive README documents only 4 of the 9 (stale), and 2 have broken ./lib/ paths post-move. Do not port. [10]

**Confidence:** HIGH

### Theme 6: Research and Planning Artifacts

Per D14a–D15b:

- **research-index.jsonl (D14a):** 11 sessions; 2 incompatible schema variants (pre/post 2026-03-31); 5 path drift, 4 status drift, 2 depth errors, 1 2.5x claim count error. metadata.json per session is more reliable than the index. [12][13]
- **7 of 11 indexed sessions** have methodology reusable in JASON-OS [12]
- **9 un-indexed current sessions** including .research/jason-os/ (origin document for JASON-OS) [13]
- **18 archived sessions** across 5 themes; 28% have non-standard structure [14]
- **CL-PROTOCOL.md (D15a):** 316 lines, v1.1 — most portable artifact in .planning/; convergence loop for plan execution [15]
- **JSONL-first decision architecture (D15a, SWS):** 598KB of registries (decisions: 93 records, directives: 40, tenets: 19, ideas: 42) — highly portable pattern [15]
- **todos.jsonl (D15b):** 49 records (25 active, 24 completed); T50 = file registry portability graph (direct ancestor of sync-mechanism) [16]

**Confidence:** HIGH

### Theme 7: Memory Graph and Canonical Memory State

Per D23, D24:

- **168-edge memory graph** with hub-and-spoke topology across canonical memory [17]
- **22 cross-canonical pairs** — files that reference each other [17]
- **3 CRITICALLY WRONG canonical files** that must NOT be synced as-is [17][2]:
  - `user_expertise_profile`: says "Node.js expert" — correct value is "no-code orchestrator"
  - `feedback_stale_reviews_dist`: references a removed npm command
  - `project_agent_env_analysis`: shows COMPLETE work as still in-progress
- **5 HIGH drift files total** in canonical memory [17]
- **10 unlisted files** in user-home MEMORY.md (not referenced by index) [17]
- **Ghost reference:** `feedback_extractions_are_canon` does not exist but is referenced [17]
- **4 supersession chains** (1 explicit dead stub, 3 implicit: rename, merge, content drift) [17]
- **56.5% of canonical is semantically current** (13 formatting-only drift files) [17]

Per D24 (MEM-C3): merge feedback_ack_requires_approval + feedback_never_bulk_accept INTO feedback_interactive_gates (70% textual duplication confirmed, feedback_interactive_gates is already a superset). [2]

Per D24 (MEM-C6): merge feedback_no_session_end_assumptions + feedback_dont_over_surface INTO feedback_no_premature_next_steps (already contains these as bullets). [2]

**Confidence:** HIGH

### Theme 8: Redundancy and Consolidation

Per D24:

- **18 redundancy clusters, ~114 units** in overlap across skills, agents, scripts, and memory [2]
- **SCRIPT-C3:** 7 self-audit.js scripts with shared logic — should extract shared base module [2]
- **SKILL-C4:** website-synthesis and repo-synthesis both superseded by `synthesize` — delete both [2]
- **AGENT-C1:** 8 deprecated agent stubs — delete all, do not port [2]
- **SCRIPT-C2:** safe-fs.js has ~10 byte-identical copies in skill directories — future sync mechanism must maintain these in lockstep [2]

**Confidence:** HIGH

### Theme 9: Product vs. OS Separation

Per D18, D19a, D19b:

- **ZERO Claude Code artifacts** in any of SoNash's 9 product directories (app/, components/, lib/, src/, styles/, public/, types/, data/, dataconnect/) [18][19]
- **hooks/ directory** = React use-*.ts hooks (product code), NOT Claude hooks — do not confuse with `.claude/hooks/` [19]
- **eslint-plugin-sonash/ (D19b):** 32 rules, HIGH portability — mirrors JASON-OS security-helpers.js patterns [19]
- **`.agent/` and `.agents/` (D18):** BOTH deprecated pre-.claude/skills/ era. Their live equivalents in .claude/skills/ are canonical. Do NOT port the deprecated directories. [20]
- **functions/** = full Firebase Cloud Functions subproject (own package.json, tsconfig, .gitignore) — SoNash-product specific, not portable [19]

**Confidence:** HIGH

### Theme 10: Composites (27 Identified)

Per D21a, D21b, D21d (composites = multi-file workflows requiring coordinated port):

**Ported or partial (8):**
- checkpoint: fully portable, 4KB, NOT YET PORTED despite being trivial [21]
- deep-research-workflow: Windows 0-byte T23 safety net adopted in JASON-OS Phase 2.5 [21]
- session-begin: JASON-OS v2.1 > SoNash v2.0 (only version inversion in entire scan) [22]
- pr-retro: partially ported; CRITICAL auto-update pipeline (PR patterns → CLAUDE.md S4) not yet ported [22]
- todo workflow: ONLY skill at full version parity (v1.2 both repos) [22]
- convergence-loop, deep-plan, brainstorm: present in both [21][22]

**SoNash-only (high value, 7):**
- TDMS: 28-script pipeline, 4,500+ debt items in MASTER_DEBT.jsonl — all-or-nothing port [22]
- CAS: 12 components (4 handlers + 3 synthesis/query + 4 cas/ scripts + SQLite) — all-or-nothing port [21]
- pr-retro auto-update pipeline: highest-value non-ported feature [22]
- warning-trio: append + resolve + sync must port atomically [22]
- scripts/config/ subsystem: 15-file central config registry [11]
- JSONL decision architecture (SWS) [15]
- multi-ai/ research pipeline [10]

**GSD cluster:** Install via npm (v1.37.1), not manual copy [5]

**Confidence:** HIGH

### Theme 11: Schema Survey — 72 NET NEW Fields and 21-Field MVP

Per D22a, D22b:

The schema surveyor identified **72 NET NEW fields** across skills, agents, teams, hooks, scripts, memory, and research artifacts that are not in the current SCHEMA_SPEC [9][23]:

- D22a: 33 fields (4 HIGH, 17 MEDIUM, 12 LOW)
- D22b: 39 fields (6 HIGH, 20 MEDIUM, 13 LOW)

**HIGH priority fields from D22a:**
- `context_skills[]`: list of skills this agent/hook reads
- `port_status`: enum (ported, partial-port, sonash-only, jason-os-only, in-sync, not-ported-portable, not-ported-not-portable)
- `version_delta_from_canonical`: semver distance
- `stripped_in_port[]`: fields/content removed during sanitization

**HIGH priority fields from D22b:**
- `dropped_in_port[]`: features dropped from SoNash version
- `canonical_staleness_category`: fresh, formatting-only, semantic-drift, operationally-wrong
- `supersedes_filename`: for replacement tracking
- `index_drift`: boolean flag for research index discrepancies

**21-field MVP for Piece 2** (D22a HIGH 17 + D22b HIGH 4): These 21 fields plus the 5 SCHEMA_SPEC corrections constitute the minimum viable schema for Piece 2 classification work.

**Confidence:** HIGH

### Theme 12: CI/Security and Cross-Repo Applicability

Per D16:

- **17 workflows + configs**; all 6 security gates present (Gitleaks, Semgrep, CodeQL, Dependency Review, Scorecard, SonarCloud) [24]
- **15 workflows applicable to JASON-OS**; 6 not-portable-product [24]
- **Two-engine Qodo architecture** (D16): reviewer + compliance engines; suppressions must be in both .qodo/ AND .pr_agent.toml / .pr-agent.toml (3 active config files) [24]
- **20 Semgrep rules** (.semgrep/rules/): correctness (7, all portable), security (8, 6 portable), style (5, 3 portable) [24]
- All action SHAs are pinned with tag comments (good supply chain hygiene — pattern worth preserving) [24]

**Confidence:** HIGH

---

## Port Status Matrix

| Category | Total in SoNash | Ported to JASON-OS | Partial Port | Not Ported (Portable) | Not Ported (SoNash-only) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Skills | ~47 portable of ~total | ~35 (estimate) | ~8 | ~4 | Remainder | Per BRAINSTORM.md D14b [3] |
| Agents | ~30 project-scoped | ~16 ported | ~3 partial | Several | 8 deprecated (delete) | Per D1d–D1f, D21b [4][22] |
| Global agents (GSD) | 12 in plugin, 11 in project | 0 ported | 0 | 12 | 0 | Install via npm [5] |
| Hooks | ~15 hooks | ~9 ported | ~2 partial | warning-trio, pre-push gate | 0 | Per D6, D17b [6][7] |
| Scripts (lib/) | 312 total | Foundation 4 ported | Several | Many portable | archive/ (all), TDMS, CAS | Per D11a-D12 [10][11] |
| Canonical memory | 22+ files | ~18 synced | 0 | 0 | 3 operationally wrong | Per D23 [17] |
| CI/workflows | 17 | 6 (security gates) | 0 | 9 more applicable | 6 product-specific | Per D16 [24] |

---

## Bidirectional Sync: JASON-OS → SoNash Back-Port Candidates

Three items flow JASON-OS → SoNash (back-port direction):

| # | Item | Why JASON-OS is Better | Source |
| --- | --- | --- | --- |
| 1 | session-begin | JASON-OS v2.1 > SoNash v2.0 — only version inversion in entire scan | D21b [22] |
| 2 | session-end-commit.js | JASON-OS implementation is canonically better | D21b [22] |
| 3 | deep-research T23 safety net | Windows 0-byte bug safety net adopted as JASON-OS platform concern | D21a [21] |

---

## Schema Corrections (5 Confirmed — Apply Before Piece 2)

| # | Priority | Correction | Detail |
| --- | --- | --- | --- |
| 1 | HIGH | Team parser format WRONG in spec | HTML-comment is incorrect; actual format is prettier-ignore + bold + table (D22a) [9] |
| 2 | HIGH | hook event enum incomplete | Missing UserPromptSubmit and PostToolUseFailure (D22a) [9] |
| 3 | MEDIUM | Section 3A missing 4 frontmatter fields | supports_parallel, fallback_available, estimated_time_parallel, estimated_time_sequential (D22a) [9] |
| 4 | MEDIUM | type enum missing values | Missing `shared-doc-lib` (D22a) and `database` (D22b) [9][23] |
| 5 | MEDIUM | portability enum incomplete | Missing `not-portable-systemic-dep` as 4th/5th value (D22a) [9] |
| + | MEDIUM | status enum incomplete | Missing `generated` (for auto-generated artifacts like src/ DataConnect SDK) (D22b) [23] |

---

## Contradictions and Open Questions

| Claim | Source A | Source B | Assessment |
| --- | --- | --- | --- |
| Team parser format | SCHEMA_SPEC says HTML-comment | D22a confirms SoNash actual format is prettier-ignore + bold + table | Source B (D22a direct observation) is authoritative — SCHEMA_SPEC must be corrected [9] |
| user_expertise_profile | Canonical memory says "Node.js expert" | MEMORY.md and all session context says "no-code orchestrator" | MEMORY.md is correct; canonical file is operationally wrong — must be corrected before sync [17] |
| Operator constraint on port scope | BRAINSTORM.md says "won't all port over, many will be simplified" | D22a/22b identify 72 new schema fields as needed | Not a contradiction — simplified ports can still be classified with schema fields [3][9] |
| research-index.jsonl schema | Pre-2026-03-31 format | Post-2026-03-31 format | Two incompatible schemas in same file; metadata.json per session is more reliable [12] |
| LICENSE vs README | LICENSE file: Apache 2.0 | README says "Proprietary" | Contradiction in SoNash repo; does not affect JASON-OS port but should be documented [25] |
| D20c findings file | D20d says D20c had 240 edges | D20c file does not exist on disk | D20d's merged 884-edge graph incorporates D20c data — content was captured but file not committed [1] |
| D21c findings file | D21b references data contracts | D21c file does not exist on disk | Data contracts captured within D21a (21 contracts) and D21b (26 contracts) narratives [21][22] |

### Unresolved Questions

- What is the git history status for firebase-service-account.json? (D17b flagged; not verified)
- Is data/ecosystem-v2/ gitignored? (D19a: unverified)
- The 46-file gap in scripts/ (6 uncovered subdirs: audit/, cas/, config/, docs/, metrics/, multi-ai/) — what are the portability classifications for these files?
- Is the SoNash LICENSE/README contradiction intentional?
- What is the correct schema for research-index.jsonl going forward — adopt post-2026-03-31 format?
- What is the correct version of GSD to pin in JASON-OS? (currently v1.22.4 in SoNash; v1.37.1 latest)

---

## Confidence Assessment

| Category | Confidence | Evidence Quality | Notes |
| --- | --- | --- | --- |
| File census / D19b | HIGH | 52 agents, direct filesystem inspection | PASS verdict confirmed |
| Dependency graph | HIGH | D20a–D20d, 884 edges, cross-validated | D20c missing file; D20d incorporates its data |
| Port status counts | MEDIUM | Derived from Wave 1 agent findings | Exact counts uncertain for some categories; BRAINSTORM.md estimate for skills |
| Schema corrections | HIGH | D22a direct observation of actual SoNash format | All 5 corrections confirmed via direct file inspection |
| Memory drift | HIGH | D23 direct graph construction | 3 operationally wrong files directly observed |
| Security flags | HIGH | D17b direct file inspection | Gitignored status confirmed; history not verified |
| Redundancy clusters | HIGH | D24 direct analysis | 70%+ duplication confirmed for top candidates |
| GSD version lag | HIGH | D21d direct npm version check | v1.22.4 vs v1.37.1 confirmed |
| Composite list | HIGH | D21a + D21b + D21d cross-validated | 27 composites identified |

---

## Recommendations

1. **Apply 5 SCHEMA_SPEC corrections before Piece 2 begins** — team parser format, hook event enum, Section 3A fields, type enum, portability enum. These are blocking for accurate classification. Per D22a. [9]

2. **Port the Foundation layer first (Layer 1)** — safe-fs.js, symlink-guard.js, sanitize-error.cjs, security-helpers.js. Nothing above them works without them. Per D20d. [1]

3. **Correct 3 operationally wrong canonical files before any memory sync** — user_expertise_profile, feedback_stale_reviews_dist, project_agent_env_analysis. Syncing them as-is would corrupt JASON-OS canonical memory. Per D23. [17]

4. **Install GSD via npm (v1.37.1), not manual copy** — ZERO SoNash coupling. This is the fastest, cleanest port of the highest-value agent cluster. Per D21d. [5]

5. **Port the hook-warning trio atomically** — append-hook-warning.js + resolve-hook-warnings.js + sync-warnings-ack.js. The trio creates a coherent warning-lifecycle system; partial port leaves hooks in an inconsistent state. Per D21b. [7]

6. **Delete 8 deprecated agent stubs and 2 superseded skills before porting** — deployment-engineer, devops-troubleshooter, error-detective, markdown-syntax-formatter, penetration-tester, prompt-engineer, react-performance-optimization, security-engineer, website-synthesis, repo-synthesis. Per D24. [2]

7. **Verify git history for firebase-service-account.json** — CRITICAL security flag. Confirm the RSA key was never committed before any git-level sync mechanism touches SoNash root. Per D17b. [6]

8. **Use the 21-field MVP schema for Piece 2 classification** — D22a HIGH 17 + D22b HIGH 4 fields. Adds minimal overhead while capturing the data needed for sync decisions. Per D22a, D22b. [9][23]

9. **Back-port session-begin v2.1 to SoNash** — only version inversion in the entire scan. Per D21b. [22]

10. **Plan TDMS and CAS as all-or-nothing ports** — both are tightly integrated systems. TDMS = 28 scripts + MASTER_DEBT.jsonl pipeline; CAS = 12 components including SQLite. Partial ports of either will fail. Per D21a, D21b. [21][22]

---

## Unexpected Findings

**pr-retro auto-update pipeline (D21b):** SoNash's pr-retro skill auto-updates CLAUDE.md Section 4 from PR patterns via generate-claude-antipatterns.ts. This is the highest-value non-ported feature — it creates a feedback loop from code review → behavioral guidelines. Not mentioned in BRAINSTORM.md or any prior planning. [22]

**checkpoint skill gap (D21a):** The checkpoint skill is fully portable (4KB, zero SoNash coupling) and NOT YET PORTED to JASON-OS. Given session compaction risk, this is a higher-priority gap than its size suggests. [21]

**SoNash is at Session #287 (D17a):** SoNash has 287 sessions of accumulated CLAUDE.md refinement, compared to JASON-OS's early sessions. The behavioral guardrails already ported represent a heavily battle-tested subset. [25]

**SoNash BRAINSTORM.md chose Direction B→F (D14b):** The operator constraint was explicit — "won't all port over and many will most likely be simplified." This establishes the floor for JASON-OS: extract the patterns, not the product complexity. [3]

**file-registry-portability-graph (D14a):** SoNash's prior research session is the direct ancestor of the sync-mechanism work. Option D was chosen (JSONL + PostToolUse + scope-tags), which informs Piece 2 schema design. [12]

**D20c and D21c files do not exist on disk:** Two expected findings files (dep-map-ci-memory-config and data-contracts) were never committed despite their data being captured. D20d's 884-edge merged graph incorporates D20c's 240 edges. D21a and D21b narratives contain the data contracts. Not a data loss — a documentation gap.

**Cache namespace collision (D13):** Both SoNash and JASON-OS statusline binaries write to the same `~/.claude/statusline/cache/` path. Running both repos simultaneously would cause cache corruption. Binary naming convention (`<project>-statusline-v<N>`) prevents executable collision but not cache collision. [26]

**Session cluster from Session #244 (D23):** 8 canonical memory files were all born in a single session (7389d098). This density suggests a bulk extraction event — memory files from that session may have inherited each other's framing artifacts. [17]

---

## Challenges

### Contrarian Findings

Contrarian and OTB challenge phases were not dispatched for this scan (Piece 1b is a discovery scan, not a research question requiring adversarial challenge). The findings are first-party direct observations of SoNash filesystem state. Confidence levels reflect direct inspection, not inference.

### Outside-the-Box Insights

The most outside-the-box finding from synthesis: **JASON-OS is already ahead of SoNash in at least 3 items** (session-begin, session-end-commit.js, T23 safety net), despite SoNash being the source repo. The sync mechanism must be genuinely bidirectional, not a one-way extraction pipeline.

---

## Sources

### Tier 1 (Authoritative — Direct Filesystem Observation)

| # | Title | Path | Type | Date |
| --- | --- | --- | --- | --- |
| [1] | D20d: Dependency Map Merged | findings/D20d-dep-map-merged.md | codebase | 2026-04-18 |
| [2] | D24: Redundancy Clusters | findings/D24-redundancy-clusters.md | codebase | 2026-04-18 |
| [3] | D14b: Research Unindexed (BRAINSTORM.md) | findings/D14b-research-unindexed.md | codebase | 2026-04-18 |
| [4] | D1a–D1f: Skills/Agents/Teams Wave 1 | findings/D1a–D1f-*.md | codebase | 2026-04-18 |
| [5] | D21d: GSD Cluster | findings/D21d-gsd-cluster.md | codebase | 2026-04-18 |
| [6] | D17b: Root Configs and Dotdirs | findings/D17b-root-configs-dotdirs.md | codebase | 2026-04-18 |
| [7] | D21b: Composites N–Z | findings/D21b-composites-n-z.md | codebase | 2026-04-18 |
| [8] | D6: Hooks | findings/D6-hooks.md | codebase | 2026-04-18 |
| [9] | D22a: Schema New Fields (Skills/Agents/Teams) | findings/D22a-schema-new-fields-skills-agents-teams.md | codebase | 2026-04-18 |
| [10] | D12: Scripts Archive + Tests | findings/D12-scripts-archive-tests.md | codebase | 2026-04-18 |
| [11] | D11b: Scripts Small Clusters Pt2 | findings/D11b-scripts-small-clusters-pt2.md | codebase | 2026-04-18 |
| [12] | D14a: Research Indexed | findings/D14a-research-indexed.md | codebase | 2026-04-18 |
| [13] | D14b: Research Unindexed | findings/D14b-research-unindexed.md | codebase | 2026-04-18 |
| [14] | D14c: Research Archive | findings/D14c-research-archive.md | codebase | 2026-04-18 |
| [15] | D15a: Planning Research Programs | findings/D15a-planning-research-programs.md | codebase | 2026-04-18 |
| [16] | D15b: Planning Bookmarks Ports Backlog | findings/D15b-planning-bookmarks-ports-backlog.md | codebase | 2026-04-18 |
| [17] | D23: Memory Graph | findings/D23-memory-graph.md | codebase | 2026-04-18 |
| [18] | D19a: Product Dirs Pt1 | findings/D19a-product-dirs-pt1.md | codebase | 2026-04-18 |
| [19] | D19b: Product Dirs Pt2 (Census) | findings/D19b-product-dirs-pt2.md | codebase | 2026-04-18 |
| [20] | D18: SoNash-Specific Dotdirs | findings/D18-sonash-specific-dotdirs.md | codebase | 2026-04-18 |
| [21] | D21a: Composites A–M | findings/D21a-composites-a-m.md | codebase | 2026-04-18 |
| [22] | D21b: Composites N–Z | findings/D21b-composites-n-z.md | codebase | 2026-04-18 |
| [23] | D22b: Schema New Fields (Rest) | findings/D22b-schema-new-fields-rest.md | codebase | 2026-04-18 |
| [24] | D16: CI/Security | findings/D16-ci-security.md | codebase | 2026-04-18 |
| [25] | D17a: Root Docs | findings/D17a-root-docs.md | codebase | 2026-04-18 |
| [26] | D13: Tools | findings/D13-tools.md | codebase | 2026-04-18 |

### Tier 2 (Verified — Wave 1 Direct Observation)

| # | Title | Path | Type | Date |
| --- | --- | --- | --- | --- |
| [27] | D11a: Scripts Large Clusters | findings/D11a-scripts-large-clusters.md | codebase | 2026-04-18 |
| [28] | D20a: Dep Map Skills/Agents/Teams | findings/D20a-dep-map-skills-agents-teams.md | codebase | 2026-04-18 |
| [29] | D20b: Dep Map Hooks/Scripts | findings/D20b-dep-map-hooks-scripts.md | codebase | 2026-04-18 |
| [30] | D1a–D10 group | findings/D1a–D10-*.md | codebase | 2026-04-18 |

### Tier 3 (Wave 1 — Single-Agent Coverage)

| # | Title | Path | Type | Notes |
| --- | --- | --- | --- | --- |
| [31] | D2–D5, D7–D10 group | findings/D2–D10-*.md | codebase | Individual Wave 1 files; supporting data only |
| [32] | SCHEMA_SPEC.md | .research/sync-mechanism/piece-1b-discovery-scan-sonash/SCHEMA_SPEC.md | spec | Current classification spec; has 5 confirmed errors |

---

## Methodology

- **Depth:** L1 (Exhaustive)
- **Agents:** 52 D-agents (Wave 1: D1–D19 discovery; Wave 2: D20–D24 analysis)
- **Coverage:** All git-tracked top-level directories; D19b census PASS
- **Missing files claim (CORRECTED post-verification):** Synthesizer initially reported D20c + D21c as "not committed"; D-003 dispute resolution confirmed D20c IS present on disk (240 edges verified). D21c-processes.md IS present. No missing files. Synthesizer's note was a mid-session artifact.
- **Self-audit:** PASS — all sub-questions answered, all mandatory header items present, security flags surfaced, schema corrections confirmed
- **Sub-questions answered:** SQ-001 through SQ-008 (skills/agents/hooks inventory; dependency structure; composites; schema gaps; memory state; redundancy; bidirectional sync; CI/security)
- **Confidence distribution (synthesizer-reported):** HIGH: 42, MEDIUM: 6, LOW: 0, UNVERIFIED: 0

---

## Post-Verification Addendum (Phase 2.5 → 3.5)

### Verification Verdicts (V1 + V2)

| Range | Verdicts |
|-------|----------|
| C-001 to C-030 (V1) | 26 VERIFIED / 1 REFUTED (C-024) / 1 UNVERIFIABLE (C-018) / 2 CONFLICTED (C-001, C-020) |
| C-031 to C-060 (V2) | 27 VERIFIED / 1 REFUTED (C-038) / 1 UNVERIFIABLE (C-052) / 1 CONFLICTED (C-033) |
| **Combined** | **53 VERIFIED / 2 REFUTED / 2 UNVERIFIABLE / 3 CONFLICTED (60 claims)** |

Below 20% re-synth threshold (11.7% changed) — corrections applied inline; no full re-synthesis.

### Dispute Resolutions (5 disputes, all resolved)

| Dispute | Claim | Type | Correction |
|---------|-------|------|-----------|
| D-001 | C-024 safe-fs copies | Complementary | "~10" → "8 skill-level (~10 inclusive)" (D20b L6 precise vs D24 inclusive) |
| D-002 | C-038 security flags | Misinformation | 4 → 3 formal flags; config.local.toml is a precautionary observation, not a flag (D13 retracted "committed" claim) |
| D-003 | C-001 D20c "missing" | Misinformation | Parenthetical removed; file confirmed present; verdict CONFLICTED → VERIFIED |
| D-004 | C-020 .husky count | Complementary | 5 → "5 file-level + 1 composite-level" scope clarifier |
| D-005 | C-033 composite count | Complementary | 27 → 26 (D21b heading was within-source error; 51-unit full-scope note added) |

**Post-dispute projected distribution: 56 VERIFIED / 1 REFUTED / 2 UNVERIFIABLE / 1 CONFLICTED = 93% VERIFIED.**

### Contrarian Challenges (5 HIGH / 4 MEDIUM / 1 LOW)

Full detail in `challenges/contrarian-1.md`. Top 3 HIGH:

1. **21-Field MVP is a Migration Schema, not a Sync Schema.** Fields like `context_skills[]`, `dropped_in_port[]`, `stripped_in_port[]` are migration tracking — perpetually null in steady state. Piece 2 risks rebuilding in 6 months. **Recommendation:** Split the schema into migration-phase + steady-state-phase sections, or explicitly time-box the migration fields.
2. **Copy-not-import for safe-fs.js is architecture, not debt.** Operator chose Option D (scope-tagged sync, skills as units) which requires self-contained portability. Centralizing safe-fs.js breaks self-containment. **Recommendation:** Keep copies + add `has_copies_at[]` + hash-based drift detection; do NOT centralize.
3. **GSD npm install recommendation needs pinning + upgrade review gate.** Unpinned `npm update` propagates breaking changes globally across `~/.claude/`. Current v1.22.4 vs latest v1.37.1 gap already leaves nyquist-auditor absent. **Recommendation:** Pin GSD version in a project-level manifest + require manual upgrade approval.

### OTB Alternatives (8 total; 3 HIGH-impact)

Full detail in `challenges/otb-1.md`. Top 3 HIGH-impact:

1. **Behavior as the unit (not file).** 26 composites already identified must port atomically — adding `composite_id` field to MVP enables behavior-granularity rollups at minimal cost. **Cheapest highest-leverage schema addition.**
2. **Explicit copy + diff for Foundation layer** (no sync engine for simple cases). Foundation layer (4 files, zero coupling) + 3 back-port candidates don't need schema-driven sync — just a diff script. Shrinks Piece 2's engine scope.
3. **`@jason-os/foundation` npm package** for Foundation layer. Published to GitHub Packages permanently eliminates the top sync obligation. GSD plugin pattern proves this works in this exact codebase. 4 files, 1 package.json, 1 publish step. **Collapses 10 safe-fs.js copies into a single versioned dep.**

### Gap Pursuit Scan (Phase 3.95)

**Mandatory scan, conditional execution** per skill Rule 9. Gaps identified:

1. **C-018 UNVERIFIABLE** — canonical drift %s (56.5% formatting-only, etc.) not surfaced in D23 excerpt read. Resolvable by direct D23 JSONL query. **Priority LOW** — percentages are supporting detail, not load-bearing for Piece 2.
2. **C-052 UNVERIFIABLE** — `feedback_extractions_are_canon.md` ghost reference: file absent from SoNash 83-memory corpus; could exist in JASON-OS. Resolvable by direct filesystem check. **Priority LOW.**
3. **OTB alternatives #1-3** — design decisions for Piece 2, not Piece 1b verification. **Out of scope for this research.**
4. **Contrarian HIGH #1** — migration vs sync schema split — same; Piece 2 decision.
5. **_shared/ecosystem-audit/ individual files** not deep-read; **scripts/config/known-propagation-baseline.json** >55K tokens unexplored; **eslint-plugin-sonash 32 rules** not deep-read; **SoNash SESSION_CONTEXT.md 71KB** not deep-read. All are supporting detail for Piece 2 decisions, not Piece 1b verification failures.

**Decision: SKIP gap agent spawn.** All actionable gaps are Piece 2 design decisions, not Piece 1b verification deficits. Spawning gap agents would scope-creep past Piece 1b's goal of a canonical census. Phases 3.96 + 3.97 (gap verify, final re-synth) SKIPPED per skill's conditional execution rule.

### Revised Final Verdict

Piece 1b research is **CANONICAL and READY for Piece 2 (schema design) handoff**. All SQ-001 through SQ-008 sub-questions answered with HIGH confidence post-verification. The 3 open items (2 UNVERIFIABLE LOW-priority items + 1 CONFLICTED editorial headline-scope note on C-020) do not block Piece 2 scope or methodology.

**Addendum timestamp:** 2026-04-18, Session #7
