# OTB Challenge — Piece 1b Discovery Scan (SoNash)

**Agent:** OTB-1
**Date:** 2026-04-18
**Topic:** Unconsidered approaches for SoNash → JASON-OS sync architecture
**Against research output:** RESEARCH_OUTPUT.md (52 D-agents, Session #7)

---

## Alternative 1: Don't Diverge — git-subtree or git-submodule Shared Layer

**Type:** reframing
**Relevance:** HIGH
**Feasibility:** MEDIUM

### What was NOT considered

The research treats SoNash and JASON-OS as two independent repos that diverge and must be reconciled. The entire Piece 1a/1b/2/3 pipeline exists because of that assumption. The alternative: never let the shared infrastructure diverge at all by extracting the Claude Code OS layer into a third repo (`claude-code-os-core` or similar) that BOTH SoNash and JASON-OS consume via git-subtree or git-submodule.

Under this model:
- The Foundation layer (safe-fs.js, symlink-guard.js, sanitize-error.cjs, security-helpers.js) lives in the shared repo, version-tagged.
- Skills and agents that are truly portable live in the shared repo.
- SoNash-specific and JASON-OS-specific files live only in their respective repos.
- "Sync" becomes "upgrade the subtree ref" — a git operation, not a custom engine.

This is how Linux distros handle shared kernel vs. distro-specific packaging, and how companies manage internal platform libraries.

### Why it might be better

- Eliminates the sync problem at the root: files that never diverge don't need reconciliation.
- The 884-edge dependency graph and 519-node inventory already map which files belong in a shared layer (Layers 1 and 2). That work is done.
- git-subtree (unlike submodule) requires no special clone commands and no `.gitmodules` coordination burden.
- The research already identified the exact portability split: Foundation layer = zero SoNash coupling = perfect subtree candidate.
- Future additions go into the shared repo first, both repos pull. No schema, no scanner, no sync engine to maintain.

### Why it might not work

- SoNash is at Session #287 with 519 dependency nodes. Extracting a subtree from a 287-session-old repo without breaking existing structure is a significant one-time migration cost.
- The 32-edge `skills: [sonash-context]` injection fan creates coupling that would prevent clean extraction without stripping work first.
- git-subtree pushes from a consuming repo back to the shared repo require discipline and can get messy if both repos modify shared files (which is the bidirectional case).
- This approach was likely dismissed because SoNash is a product repo, not an infrastructure mono-repo, and retrofitting subtree management onto it may be more disruptive than building sync tooling.
- The JASON-OS mandate ("portable OS extracted from SoNash") implies SoNash stays as-is; it's the source not the host.

### Recommendation

Investigate further — specifically whether the Foundation layer alone (4 files, well-defined) could be extracted as a versioned npm package or subtree. Even partial adoption (Foundation layer only) would eliminate the most critical sync obligation identified in the research (the "port first and intact" requirement). This is a Piece 2 schema input: classify Layer 1 files as "subtree-candidate" rather than "sync-candidate."

---

## Alternative 2: Explicit Copy + Diff Report (No Sync Engine)

**Type:** simpler
**Relevance:** HIGH
**Feasibility:** HIGH

### What was NOT considered

The research converges on a schema-driven bidirectional sync engine. The simpler alternative: make copy the only primitive. When you want to pull a file from SoNash into JASON-OS, you copy it manually. A lightweight diff tool (a single script or even `diff -r`) then reports divergence. No sync engine, no schema for the engine to consume, no bidirectional conflict resolution.

The discipline becomes: before any session that touches shared files, run the diff report. When it shows drift, decide manually. The schema survives as documentation (a human-readable classification), not as machine-executable sync instructions.

This is how chezmoi works for dotfiles: it tracks a source-of-truth directory and diffs against the live state. The "sync" is the human reading the diff and deciding what to apply.

### Why it might be better

- Eliminates the entire Piece 2 schema engine and Piece 3 sync mechanism from the project scope.
- The 21-field MVP schema is still valuable — but as a diff annotation format rather than an engine specification. Less work, same information.
- Handles the hardest case (operationally wrong canonical memory files, SoNash-specific vs. portable classification) through human judgment on every copy, not through machine rules that must anticipate every case.
- Matches the operator's stated philosophy: "won't all port over, many will be simplified" — that's a manual curation decision, not an automated one.
- Zero new infrastructure to maintain. The diff report is a shell script.
- The security flags (firebase-service-account.json, .env.local) become a trivially simple exclusion list in the diff script rather than a schema field.

### Why it might not work

- At scale (519 nodes, 884 edges), manual diff review becomes untenable. The research exists precisely because the scope is large enough that no human can track it mentally.
- The 10 byte-identical safe-fs.js copies need to stay in lockstep. A manual copy discipline will eventually miss one.
- The bidirectional case (JASON-OS → SoNash back-ports) is asymmetric and invisible to a diff report unless you diff in both directions.
- Session compaction risk: if the diff report isn't run before every relevant session, drift accumulates silently — the same problem the sync engine solves.

### Recommendation

Adopt partially: for the Foundation layer (4 files) and back-port candidates (3 items), a copy + diff report is sufficient now and avoids over-engineering Piece 2. For composites (TDMS, CAS, hook-warning trio), a schema-driven approach remains justified. This hybrid lets Piece 2 focus on classifying "needs schema" vs. "copy-and-diff is enough" rather than applying the 21-field schema to all 519 nodes.

---

## Alternative 3: Each Shared Unit as a Versioned npm Package

**Type:** adjacent-domain (package management)
**Relevance:** HIGH
**Feasibility:** MEDIUM

### What was NOT considered

The research identifies GSD global agents as "install via npm" and flags this as the best port path. It does not generalize this to the broader infrastructure. The adjacent-domain model: treat every portable skill, agent cluster, and shared lib as a versioned npm package published to a private registry (GitHub Packages or npm with `@jason-os/` scope). Consumers pin a version. Upgrades are explicit `npm install @jason-os/foundation@1.1.0`.

This is the established solution to the multi-repo shared-library problem. It's how Babel plugins, ESLint configs, and the GSD plugin itself work.

### Why it might be better

- Version pinning is explicit and auditable. The "version_delta_from_canonical" schema field identified in D22a becomes a diff of package.json version pins — no custom schema field needed.
- The "32-edge sonash-context injection fan" becomes a peer-dependency declaration in package.json: the package declares it needs a context injection at runtime, the consuming repo provides it.
- Safe-fs.js's 10 byte-identical copies collapse to one published package, one import. The sync obligation disappears.
- The GSD cluster precedent shows this already works in this exact codebase.
- GitHub Packages supports private packages with existing GitHub auth — no new secrets infrastructure.

### Why it might not work

- Publishing packages adds friction to the inner loop. A skill change requires: edit → version bump → publish → update consumer package.json → npm install. For frequently iterated skills, this overhead is painful.
- Claude Code skills are markdown + YAML frontmatter, not JavaScript modules. Wrapping them in npm packages is unnatural and adds a build/publish step to what is currently a file-copy operation.
- The operator is a no-code orchestrator. Managing a private npm registry and version pins adds operational surface area beyond current expertise/comfort.
- This was probably dismissed (implicitly) because GSD is an external tool maintained by a third party — a natural npm consumer. Internal skills are authored in the same repo, not consumed like libraries.

### Recommendation

Note as future consideration for the Foundation layer only (safe-fs.js, symlink-guard.js, sanitize-error.cjs, security-helpers.js). These 4 files are pure JavaScript utilities with no markdown/frontmatter wrapper — they are already natural npm package material. Publishing `@jason-os/foundation` to GitHub Packages would eliminate the most critical sync obligation identified in the research at the cost of one publish pipeline. The skill/agent corpus does not fit this model.

---

## Alternative 4: Dotfiles-Style Template-Marker Approach (chezmoi/yadm Model)

**Type:** adjacent-domain (dotfiles management)
**Relevance:** MEDIUM
**Feasibility:** MEDIUM

### What was NOT considered

Dotfiles managers like chezmoi solve a structurally identical problem: one source-of-truth template, many deployment targets (machines/repos), each target may have local overrides, changes flow bidirectionally via explicit "add" and "apply" operations. chezmoi uses template markers (`{{ .chezmoi.hostname }}`) to annotate machine-specific sections within shared files.

Applied here: a shared file like a skill's SKILL.md would contain template markers delimiting sections that are JASON-OS-specific vs. SoNash-specific vs. shared. The "sync engine" is chezmoi's apply/add cycle, not a custom tool. Markers could replace the complex 21-field schema with inline annotations.

### Why it might be better

- Template markers are co-located with the content they describe — no separate schema file to keep in sync with the actual files.
- chezmoi is designed for exactly this cross-target sync topology: it handles conflicts, tracks state, and supports encryption for secrets (relevant given the 4 security flags).
- The "stripped_in_port[]" field identified in D22a becomes a template conditional rather than a schema annotation.
- chezmoi's `chezmoi diff` is a diff report out of the box.

### Why it might not work

- chezmoi was designed for user-level config files (~/.config/), not for structured code-adjacent files like .claude/skills/. Its template model assumes files are monolithic; skill directories are not.
- Adding template markers to 47+ skill files across both repos requires modifying all existing files — high-touch migration with no net behavior change.
- Claude Code reads skill files as-is; template markers would need to be stripped before Claude sees them, adding a preprocessing step.
- The research identified composites (multi-file workflows that must be ported atomically) — chezmoi treats files independently by default, not as composites.
- This approach requires both Jason and any future JASON-OS operator to install and understand chezmoi — external dependency with a learning curve.

### Recommendation

Note as future consideration. The template-marker concept (inline annotations rather than separate schema fields) is worth extracting even if chezmoi itself is not adopted. A lightweight convention — comment markers in skills indicating SoNash-specific sections — could replace several schema fields at lower cost.

---

## Alternative 5: LLM-Native Sync (Claude Reads Both, Reconciles on Demand)

**Type:** newer / reframing
**Relevance:** MEDIUM
**Feasibility:** MEDIUM

### What was NOT considered

The entire research assumes sync is a static, schema-driven, automated process. The alternative: sync is a Claude task, run on demand. When divergence needs resolving, a Claude Code agent reads the relevant files from both repos and produces a reconciliation plan. No persistent schema, no sync engine — just a well-written prompt and the existing file-reading tools.

This is what Claude Code is already doing in every session that touches cross-repo concerns. The question is whether it can be formalized as a reliable skill (a `/sync-reconcile` skill) rather than an ad-hoc ask.

### Why it might be better

- Handles cases no static schema can anticipate: semantic drift (operationally wrong canonical memory), composite port requirements, context-aware stripping of SoNash-specific content.
- The 3 operationally wrong memory files identified in D23 are exactly the kind of case where human-readable reasoning outperforms schema field matching.
- Eliminates Piece 2 and Piece 3 entirely. The schema becomes a checklist prompt, not a machine-executable spec.
- "Behavior-level" sync (the reframing in the brief: the correct unit is behavior, not file) is natural for an LLM that understands what a skill does, not just what its fields are.
- Already available: no new infrastructure, no new tools, no new dependencies.

### Why it might not work

- LLM reasoning is non-deterministic. Two runs of the same sync prompt may produce different reconciliation decisions. For behavioral guardrails in CLAUDE.md, inconsistency is dangerous.
- Context window limits: comparing 519 nodes across two repos in a single Claude session is not feasible without chunking — and chunking introduces the same problem as the static schema approach (what's the right granularity?).
- No persistent state: if a reconciliation run is not committed, the next run starts from scratch. The research identifies 168-edge memory graphs and 884-edge dep maps — LLM context cannot hold all of this at once.
- The research itself (52 agents) demonstrates that a single LLM pass is insufficient for this scope. A sync skill would face the same coverage problem.
- Operator expertise profile: the user is a no-code orchestrator. A vague "ask Claude to sync" is already the current baseline — formalizing it as a skill without a schema backing it would produce variable-quality results.

### Recommendation

Adopt partially as a fallback for edge cases the schema cannot handle (operationally wrong files, semantic drift, composite port decisions). The "LLM-native reconciliation" path should be a named escape hatch in the sync skill design ("when portability = ambiguous, invoke reconcile-agent"), not the primary mechanism.

---

## Alternative 6: Behavior as the Unit (Not File)

**Type:** reframing
**Relevance:** HIGH
**Feasibility:** MEDIUM

### What was NOT considered

The 21-field schema operates at file granularity. The D21a/D21b composite analysis revealed that 27 "composites" require coordinated ports — they are behaviors, not files. The reframing: skip file-level classification entirely for composites and instead classify at behavior level. A "behavior" is a named capability (e.g., "warning lifecycle management", "TDMS debt pipeline") with:
- A file manifest (which files compose it)
- A port contract (what must move together)
- A dependency surface (what it requires from the target repo)
- A version tag (the behavior version, not individual file versions)

The sync mechanism then operates on behavior manifests, not individual file schemas. A file belongs to exactly one behavior (or to "Foundation"). This eliminates the class of errors where partial ports leave hooks in inconsistent states.

### Why it might be better

- The research already identified the 27 composites — the behavior manifest list is largely done.
- The hook-warning trio problem (must port atomically or not at all) is cleanly modeled: it's a single behavior with a 3-file manifest and an atomicity constraint.
- TDMS (28 scripts + MASTER_DEBT.jsonl) and CAS (12 components + SQLite) are explicitly all-or-nothing — they are behaviors, not files.
- Eliminates the false granularity of per-file portability classification for files that can only be meaningful in groups.
- The "behavior version" is more semantically meaningful than individual file semver: "session-begin behavior is at v2.1 in JASON-OS, v2.0 in SoNash" is exactly the insight D21b surfaced.

### Why it might not work

- Not all 519 nodes are composite members. The 18 orphan skills (D20a) and Foundation layer files are genuinely independent — they don't map to behaviors.
- A two-tier schema (file-level for independent files, behavior-level for composites) is more complex than a uniform file-level schema. Piece 2 would need to maintain two classification models.
- "Behavior" is not a formally defined term in the current SCHEMA_SPEC. Adding it requires schema redesign, not just field additions — a larger Piece 2 scope change.
- The 32-edge sonash-context injection fan is a cross-cutting dependency that doesn't fit cleanly into any single behavior's manifest.

### Recommendation

Investigate further before Piece 2 begins. Specifically: add a `composite_id` field to the 21-field MVP schema that allows file-level entries to be grouped into behavior-level rollups. This costs one schema field but enables behavior-granularity reporting as an overlay on the file-level data. The 27 composites already have names — assigning them composite IDs is mechanical work, not design work.

---

## Alternative 7: Skip Piece 1a+1b, Start Piece 2 with First-Principles Schema

**Type:** inverted
**Relevance:** MEDIUM
**Feasibility:** LOW

### What was NOT considered

The research question assumes that thorough inventory (Piece 1a = JASON-OS, Piece 1b = SoNash) is a prerequisite for schema design. The inversion: start with a first-principles schema (what fields would a sync mechanism need regardless of what's in either repo?), classify a 20-file pilot sample against it, discover schema gaps from failures, iterate. Piece 1a/1b become validation runs rather than prerequisite discovery.

This is the test-driven approach: write the schema (test), discover what it can't handle (red), fix the schema (green).

### Why it might be better

- Avoids the 52-agent, multi-session inventory cost upfront — fails fast on schema assumptions instead.
- The research itself found 72 net new fields the original SCHEMA_SPEC missed. A first-principles design sprint might have caught the high-priority 21 fields in a single session.
- Piece 2 schema design is inherently iterative regardless — the inventory findings just inform the starting state.

### Why it might not work

- The research produced information that schema design alone cannot surface: the 27 composites, the 3 operationally wrong memory files, the 32-edge injection fan, the security flags. These are facts about the codebase, not schema design questions.
- The security flags (CRITICAL: live RSA private key) would have been discovered only when a sync run attempted to copy them. Discovery-first prevents that class of error.
- 519 nodes × unknown fields is a larger search space than 21 fields × known 519 nodes. Inventory-first bounds the problem.
- The operator's explicit instruction was scan-first (sync-mechanism principles: "Scan-first"). This alternative would have required overriding a stated principle.

### Recommendation

Note as future consideration for the NEXT sync mechanism project (if JASON-OS is later adapted for a third repo). The scan-first approach was correct given the security flag discovery. However, in a greenfield scenario without legacy secrets risk, test-driven schema design would be faster.

---

## Alternative 8: Treat the Memory Graph as the Sync Unit (Not Files)

**Type:** adjacent-domain (graph databases / knowledge graphs)
**Relevance:** MEDIUM
**Feasibility:** LOW

### What was NOT considered

The research found a 168-edge memory graph with hub-and-spoke topology (D23). Adjacent-domain: knowledge graph sync tools (CRDT-based, or graph diff tools used in ontology management) treat nodes and edges as the sync primitive, not files. A memory graph sync would compare node states and edge relationships between SoNash and JASON-OS canonical memory, then propose merges at the semantic level.

This is how medical ontology systems (SNOMED, FHIR) handle cross-institution terminology drift: graph diff, not file diff.

### Why it might be better

- The 22 cross-canonical file pairs (files that reference each other) form a graph that file-level sync cannot model cleanly — a graph-level approach makes these relationships first-class.
- The 5 HIGH drift memory files and the 3 operationally wrong files are graph-level anomalies (nodes with stale content), not file-level anomalies.
- Supersession chains (4 identified) are graph edges — "supersedes" is a relationship, not a field value.

### Why it might not work

- Graph sync tools (Apache Jena, Neo4j graph diff) are engineering-heavy infrastructure. JASON-OS is a workshop-tool OS, not a knowledge management system.
- The memory graph was discovered during this scan (D23) — it didn't exist as a maintained artifact beforehand. Building a sync mechanism on top of an undocumented graph requires maintaining the graph first.
- The operator's expertise profile excludes graph database administration.
- The memory corpus is ~22 files. File-level diff is entirely adequate at this scale; graph tooling is disproportionate.

### Recommendation

LOW priority. The graph topology insight (hub nodes, supersession chains, cross-canonical pairs) is valuable as a classification input to the 21-field MVP schema, not as a sync mechanism driver. The `supersedes_filename` field already identified in D22b captures the key graph relationship as a schema field.

---

## Adjacent-Domain Analogues Summary

| Tool/Pattern | Problem it solves | Relevance to sync-mechanism |
| --- | --- | --- |
| git-subtree | Shared library embedded in consuming repo, changes flow both ways | HIGH — Foundation layer is a natural subtree candidate |
| npm workspaces / pnpm | Monorepo with local package linking | LOW — requires repo consolidation |
| chezmoi | Cross-machine dotfile sync with template markers | MEDIUM — template-marker concept is extractable without adopting chezmoi |
| GSD npm plugin (existing) | Shared agents consumed as versioned package | HIGH — already proven in this codebase; extend to Foundation layer |
| Apache Jena / graph diff | Ontology / knowledge graph sync | LOW — over-engineered for 22-file memory corpus |
| CRDT (e.g., Automerge) | Conflict-free replicated data types for collaborative edits | LOW — not applicable; edits are not concurrent |
| Semantic versioning + changelogs | Track behavior-level version delta | MEDIUM — behavior-as-unit alternative (Alt 6) maps cleanly to semver |

---

## First-Principles Reframes

**Reframe 1: The problem is not "how do we sync?" but "how do we stop needing to sync?"**
Every file that can be extracted into a shared layer (subtree, package) eliminates a sync obligation. Piece 2 classification should produce two outputs: "needs sync" and "should be extracted." The research found only three items to date that diverged between repos. Preventing divergence in the first place for Foundation layer and GSD-class artifacts may be higher ROI than building a sync engine for them.

**Reframe 2: The sync schema is a communication protocol, not a machine spec.**
The 21-field MVP schema is most valuable as a shared vocabulary between the operator and Claude. Whether it drives an automated sync engine or a human diff review, the schema gives Jason and Claude a common language for "portability," "composite," "sonash-only." This value is independent of whether a sync engine is ever built.

**Reframe 3: The correct test of Piece 2 is "can a non-schema-aware agent correctly port a file using only the schema output?"**
If an agent reading a schema record cannot reliably execute the port without additional context, the schema has gaps. This test would surface missing fields faster than continuing to enumerate fields from first principles.

---

## Top 3 HIGH-Impact Alternatives for Consideration Before Piece 2

1. **Alternative 6 (Behavior as the Unit)** — Add `composite_id` to the 21-field MVP. Costs one field, enables behavior-granularity rollups for the 27 already-identified composites. The research did the hard work; the schema just needs to represent it.

2. **Alternative 2 (Copy + Diff for simple cases)** — For the Foundation layer (4 files) and the 3 back-port candidates, a copy + diff script is sufficient now. Classifying these as "copy-and-diff" in Piece 2 reduces the scope of the sync engine to only the cases that genuinely need it.

3. **Alternative 3 (npm package for Foundation layer)** — `@jason-os/foundation` published to GitHub Packages eliminates the most critical sync obligation (Foundation must port first and intact) permanently. Four files, one package. The GSD precedent exists in this very codebase.

---

## Alternative Count

**Total alternatives:** 8
**HIGH-impact:** Alternatives 1, 2, 6 (reframing, simpler, reframing)
**MEDIUM-impact:** Alternatives 3, 4, 5, 7
**LOW-impact:** Alternative 8

All 8 assessments include feasibility ratings, cons, and explicit "why it was probably dismissed" context.
