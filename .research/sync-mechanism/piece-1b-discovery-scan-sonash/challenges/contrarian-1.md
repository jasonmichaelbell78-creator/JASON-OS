# Contrarian Challenges: Piece 1b SoNash Discovery Scan

**Challenger:** Contrarian Agent 1
**Date:** 2026-04-18
**Pre-mortem framing:** Piece 2 ships a 21-field MVP schema. Six months later it turns out to be wrong. What happened?
**Challenge count by severity:** HIGH: 5 | MEDIUM: 4 | LOW: 1

---

## Challenge 1: The 21-Field MVP Is a Schema for SoNash, Not for JASON-OS

**Severity:** HIGH
**Target claim:** C-027, C-028 — "72 NET NEW fields identified; 21-field MVP recommended for Piece 2"

**Steel-man:** The schema surveyor performed direct inspection of SoNash files and identified fields that are empirically present but absent from the current SCHEMA_SPEC. The 21-field MVP is grounded in direct observation, not inference. HIGH-priority fields were selected using a principled signal: load-bearing for sync decisions.

### Why this could fail

The 21 fields were all derived from what SoNash contains. But the schema being built is for classifying nodes for a sync mechanism that serves JASON-OS — a system with a different population of files, a different operator constraint ("many will be simplified"), and different runtime characteristics (no Firebase, no TDMS, no TypeScript pipeline).

Consider:
- `dropped_in_port[]` is a HIGH field — but it only has content for the ~47 portable skills. For the majority of JASON-OS-native nodes (which were never ported from anywhere), this field is perpetually null. A schema optimized for one-direction migration is not a schema optimized for bidirectional sync.
- `version_delta_from_canonical` assumes one repo is canonical for each node. But C-013/C-014 explicitly show this is not always SoNash. The enum design `port_status: sonash-only | jason-os-only | in-sync` forces a binary that will break the moment a third locale (work laptop) is involved — the scan's own Unexpected Findings note that cross-locale state is a real design constraint (MEMORY.md: `project_cross_locale_config`).
- `context_skills[]` is HIGH because 31 SoNash agents carry `skills: [sonash-context]`. In JASON-OS, this injection pattern doesn't exist yet. The field exists to track what must be stripped on port — it's a migration field, not a sync field. Once the port is done, it has no ongoing sync value.

**The pre-mortem:** Piece 2 classifies 519 nodes using a 21-field schema. Two years later, the schema has 8 fields that are always null on JASON-OS nodes, 4 fields that are always null on SoNash nodes after porting is complete, and the actual sync decisions are being made on 6 fields that were considered MEDIUM and nearly dropped from the MVP.

**Evidence:**
- D22a rationale for `context_skills[]`: "must strip before any JASON-OS port" — this is a one-time migration note, not a recurring sync concern
- D22a rationale for `dropped_in_port[]`: "makes port-fidelity checks automatable" — again migration, not ongoing sync
- MEMORY.md `project_cross_locale_config`: "branch-specific artifacts not visible cross-locale" — multi-locale is a live constraint that the 7-value `port_status` enum does not address

### Recommendation

Before Piece 2 finalizes the 21-field MVP, apply a second-pass filter: for each HIGH field, ask "does this field have an ongoing sync value, or does it become null/stale once initial port is complete?" Fields that only matter during the migration phase should be moved to a migration-metadata section, not the core schema. The core schema should be the minimum needed to drive sync decisions in steady state.

---

## Challenge 2: "Back-Port Session-Begin" May Be Invalidated by Platform Divergence, Not a Real Version Lead

**Severity:** HIGH
**Target claim:** C-013 — "session-begin is the only version inversion in the entire scan: JASON-OS v2.1 > SoNash v2.0"

**Steel-man:** D21b directly compared the two versions and confirmed JASON-OS v2.1 is ahead. The version number is in the SKILL.md frontmatter, not inferred. JASON-OS incremented the version for a concrete reason: adding DEFERRED markers to SoNash health scripts that cannot run without SoNash infrastructure.

### Why this could fail

The version "lead" is almost entirely composed of DEFERRED markers — tombstones for SoNash-specific features that were removed because they cannot run in JASON-OS. D21b explicitly states: "JASON-OS incremented version for bootstrap DEFERRED markers." Phase 3 (8 health scripts) is DEFERRED. Phase 4 is mostly DEFERRED.

This means the v2.1 that is supposedly "better" is actually a stripped-down v2.0 with a higher version number. Recommending a back-port of session-begin v2.1 to SoNash would:
1. Replace SoNash's live Phase 3 health scripts (check-session-gaps, run-github-health, etc.) with DEFERRED stubs
2. Version-bump SoNash's session-begin from v2.0 to v2.1 while making it less capable

The only concrete improvement that is platform-agnostic (not a DEFERRED marker) from session-end-commit.js is the `process.execPath` change (confirmed in D21b: "JASON-OS improvement: uses process.execPath (not string 'node') and absolute path for log-override.js subprocess"). That's a legitimate back-port, but it's in session-end-commit.js, not session-begin.

**The pre-mortem:** The back-port is executed. SoNash's session-begin now has DEFERRED blocks for its own health scripts. Jason asks why session-begin no longer runs github-health. The answer is "because the v2.1 back-port from JASON-OS replaced it."

**Evidence:**
- D21b session-begin notes: "8+ SoNash health scripts (patterns:check, review:check, lessons:surface, session:gaps, roadmap:hygiene, reviews:lifecycle, hooks:analytics, run-github-health.js) are DEFERRED in JASON-OS"
- D21b session-end notes: "JASON-OS improvement over SoNash: session-end-commit.js uses process.execPath — more robust cross-platform execution" (this is the real improvement, and it's in session-end-commit.js, not session-begin)

### Recommendation

Downgrade the "back-port session-begin v2.1 to SoNash" recommendation (Recommendation #9) to MINOR/CONDITIONAL. The only confirmed platform-agnostic improvement from JASON-OS to SoNash is the `process.execPath` fix in session-end-commit.js. Back-port that specific fix, not the whole skill. Add an explicit caveat: version numbers from JASON-OS are not reliable indicators of capability improvement when DEFERRED markers drive the version bump.

---

## Challenge 3: "Install GSD via npm" Creates Invisible Upgrade Risk That Copy-and-Maintain Explicitly Avoids

**Severity:** HIGH
**Target claim:** C-010, C-011 — "GSD global agents should be installed via npm v1.37.1, not manual copy"

**Steel-man:** GSD has ZERO SoNash coupling in any file. The npm package is maintained by an external party and has an established update mechanism (gsd-check-update.js fires on every SessionStart). Installing via npm means getting security patches and improvements automatically. At v1.22.4 vs v1.37.1 (14 versions behind), SoNash is already paying a maintenance debt by not using the package manager.

### Why this could fail

The research itself contains the evidence for why this is wrong:

1. **gsd-nyquist-auditor is present in the plugin but absent from SoNash's project mirror (C-060).** This is exactly the failure mode for npm-installed packages: the package adds a new agent (nyquist-auditor), but the project doesn't get it because it's not in the project's `.claude/agents/global/` directory — it goes to `~/.claude/agents/`. The recommendation is "install via npm" but the data shows the current npm install already left a gap that D21d had to flag.

2. **The plugin installs 3 hooks into `~/.claude/hooks/`** (gsd-check-update.js, gsd-context-monitor.js, gsd-statusline.js) at the user level. This creates hooks that fire across ALL projects on the machine — not just JASON-OS. Upgrading GSD via npm changes hook behavior globally. "Zero SoNash coupling" in the agent files doesn't mean "zero coupling to other projects."

3. **gsd-check-update.js fires on every SessionStart and makes network calls to npmjs.com.** An npm major version upgrade could change the update-check URL, the cache format (`~/.claude/cache/gsd-update-check.json`), or the data contracts. D21d notes: "File manifest tracked at `~/.claude/gsd-file-manifest.json` (SHA256 hashes for integrity verification)" — but this manifest is only useful post-install, not for pre-install validation of breaking changes.

4. **14 versions is not just "update available" — it's a potential major version gap.** v1.22.4 to v1.37.1 spans enough minor versions to have breaking data contract changes. The install recommendation doesn't specify whether to pin to latest (v1.37.1) or float. An unpinned npm install that auto-upgrades to a future v2.x is the copy-and-maintain failure mode in slower motion.

**The pre-mortem:** JASON-OS installs GSD via npm at v1.37.1. Six months later, the npm package ships a breaking change to gsd-tools.cjs STATE.md format. Every project on the machine gets the broken update on next npm install. The copy-and-maintain approach would have required a deliberate decision to upgrade; the npm approach requires a deliberate decision NOT to.

**Evidence:**
- D21d: "nyquist-auditor exists in plugin but NOT in SoNash's .claude/agents/global/ — 11 vs 12 agents" — current npm install is already not perfectly reflected in the project
- D21d: "Plugin NOT in ~/.claude/plugins/installed_plugins.json — installed separately via npm, not the Claude Code plugin marketplace"
- D21d: "gsd-tools.cjs" is the backbone of all GSD data contracts; any breaking change propagates to ALL downstream agents simultaneously

### Recommendation

The recommendation should be "install via npm at a pinned version, with explicit review gating on upgrades." Add: document which version JASON-OS pins, why, and require a deliberate upgrade decision with change review rather than `npm update`. The current recommendation ("install via npm v1.37.1") is missing the pinning requirement that makes this safe. Also note that user-level hook installs affect all projects, not just JASON-OS — this is a scope issue that should be in the schema (`source_scope: user` is documented but the implication for other projects is not flagged).

---

## Challenge 4: The 73% Canonical Memory Gap Is Not a Bug — It May Be the Feature

**Severity:** HIGH
**Target claim:** C-018 — "56.5% of canonical memory is semantically current" (implied: 43.5% is a gap or problem); D5-canonical-gap-analysis finding that canonical lags user-home

**Steel-man:** The gap between canonical (SoNash-specific) and user-home MEMORY.md is a real operational problem. Three files are confirmed operationally wrong. The hub-and-spoke topology creates a single point of failure at the MEMORY.md index. The research correctly identifies that syncing stale canonical files to JASON-OS would corrupt it.

### Why this could fail

The research frames the gap between canonical memory files and user-home MEMORY.md as a deficit — things that "need to be synced." But the canonical files ARE the SoNash-specific memory. The user-home MEMORY.md is the cross-project curated index.

This raises a structural question the research doesn't answer: **Is MEMORY.md supposed to be comprehensive, or curated?**

If it's curated (the operator deliberately chose which lessons were universal enough to carry forward), then:
- The 10 unlisted files in MEMORY.md (C-017) are unlisted deliberately, not accidentally
- The 70%+ duplication in memory pairs (C-050, C-051) represents consolidation decisions, not redundancy problems
- The hub-and-spoke topology (C-017) is the correct architecture for a curated index: one index, many pointed files

The research's evidence for "canonical lags user-home" is that 7 user-home files have "substantive content additions" not in canonical. But substantive additions to user-home files are how MEMORY.md evolves through session learning — the user-home files are SUPPOSED to be ahead of the canonical files because they're updated more frequently by session memory extractions.

The only genuinely unambiguous problems are the 3 operationally wrong files (C-016). The rest of the "gap" analysis may be describing a healthy living system, not a broken one.

**The pre-mortem:** Piece 2 adds a `canonical_staleness_category` field. Every memory file with "content-addition" drift gets flagged for sync. Claude begins "fixing" the gap by pushing user-home updates back to canonical. This flattens the canonical/user-home distinction and turns the curated index into a replication target, breaking the curation workflow.

**Evidence:**
- MEMORY.md in the current JASON-OS session context already reflects curated, current state — it doesn't defer to canonical files; it IS the authoritative source
- D5 identifies 13 formatting-only drift files — this is the expected steady-state for a system where canonical and user-home evolve independently
- The operator stated JASON-OS is for "portably extracted patterns, not product complexity" — this implies deliberate selection, not comprehensive sync

### Recommendation

Reframe the canonical gap finding. Separate: (a) operationally wrong files — MUST fix before sync, confirmed blocker; (b) intentional canonical/user-home divergence — document the design intent, do NOT treat as gap; (c) formatting-only drift — safe to normalize. The Piece 2 schema should distinguish between "sync gap" (unexpected divergence) and "intentional scope difference" (deliberate curation). The `canonical_staleness_category` enum should include `intentional-scope-difference` as a valid value alongside the current options.

---

## Challenge 5: The "Copy-Not-Import" Pattern for safe-fs.js Is Architecture, Not Debt

**Severity:** HIGH
**Target claim:** C-024, SCRIPT-C2 — "safe-fs.js has ~10 byte-identical copies in skill directories — future sync mechanism must keep these in lockstep or centralize them"

**Steel-man:** Ten byte-identical copies of a security-critical utility (safe-fs.js) create a lockstep maintenance problem. A security patch applied to the canonical copy will not propagate to the copies. The sync mechanism must account for this. The redundancy is documented, quantified (D24 SCRIPT-C2), and confirmed as actual duplication via direct inspection.

### Why this could fail

The research treats the copies as technical debt. But consider the operator constraint that skills "must be self-contained" (MEMORY.md: `feedback_no_file_out_of_scope_sync_scans`, and the design principle that JASON-OS is extractable). Self-contained skills require their dependencies to travel with them.

The BRAINSTORM.md selected Option D (JSONL + PostToolUse + scope-tags). A scope-tagged sync mechanism that moves skills as units needs those skills to be self-contained — otherwise moving a skill requires also moving its lib dependencies, which requires knowing the dependency graph, which requires the full dependency mapping infrastructure (D20d, 884 edges) to be operational before any skill can move.

The copy pattern is not just laziness — it's a conscious trade-off: **self-containment over DRY**. This is the same trade-off made by Docker containers (each container carries its own libc), Go binaries (statically linked), and npm packages (each package carries its own node_modules). It's not obviously wrong.

The real risk is not the copies per se — it's **undetected drift between copies** after a security fix. But that's a different problem than "copies are debt." The solution to drift detection is a lint check or hash verification, not necessarily centralization.

**The pre-mortem:** Piece 2 recommends centralization of safe-fs.js. The implementation creates a shared lib that skills import from. Six months later, a skill is "ported" to a new project that doesn't have the shared lib at the expected path. The port fails silently because the import path resolves to undefined at runtime. The copy pattern would have worked.

**Evidence:**
- D22a field `has_shared_dep` was proposed precisely because `_shared/` dependencies create portability risk — this is an existing known problem with the centralization pattern
- D22a field `shared_dep_paths` explicitly: "a skill with has_shared_dep:true cannot be ported without also porting the relevant _shared/ files"
- The operator selected Option D (scope-tags) which implies moving skills as units — self-contained units are the natural fit for this architecture

### Recommendation

Reframe SCRIPT-C2. Instead of "consolidate copies," recommend "implement copy-drift detection." The sync mechanism should verify that all copies of safe-fs.js are identical to the canonical; if drift is detected, flag for manual review. This solves the security patch propagation problem without breaking the self-containment property. The Piece 2 schema should capture `has_copies_at[]` (already proposed in D22b as MEDIUM) as a first-class field, enabling automated drift checks rather than mandating centralization.

---

## Challenge 6: The Back-Port Candidate Count Is Understated — The Research May Have Missed the JASON-OS→SoNash Direction

**Severity:** MEDIUM
**Target claim:** C-013, C-014, C-015 — "Three bidirectional back-port candidates flow JASON-OS → SoNash"

**Steel-man:** The research explicitly acknowledges the bidirectional sync premise and found three verified cases where JASON-OS is ahead. The scan was exhaustive (D19b PASS). The finding is the result of a full cross-comparison, not a spot check.

### Why this could fail

The three back-port candidates were identified via direct version comparison — when version numbers were present and comparable. But version numbers are unreliable signals. D22a explicitly surfaces `version_metadata_location` as a problem: CAS handler skills store Document Version in an HTML comment, not YAML frontmatter. A parser that only reads YAML frontmatter would miss these version numbers entirely.

More critically: JASON-OS may be ahead in behavioral patterns that don't have version numbers. The MEMORY.md in JASON-OS carries feedback files that post-date SoNash's canonical memory by several sessions. The deep-research phases 3-5 mandatory requirement (added in JASON-OS's feedback cycle) may not exist in SoNash at all. The T23 0-byte safety net (C-015) was found because it had a named issue reference — unnamed improvements might not be found.

The research also notes that SoNash is at Session #287, implying deep refinement. But JASON-OS has had its own refinement cycle since bootstrap. Session #7 of JASON-OS is not session #7 of JASON-OS's existence — the MEMORY.md carries lessons from earlier sessions. How many of those MEMORY.md entries represent genuine JASON-OS improvements over SoNash that were not checked?

**Evidence:**
- D22a: `version_metadata_location` — 4 CAS handler skills store version in HTML comment, invisible to YAML-only comparison
- D21b session-end notes: "JASON-OS uses process.execPath" — this specific improvement was found, but only because the code was directly compared. How many scripts were compared at the code level vs version-number level?
- The unresolved contradictions section lists: "research-index.jsonl schema — two incompatible schemas in same file" — JASON-OS may have a cleaner schema

### Recommendation

Add an explicit caveat to the three-candidate finding: "Back-port candidates were identified via version comparison where version numbers were present. Skills with non-standard version metadata locations (HTML comment format) and behavioral improvements encoded only in MEMORY.md were not fully enumerated. The actual JASON-OS→SoNash flow may be larger." This is a MEDIUM concern because it does not invalidate the three confirmed candidates — it only means the list may be incomplete.

---

## Challenge 7: The SCHEMA_SPEC Correction for Team Parser Format May Create New Problems for Multi-Format Tolerance

**Severity:** MEDIUM
**Target claim:** C-004 — "SCHEMA_SPEC team parser format is WRONG — spec says HTML-comment but actual SoNash format is prettier-ignore + bold + table"

**Steel-man:** D22a directly observed SoNash team files and confirmed the actual format. This is a first-party observation, not an inference. The SCHEMA_SPEC correction is straightforward: update the spec to match reality.

### Why this could fail

The research frames this as SCHEMA_SPEC being wrong and needing correction. But the pre-mortem framing in the task brief explicitly asks: "Maybe team parser 'failing' to HTML-comment is fine — we can parse both."

If the sync mechanism is being designed to work across two repos (SoNash and JASON-OS), it will encounter files using both formats — perhaps SoNash uses prettier-ignore + bold + table, but future JASON-OS team files might use HTML comment because that's what the spec said when they were created. Correcting the spec to say "actual format is prettier-ignore" and then designing a parser for only that format means:

1. Any existing JASON-OS team file that used the old spec format becomes non-conformant
2. The parser will reject conformant-to-spec files in favor of conformant-to-reality files

The more robust correction is: "The spec described the intended format; reality diverged. The parser should accept both formats and the canonical format going forward is prettier-ignore + bold + table." This is a multi-format tolerance approach, not a spec correction.

**Evidence:**
- The SCHEMA_SPEC was presumably written before the SoNash team files were created — it described an intention that was not implemented as written
- The research does not verify whether any JASON-OS team files currently use the HTML-comment format

### Recommendation

Add to Correction #1: "Before applying this correction, verify whether any current JASON-OS team files use the HTML-comment format. If any do, the parser should be multi-format tolerant (accept both) rather than replacing one valid format with another." This is a MINOR scope addition but prevents a silent incompatibility.

---

## Challenge 8: Security Flag #1 Is Stated as "CRITICAL" But No Evidence of Actual Risk Is Presented

**Severity:** MEDIUM
**Target claim:** C-038 — "firebase-service-account.json (CRITICAL - live RSA key)... gitignored. Git history not yet verified."

**Steel-man:** An RSA private key for a Firebase service account is a live credential that could grant administrative access to a production Firebase project. If it was ever accidentally committed to git history, it would be permanently visible in the history even if deleted from the working tree. The "CRITICAL" severity is justified by the potential blast radius, not by confirmed exposure.

### Why this could fail

The research correctly identifies that the file is currently gitignored. It then raises git history verification as an unresolved question. But the severity rating ("CRITICAL") is applied to the current state, not to the hypothetical unverified risk.

The security header says: "These flags must be acknowledged before any sync work proceeds." This creates a blocking dependency on git history verification for something that may not be a problem. The unresolved questions section lists this as TBD. If git history verification requires a SoNash-side action (running `git log --all -- firebase-service-account.json`), and that action is not taken before Piece 2, then Piece 2 begins with an unresolved CRITICAL flag.

More practically: the sync mechanism being designed is for Claude Code OS artifacts — skills, agents, hooks, scripts. None of these are in the product directories (C-009: "ZERO Claude Code artifacts in 9 product directories"). Firebase service account credentials are in the SoNash product domain, not the OS domain. The sync mechanism would never touch this file.

**The pre-mortem:** Piece 2 begins with the CRITICAL flag unresolved. The schema design work proceeds on the OS artifacts (skills/agents/hooks). Six months later, the git history check is done and the key was never committed. The CRITICAL flag added friction without contributing to sync safety.

**Evidence:**
- C-038: all four files "gitignored" — confirmed
- C-009: "ZERO Claude Code artifacts in product directories" — the Firebase domain is product, not OS
- The sync mechanism design (Option D: JSONL + PostToolUse + scope-tags) would operate on OS artifacts, not product credentials

### Recommendation

Reframe Flag #1 from "CRITICAL — must resolve before sync work proceeds" to "CRITICAL — must resolve before any sync mechanism is extended to include SoNash root-level configs." The git history verification is genuinely important but it is not a blocker for Piece 2 schema design for OS artifacts. Adding this nuance prevents the flag from creating unnecessary gate anxiety while preserving its real urgency.

---

## Challenge 9: The Hub-and-Spoke Memory Graph May Be Intentional Simplicity, Not Technical Debt

**Severity:** MEDIUM
**Target claim:** C-017 — "168-edge memory graph with hub-and-spoke topology; 22 cross-canonical pairs; 4 supersession chains; 10 unlisted files"

**Steel-man:** The memory graph was constructed by D23 through direct edge enumeration — this is real structural data, not estimated. Hub-and-spoke topology with a single index (MEMORY.md) creates a single point of failure: if the index drifts from the actual files, the entire memory system degrades. The 10 unlisted files represent files that exist but are not discoverable through the index.

### Why this could fail

The hub-and-spoke topology is being implicitly framed as a weakness because it creates high centrality at the MEMORY.md node. But this is how all good indexes work. The HTTP web is hub-and-spoke. A well-maintained library catalog is hub-and-spoke. The question is not "does the hub have high centrality?" — it's "is the hub maintained?"

The 10 unlisted files are described as a gap. But unlisted files in a curated index may be files that were deliberately not promoted to the index because they were judged not universally applicable. The research doesn't distinguish between "accidentally unlisted" and "deliberately excluded."

The 22 cross-canonical pairs (files that reference each other) are described without a verdict. Cross-referencing between memory files can be useful for context — e.g., a feedback file that references a project file for background. This is not inherently a problem.

**Evidence:**
- MEMORY.md in the current session context is actively maintained and accurate — the system works in practice
- D23 found 3 operationally wrong files (the real problem) but the topology description is neutral — it's only a problem if the hub is not maintained

### Recommendation

Separate the topology description from the operational problems. The hub-and-spoke topology is not itself a finding requiring action — it's a description. The actionable findings are: (a) 3 operationally wrong files, (b) 1 ghost reference (feedback_extractions_are_canon), (c) the question of whether the 10 unlisted files are accidentally or deliberately excluded. The Piece 2 schema does not need to redesign the memory graph topology; it needs to classify individual files accurately.

---

## Challenge 10: The 46-File Gap in scripts/ Is Understated as a Coverage Issue

**Severity:** LOW
**Target claim:** C-032 — "Total script census is 312 files; Wave 1 covered 266/312 — 6 uncovered subdirs = 46 files gap"

**Steel-man:** The research explicitly acknowledges the gap. D19b census was PASS for top-level directories, but the scripts/ subdirectory scan had six uncovered subdirs: audit/, cas/, config/, docs/, metrics/, multi-ai/. These 46 files have unknown portability classification.

### Why this could fail

The gap includes `scripts/config/` — and the report simultaneously recommends porting the `scripts/config/` subsystem as a high-value pattern (Recommendation #3 via finding D11b: "15-file central config registry including hook-checks.json"). If scripts/config/ is in the 46-file gap, how was it inventoried? The D11b findings reference `scripts/config/` explicitly but it's listed as an uncovered subdir in D12.

This is not a data loss — D11b may have separately inventoried it. But it creates a traceability gap: are the 15 files in scripts/config/ part of the 46 uncovered files or the 266 covered files?

Additionally, `scripts/cas/` is in the gap but CAS is identified as an all-or-nothing port composite (C-034) requiring its scripts/cas/ components. The portability classification of those 12 scripts is unknown from the scan data.

**Evidence:**
- D12: "6 uncovered subdirs (audit/, cas/, config/, docs/, metrics/, multi-ai/) = 46 files gap"
- D11b: "scripts/config/ subsystem: 15-file central config registry" — inventoried but from a different agent than the gap enumeration
- D21a CAS composite: "12 components (4 handlers + 3 synthesis/query + 4 cas/ scripts + SQLite)" — scripts/cas/ classification not independently confirmed

### Recommendation

Before Piece 2 begins, verify the traceability of scripts/config/ (is it in the 46 or the 266?) and add the 4 scripts/cas/ scripts to the CAS all-or-nothing composite record explicitly. This is LOW severity because the gap is acknowledged and the affected files are either separately inventoried (config/) or already classified as not-portable (cas/ blocked on CAS all-or-nothing constraint). It is a documentation cleanliness issue, not a data integrity issue.

---

## Summary

**Challenge count by severity:**
- HIGH: 5 (Challenges 1, 2, 3, 4, 5)
- MEDIUM: 4 (Challenges 6, 7, 8, 9)
- LOW: 1 (Challenge 10)

**Top 3 HIGH challenges for Piece 2 attention:**

1. **Challenge 1 (21-field MVP as migration schema, not sync schema)** — The MVP was designed to describe what exists in SoNash during port. Once port is complete, many HIGH fields become perpetually null. Piece 2 schema needs a "migration vs steady-state" pass before finalizing field priorities.

2. **Challenge 5 (copy-not-import is architecture, not debt)** — Recommending centralization of safe-fs.js may break the self-containment property that makes scope-tagged sync viable. The mechanism needs copy-drift detection, not forced centralization.

3. **Challenge 3 (GSD npm install without version pinning creates global state)** — The install recommendation is missing the pinning requirement. User-level hooks installed by GSD affect all projects. Without an explicit upgrade review gate, npm install becomes a silent breaking-change vector.
