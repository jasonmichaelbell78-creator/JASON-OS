# Out-of-the-Box (OTB) Challenge — Deep-Research Output

**Challenger:** otb-challenger
**Date:** 2026-04-23
**Target:** RESEARCH_OUTPUT.md (cross-repo-movement-reframe, Session 19)
**Builds on:** Session 18 brainstorm OTB content (none on disk — all OTB this round)

---

## Summary

8 alternatives surfaced. Categories: off-the-shelf alternatives (4), alternative framings (3), cross-pollination (1).

The research converged on a clean, coherent design — four custom data structures (ledger, drift record, profile cache, comprehension cache) sharing JASON-OS JSONL conventions. The alternatives below are not critiques of this design. They surface options the research simply did not look at, with honest assessments of cost and why the research's chosen approach likely wins anyway.

---

## Alternative 1: Conventional Commits + git trailers as the ledger

**Category:** off-the-shelf alternative
**What it is:** Instead of a custom JSONL ledger at `.claude/state/ledger.jsonl`, record every cross-repo movement as a git commit with structured trailers in the destination repo. Example trailer set: `Ported-From: SoNash@abc123`, `Unit-Type: skill-family`, `Verdict: sanitize`, `Scope: user`. The ledger becomes `git log --grep "Ported-From:"` — no custom file, no locking, no schema versioning.
**What it would buy:** Zero new infrastructure. Git is already the version-control layer. Trailers are machine-readable (git trailer API), diff-able, and naturally append-only. The "source changed since port" check becomes `git diff <SHA>..HEAD -- <path>` in the source repo, not a content hash comparison in a sidecar file. Every movement is permanently linked to the exact filesystem state it produced.
**What it would cost:** The ledger MUST be in the destination repo — which means it pollutes git history with what are essentially housekeeping commits. Cross-movement queries ("what has JASON-OS ported from SoNash?") require `git log --all --grep` across both repos, not a single JSONL scan. The ledger is now a property of git branches, not of the machine — which inverts the current design where the ledger is gitignored and machine-local. Sync-back's three-way diff still works (the original commit IS the original state), but the drift record and comprehension cache can't reuse this mechanism.
**Why it might be wrong:** The research's JSONL ledger is machine-local by design (C-014). Git-tracking the ledger introduces merge conflicts on concurrent movements, raises PII concerns (absolute paths in trailers visible in git log), and couples ledger reads to having the full git repo checked out. The research already reviewed git-subrepo (a similar "use git as the ledger" approach) and labeled it a negative example (C-006) specifically because mutable git records lose history. Trailers avoid that failure mode but introduce the coupling and PII concerns.
**Recommendation:** FILE-AS-FUTURE. For a team workflow where multiple humans move units, git trailers would be the right call — the trailer is in the pull request, visible to reviewers, and persisted in remote history. For a single-user local tool, the JSONL ledger is lighter and avoids git history pollution. Worth revisiting if the tool ever needs to expose movement history to remote collaborators.

---

## Alternative 2: Per-file frontmatter lineage instead of a central ledger

**Category:** alternative framing
**What it is:** Drop the central `ledger.jsonl` entirely. Store lineage IN the moved file's frontmatter. A ported skill would have a YAML block at the top: `lineage_source: SoNash@abc123/.claude/skills/audit/SKILL.md`, `ported_at: 2026-04-23`, `verdict: sanitize`. Lookup is `grep -r "lineage_source: SoNash"`. "Has source changed?" is a hash comparison at read time.
**What it would buy:** Zero additional infrastructure. Lineage travels with the file, survives refactoring, is human-readable without any tooling. A file that gets renamed or moved within JASON-OS still carries its origin. Cross-machine sync is automatic — the lineage is in the committed file itself, not in a gitignored state file. No locking, no rollback logic, no schema versioning for the ledger.
**What it would cost:** Only works for file-type units. A family port (moving a directory of related skills) would need frontmatter in every member, creating a consistency hazard if one member is updated without updating the others. Memory files and context-artifacts already have frontmatter conventions — adding movement fields risks collision. "What has JASON-OS ported from SoNash?" requires scanning the entire repo for frontmatter patterns, not a single JSONL read. Orphan detection (failed partial movements) is harder without a central record that says "I started this."
**Why it might be wrong:** The research settled on a ledger BECAUSE the movement event must be recorded separately from the artifact. A file can be deleted, renamed, or replaced — the movement history must survive those events. Frontmatter that travels with the file dies when the file dies. Frontmatter also can't represent the drift-record concept (machine-exclude, synced_at) because those are process states, not artifact properties. The research's append-only log pattern specifically avoids this fragility.
**Recommendation:** PLANNING-TIME LOOK — specifically for the question of whether per-file lineage markers (not the full record, just a `lineage_source` trailer) complement the central ledger rather than replace it. A file with a `lineage_source` header is self-describing without a ledger read. Hybrid: frontmatter carries the human-readable pointer; the ledger carries the full event record. The planner should decide whether this duplication earns its weight.

---

## Alternative 3: chezmoi as the /context-sync implementation layer

**Category:** off-the-shelf alternative
**What it is:** Instead of a custom walk/compare/decide loop in the `/context-sync` companion, delegate the actual file management to chezmoi. The companion becomes a thin wrapper: register files with chezmoi, invoke `chezmoi diff` to show drift, invoke `chezmoi apply` for confirmed syncs. JASON-OS provides the policy layer (what to include, machine exclusions, frontmatter stripping); chezmoi provides the file-state tracking layer.
**What it would buy:** chezmoi already handles CRLF normalization, machine-specific templating (`.chezmoi.toml.tmpl`), and encrypted secrets management (Age or GPG). The `chezmoi diff` command already produces a human-readable diff. Machine exclusion is handled via `condition` templates. The research validated chezmoi's architecture for drift detection (D8) — adopting it directly means zero custom implementation for a well-understood problem.
**What it would cost:** chezmoi is an external dependency — the user must have it installed on every machine. Its source directory (by default `~/.local/share/chezmoi`) uses its own naming conventions (`.tmpl` suffixes, `dot_` prefixes) that would conflict with JASON-OS's actual file layout. Onboarding requires adding files to chezmoi's managed set, which means chezmoi owns those files and JASON-OS becomes secondary. The research's design deliberately keeps JASON-OS in control at all times (no fire-and-forget, no autonomous writes) — chezmoi's `chezmoi apply` is a full apply, not a per-unit proposal loop.
**Why it might be wrong:** The research's drift record design is built for the specific confirmation-before-every-write interaction model that the user wants. chezmoi's model is "I manage your dotfiles" — JASON-OS's model is "I advise on your cross-repo state and require confirmation." These are different interaction contracts. The research also found that chezmoi has no automated heuristic detection for machine-bound content (the research used this as positive evidence for the custom hybrid P+R approach). chezmoi would require the user to pre-configure machine exclusions rather than detecting them at runtime.
**Recommendation:** FILE-AS-FUTURE. If the user ever wants a standalone dotfile manager and is willing to accept chezmoi's interaction model, this is a strong choice. For JASON-OS's confirmation-first design, the custom drift record is the right call.

---

## Alternative 4: GitHub API for unowned repo profile discovery (instead of bare clone)

**Category:** off-the-shelf alternative
**What it is:** Instead of bare-cloning an unowned repo to read its signal files, use the GitHub REST API (or GraphQL API) to fetch file contents directly: `GET /repos/{owner}/{repo}/contents/.github/workflows`, `GET /repos/{owner}/{repo}/contents/.husky/pre-commit`, etc. No local disk footprint. No git install required for the extraction step.
**What it would buy:** No scratch directory management. No `git clone --bare` subprocess. File content is returned as base64 in the API response — decode and parse in-process. Rate limit is 5,000 requests/hour authenticated (well above what profile discovery needs). The GitHub Actions workflow structure is fully queryable via the Workflows API (`GET /repos/{owner}/{repo}/actions/workflows`), which returns metadata without parsing YAML.
**What it would cost:** Only works for GitHub-hosted repos. Self-hosted GitLab, Bitbucket, or local repos require the bare-clone fallback anyway. Requires authentication (a GitHub token) as part of the discovery flow — adding a credential dependency that the research's bare-clone approach avoids entirely. API responses include file content but not the full semantic richness of local parsing (e.g., following YAML `$include` references in workflows). Rate limiting becomes a concern if the tool is discovering many unowned repos in sequence. The research's bare-clone approach works identically for any git-protocol repo.
**Why it might be wrong:** The research's bare-clone approach (C-030) is authentication-free, works for any git-accessible repo, and uses primitives already present in the JASON-OS environment. The GitHub API adds a credential management problem that the research explicitly avoids. The research also notes that `settings.local.json` is undiscoverable via any remote mechanism (C-024) — this limitation applies equally to GitHub API reads.
**Recommendation:** PLANNING-TIME LOOK — specifically as an optional fast path for GitHub-hosted repos when an auth token is available. The plan should note that bare-clone is the default and GitHub API is an optional enhancement, not a replacement. The planner should decide whether this optimization earns its implementation complexity.

---

## Alternative 5: MCP server as the delivery mechanism (mcp-movement)

**Category:** off-the-shelf alternative
**What it is:** Instead of implementing the ledger, profile cache, and comprehension cache as skill-internal libraries, expose them as an MCP server (`mcp-movement`). The orchestrator and companions become MCP tool consumers. Tool calls: `movement.ledger.append(record)`, `movement.profile.get(repoName)`, `movement.cache.lookup(key)`. The MCP server handles persistence, locking, and schema versioning. Skills become thin consumers of a structured API rather than direct file managers.
**What it would buy:** MCP servers are session-persistent and can maintain in-memory state between tool calls (no re-reading JSONL on every operation). The ledger becomes queryable via a structured API rather than file scans. Multiple companions can share the same MCP server instance with built-in connection management. MCP tool definitions are self-documenting (JSON schema). Any future Claude Code session that loads the MCP server gets ledger access without reading skill documentation.
**What it would cost:** Significant additional infrastructure: an MCP server must be authored, registered in `.claude/settings.json`, and kept running. Node.js MCP server development is well-understood but adds a process to manage. The research's design reuses `safe-fs.withLock` and `safeAppendFileSync` — primitives already proven in JASON-OS. An MCP layer adds an abstraction boundary that makes debugging harder (errors occur in the MCP process, not in the skill). The research's JSONL files are inspectable by any text editor; MCP state is opaque until you query it.
**Why it might be wrong:** JASON-OS's design principle is "use existing infrastructure" — the research explicitly grounds every data structure in existing `scripts/lib/` primitives and the existing `.claude/state/` convention. An MCP server is new infrastructure that doesn't exist yet in JASON-OS and would need to be built before the movement skill could use it. The research also notes that the ledger is machine-local and gitignored (C-013, C-014) — an MCP server that holds the ledger in memory creates a new question about what happens when the server process restarts. The JSONL file survives restarts; in-memory MCP state does not unless the server writes it back.
**Recommendation:** FILE-AS-FUTURE. The MCP delivery model is worth revisiting once the movement skill exists and has generated real usage patterns. An MCP server makes sense as a second-order extraction once the primitives are proven, not as a first-order dependency.

---

## Alternative 6: Movement-as-PR — every cross-repo movement opens a pull request

**Category:** alternative framing
**What it is:** Instead of writing directly to the destination repo and recording a ledger entry, every `/port` and `/sync-back` operation opens a pull request in the destination repo. The PR description carries the lineage: what was moved, from where, with what verdict, what sanitization was applied. The ledger entry is created only after the PR merges. Reviewers see the movement before it lands.
**What it would buy:** Movements are visible and reversible before they land. The PR IS the review gate — the companion_directive in the target profile becomes a PR checklist item. For JASON-OS, every movement into the repo would go through the existing Qodo + SonarCloud + CodeQL pipeline automatically. Lineage is human-visible in the PR description permanently. The ledger write happens at merge time (post-review), not at write time — eliminating the orphan problem entirely.
**What it would cost:** Enormously higher friction for the primary use case. The user's stated model is a conversational one-stop-shop, not a PR-per-movement workflow. Creating a PR for every `/context-sync` drift correction would be absurd. Even for `/port` operations, the user confirmed direction D' specifically because it is conversational, not a formal handoff process. PR creation adds network dependency, GitHub API calls, branch management, and the overhead of waiting for CI before the ledger records anything.
**Why it might be wrong:** The research's chosen design specifically validates its confirmation-before-every-write approach as the JASON-OS interaction model (C-039, CLAUDE.md §4 rule 6). A PR IS a review gate, but it is the wrong granularity for a conversational tool. The user's anti-goal list includes "no fire-and-forget state changes" — but it does not include "add a PR to every movement." The PR overhead would kill the tool's usability for the most common case (small drift corrections in `/context-sync`).
**Recommendation:** PLANNING-TIME LOOK — specifically for the `/port` companion only, as an opt-in mode. A "create a PR for this port" option in the orchestrator's routing flow would satisfy the use case where a movement needs external review before it lands. The default should remain direct-write with confirmation.

---

## Alternative 7: Supply chain provenance (in-toto attestations / SBOM) as the lineage model

**Category:** cross-pollination
**What it is:** The supply chain security community has solved exactly the "record where this artifact came from" problem with standardized formats. in-toto attestations (SLSA framework) record the provenance of software artifacts — what inputs produced what outputs, via what process. SPDX and CycloneDX SBOMs record component origin and licensing. The lineage ledger solves an identical structural problem: "this file in JASON-OS was produced from that file in SoNash via a sanitize operation."
**What it would buy:** Standardized vocabulary for the edge model. SLSA Level 1 provenance (a signed JSON blob: `builder`, `buildType`, `materials`, `subject`) maps cleanly onto the ledger's fields (`verb`, `source_project`, `source_path`, `dest_path`). If JASON-OS ever needs to prove the provenance of a ported artifact to an external party, SLSA attestations are machine-verifiable and tooling exists for reading them. The in-toto link format's `materials` (inputs with content hashes) and `products` (outputs with content hashes) is exactly the ledger's forward-pointer + content-hash edge model, already validated externally.
**What it would cost:** in-toto attestations are JSON blobs requiring cryptographic signing (not relevant for a personal tool). SBOM formats (SPDX, CycloneDX) are designed for software components with license tracking, not for text-file lineage. Adopting either format would impose significant schema overhead (mandatory fields for concepts that don't apply to JASON-OS — build system IDs, license expressions, package URLs). The JSONL ledger's 12 fields are already more minimal than any SBOM format allows.
**Why it might be wrong:** The research's ledger design is already structurally sound and grounded in the JASON-OS codebase conventions. SLSA provenance adds signing infrastructure and schema overhead that serve multi-party trust use cases, not a single-user personal workflow. The research explicitly validated the forward-pointer + content-hash edge model against independent systems (SPDX RelationshipType vocabulary among them — C-008) without adopting SPDX's schema. The validation is what mattered, not adopting the external format.
**Recommendation:** FILE-AS-FUTURE. The in-toto vocabulary is worth reading as a sanity check on the ledger's field naming (e.g., using `materials` and `subject` as conceptual anchors even if the field names differ). Not a reason to change the ledger design.

---

## Alternative 8: Self-describing port units ("port_recipe.md" next to each portable artifact)

**Category:** alternative framing
**What it is:** Instead of a recipe library that lives separately from the units it describes, each portable unit carries its own `port_recipe.md` next to it. A skill family at `.claude/skills/audit/` would contain `port_recipe.md` with: what sanitization is needed, what companion files travel with it, what post-port steps the destination must take. The `/port` companion reads the adjacent recipe file rather than looking up the comprehension cache.
**What it would buy:** Recipes are version-controlled alongside the thing they describe. When the skill changes, its recipe gets updated in the same commit. No separate recipe library to keep in sync. The `/port` companion's comprehension step becomes "find and read port_recipe.md" — fast, deterministic, no model dispatch required for units that have been thoughtfully documented. Port instructions are human-readable by anyone looking at the source repo.
**What it would cost:** Works only for units that are pre-documented. Novel units (first-time ports with no recipe) still require the full understanding-layer dispatch. The recipe must be authored and maintained — which is either manual overhead or itself requires a comprehension pass to generate. The comprehension cache (as designed) also learns from past ports and generalizes across similar unit types; per-unit `port_recipe.md` files don't generalize. Two units of the same type in the same repo would each have their own recipe with no shared structure.
**Why it might be wrong:** The research's comprehension cache is explicitly designed to capture reusable patterns across ports of the same unit type (C-040, C-042). A per-unit recipe file captures only that unit's specific recipe — a weaker artifact than a cache that can say "all skill families moving from JASON-OS to SoNash get verdict 'sanitize' with these recipes." The recipe library is a generalization; per-unit `port_recipe.md` is a specialization. For JASON-OS's size (small, curated), per-unit documentation may be more accurate — but the research's design scales better.
**Recommendation:** PLANNING-TIME LOOK — specifically as a complement to the comprehension cache. If the `/port` companion encounters a unit with a `port_recipe.md` adjacent, it could use that as the recipe source (high confidence, no model dispatch) instead of the cache. The cache then serves units without adjacent recipes. Hybrid: adjacent recipe = fast path for documented units; cache = fast path for undocumented but previously-ported unit types.

---

## Top 3 alternatives that deserve a planning-time look

**1. Per-file frontmatter lineage markers (Alternative 2 — hybrid form)**
Not as a ledger replacement, but as a complement. A moved file with `lineage_source: SoNash@abc123/...` in its frontmatter is self-describing without a ledger read. The planner should decide whether this redundancy earns its weight. It costs near-zero to implement and makes the ledger less load-bearing for the most common "where did this file come from?" question.

**2. GitHub API as an optional fast path for unowned repo discovery (Alternative 4)**
The bare-clone approach is correct as the default. But for GitHub-hosted repos where an auth token is present, the API avoids the scratch-directory management entirely. The planner should explicitly note whether this optimization is worth a conditional branch in the profile discovery companion, or whether bare-clone-always is cleaner.

**3. Self-describing port units as a fast-path complement (Alternative 8 — hybrid form)**
The comprehension cache handles unknown unit types; `port_recipe.md` handles well-documented ones. The two are additive. If a skill author documents their own port recipe, the `/port` companion should be able to use it directly without a model comprehension pass. The planner should decide whether the recipe-lookup priority order is: (1) adjacent `port_recipe.md`, (2) comprehension cache hit, (3) full understanding-layer dispatch.

---

## Things the research had right (didn't leave anything important uncovered on these)

**JSONL ledger, machine-local, gitignored.** The decision to keep the ledger out of git (C-014) is correct. Every alternative that uses git as the ledger (trailers, subrepo, PR-as-ledger) introduces merge conflicts, PII risks, or history pollution. The JSONL convention matches the existing codebase and has zero new infrastructure cost.

**Separate drift record for `/context-sync`.** The research's definitive rejection of forcing the full ledger onto `/context-sync` (C-021) is correct. The seven-field drift record is exactly sized for its problem. Alternatives that try to unify these two data structures would re-create the schema-sprawl failure pattern from Piece 2.

**Bare-clone for unowned repos.** The structural impossibility of writes into an unowned repo via bare-clone (C-030, C-031) is the right security property. GitHub API as an alternative would require credential management and is GitHub-only. Bare-clone works everywhere.

**Comprehension cache key excluding content hash from the key.** The decision to put `content_hash_at_last_verdict` in the value rather than the key (C-041) is validated by both ccache and Bazel's two-level design. Any alternative that includes content hash in the key would defeat the fast path's purpose for actively-developed units.

**chezmoi validation without chezmoi adoption.** The research used chezmoi's architecture to validate the drift detection approach (C-035) without adopting chezmoi as a dependency. This is the right call — chezmoi's interaction model (autonomous apply) conflicts with JASON-OS's confirmation-first model.
