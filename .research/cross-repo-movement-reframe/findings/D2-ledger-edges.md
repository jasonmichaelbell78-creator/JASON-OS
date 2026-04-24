# Findings: How cross-repo "this came from that" relationships and repo-evolution events are represented in the ledger

**Searcher:** deep-research-searcher (A2)
**Profile:** web (case studies)
**Date:** 2026-04-23
**Sub-Question IDs:** A2 (edge representation, repo-evolution events, multi-repo transitive edges)

---

## 1. Sub-question (verbatim)

How are cross-repo "this came from that" relationships and repo-evolution events represented in the ledger?

Three sub-parts:
1. Edge representation — what model links source to destination?
2. Repo-evolution events — how does the ledger handle rename, split, merge, delete?
3. Multi-repo edges — graph or list when X came from Y which came from Z?

---

## 2. Approach

Searched for prior art across five technology families:

- Vendoring-with-history tools (git-subtree, git-subrepo)
- Software bill of materials standards (SPDX 3.0.1)
- Data lineage theory (Wikipedia data lineage, OpenLineage spec)
- Content-addressed identity (Nix content-addressed derivations)
- VCS history-tracking primitives (git log --follow, git replace/grafts, git-subtree commit annotations)

Fetched primary sources for each. Cross-referenced claims across at least two independent sources where possible.

---

## 3. Findings — Edge representation

### The five patterns

**Pattern A — Single forward pointer (destination knows its source)**

The destination record holds a pointer to the source. Source record has no knowledge of what was derived from it. Example: a JSONL ledger record on the JASON-OS side says `source_repo: "SoNash"` and `source_path: "skills/audit.md"`.

What it handles: simple ports, query "where did this come from?" answered from destination.
What it doesn't handle: "what has been derived from this file in SoNash?" — impossible without scanning all destination records.
Learn for JASON-OS: Sufficient if the primary query direction is always destination-to-source. Covers the most common case (user has a file in JASON-OS, wants to know its origin).

**Pattern B — Single backward pointer (source knows its destination)**

The source record lists all places it has been ported to. Destination record has no knowledge of origin. Example: SoNash skill manifest says `ported_to: ["JASON-OS/skills/audit.md"]`.

What it handles: "what depends on this source?" blast-radius queries.
What it doesn't handle: destination-side queries ("where did I get this?") without cross-repo record access.
Learn for JASON-OS: Bad fit. Requires writing into source repos on every port, which violates the architecture constraint that the tool never writes into repos the user doesn't own (inbound extraction from unowned repos). Also requires both repos be accessible to answer destination-side queries.

**Pattern C — Bidirectional pointer (both sides reference each other)**

Source record lists destinations; destination record lists source. Example: git-submodules before the move to .gitmodules — both the superproject and the submodule commit carried cross-references.

What it handles: queries in either direction without cross-repo access.
What it doesn't handle: consistency when one side updates and the other doesn't (pointer rot). Both repos must be updated atomically or the record diverges.
Learn for JASON-OS: Bidirectional pointers double the write surface and create a consistency hazard. Any network partition, failed write, or partial update leaves the ledger in a contradictory state. Not recommended.

**Pattern D — Graph edges (separate edge records)**

Relationships are stored as their own records, separate from both the source element record and the destination element record. Each edge record contains: source identifier, destination identifier, relationship type, and metadata. SPDX 3.0.1 uses exactly this model — the `Relationship` class is its own element with `from` and `to` properties [1]. OpenLineage uses a job-centric variant: each run event records `inputs` (source datasets) and `outputs` (destination datasets) as properties of the run, which is functionally a separate edge record keyed on the run [2].

What it handles: arbitrary graph queries, multiple relationship types on the same pair, adding new relationships without touching original element records.
What it doesn't handle: performance at query time without an index (must scan all edges to find all relationships for a given node). Also grows linearly with every relationship, not just every file.
Learn for JASON-OS: Correct model for a proper graph engine. May be overengineering for the 12-field-capped ledger if the primary query is always "where did this destination file come from?" — a single forward pointer answers that without a separate edge table.

**Pattern E — Content-addressed identity (both sides reference a content hash, no direct pointer)**

Identity is derived from the content itself. Two files are "the same" if their hash matches, regardless of name, path, or repo. Nix content-addressed derivations use this model: the store path depends only on content hash and output name, not on how the derivation was specified or where the source URL lives [3]. If source and destination have diverged, their hashes diverge and they are no longer the same identity.

What it handles: rename-immune identity, deduplication, "is this file still in sync?" answered by comparing hashes without any ledger record.
What it doesn't handle: tracking the *relationship* between two diverged files (once content diverges, the hash link breaks — you know they were once the same only if you recorded that fact at port time). Also, "same content" is not the same as "derived from" — two files can have the same content for coincidental reasons.
Learn for JASON-OS: Content hash is a valuable *component* of a ledger record (use it as `content_hash_at_port` to detect post-port divergence), but it is not sufficient as the sole edge representation. The "derived from" relationship must be explicitly recorded because content diverges immediately after a port that involves any adaptation.

---

### Recommendation: forward pointer + content hash at port time

**Use Pattern A (forward pointer) anchored by Pattern E (content hash at port time).**

The destination-side ledger record holds:
- A pointer to the source (repo + path at time of port)
- The content hash of the source file at the moment the port happened

This gives you:
- "Where did this come from?" — answered directly from the destination record (Pattern A).
- "Has the source file changed since I ported it?" — answered by recomputing the source hash and comparing to the stored hash (Pattern E serving as drift detector).
- No write into source repos (forward pointer only — source is never touched).
- No consistency hazard (one record, one write, one place to update).

The alternative (separate edge records, Pattern D) is correct for a graph engine but is overengineering for the ≤12-field hard cap. A graph engine can be approximated by querying all destination records with a given source repo+path — the forward pointer model supports this without a separate edge table.

**Field cost of this model:** `source_repo`, `source_path`, `source_commit_hash` (or `source_content_hash`). That is 3 fields dedicated to the edge relationship. Within the 12-field cap.

**For the four movement verbs:**
- **Port** — forward pointer + content hash. Standard case.
- **Sync-back** — same model plus a `last_sync_hash` field (tracks the source hash at the last reconciliation, enabling three-way merge). Adds 1 field for sync-back support.
- **Extract** (inbound from unowned repo) — forward pointer only. Content hash optional (extraction may involve summarization, not bit-for-bit copy). Source pointer is read-only metadata; no write back to source.
- **Context-sync** — may not need the full edge model. BRAINSTORM.md already flags this as an open question (OQ-8). A lightweight drift record with content hash and no source pointer may suffice for user-scoped artifacts.

---

## 4. Findings — Repo-evolution events

### How to think about these

The ledger is a record of *what was moved at a point in time*, not a live mirror of the source. This is the most important design principle for handling evolution events: the ledger records a snapshot relationship, not a live reference. The practical consequence is that **most evolution events in the source repo do not invalidate the ledger record — they just mean the ledger record describes a past state**.

The question for each event is: what breaks if the ledger is not updated, and how hard is the fix-up?

---

### 4a. Repo rename (source repo "SoNash" renamed to "claude-os")

**What breaks if not updated:** Every ledger record with `source_repo: "SoNash"` now points to a repo that no longer exists at that name. The "has source changed?" drift check fails (can't find the repo). The "check what's out of sync" dashboard command reports all SoNash-sourced items as unknown/unreachable.

**What the ledger should do:** Rename events are a repo-level operation, not a file-level operation. The fix-up is a bulk update: find all records with `source_repo: "SoNash"`, rewrite to `source_repo: "claude-os"`. This is a single scan of the ledger, not a file-by-file operation.

**Fix-up UX:** The orchestrator detects a `404 / not found` on any ledger pointer resolution. It offers: "The repo `SoNash` could not be found. Has it been renamed? Provide the new name and I will update all ledger records." User provides new name, bulk update happens, confirmed.

**What to learn from prior art:** git-subtree stores the upstream URL as a commit annotation. When the upstream URL changes, git-subtree loses the connection silently — future `git subtree pull` against the new URL fails to match the old annotations [4]. The lesson: store the repo name as a mutable, human-readable identifier (not a URL), and support bulk rename. Do not rely on URLs as stable identifiers.

---

### 4b. File rename (ported skill file is renamed in source after the port)

**What breaks if not updated:** The ledger record still points to the old path (`source_path: "skills/audit.md"`). The drift check tries to read that path, finds nothing, and incorrectly reports "source deleted" rather than "source renamed."

**What the ledger should do:** Nothing automatic. The ledger records the state at port time. A source-side rename is not something the ledger tool can detect without actively checking the source repo. On the next explicit "check what's out of sync" invocation, the tool resolves the pointer, gets a 404, and reports "source file `skills/audit.md` in SoNash is no longer present."

**Fix-up UX:** Tool reports: "Source `skills/audit.md` in SoNash could not be found. It may have been renamed or deleted. Check SoNash and provide the new path, or mark this record as 'source-renamed'." User provides new path, ledger record updated with a note. Alternatively: use git-log --follow on the source repo to attempt automatic rename detection before reporting it as missing.

**What to learn from prior art:** `git log --follow` uses content-similarity heuristics to trace renames retroactively [5]. It works well when the rename is a clean move with no simultaneous content change. It fails when content was heavily modified at rename time. The lesson: content hash at port time (`source_content_hash`) provides a fallback — even if the path changed, you can search the source repo for a file with the same or similar hash to find the renamed file. Not perfect, but better than nothing.

---

### 4c. File split (a single ported unit is refactored into 2 files in destination)

**What breaks if not updated:** The ledger has one record pointing source `skills/audit.md` → destination `skills/audit.md`. After the split, the destination has `skills/audit-core.md` and `skills/audit-ui.md`. The original ledger record now points to a path that no longer exists in the destination. On "check what's out of sync," it appears as a broken record.

**What the ledger should do:** When the user splits a ported file, the ledger library must be invoked explicitly to update the record. The original record should be marked as superseded, and two new records created — one per destination file — both pointing to the same source. This is a manual step; the tool cannot detect a split automatically (the filesystem doesn't distinguish a delete+add from a rename+add).

**Fix-up UX:** The companion skill that performs the split should prompt: "You are about to split a tracked file. I will update the ledger to create one record per new file, both pointing to the original source. Confirm?" User confirms; ledger is updated inline with the split operation. If the split was done outside the tool, the "check what's out of sync" dashboard reports a broken destination path and offers: "Create two ledger records for the split files?"

**Field-count note:** No new fields needed. Two records with the same `source_repo`+`source_path` are how a split is represented. The only addition is a `status: superseded` on the original record if it is kept for historical reference. If `status` is already a field, this is free.

**What to learn from prior art:** SPDX 3.0 handles this with separate `Relationship` elements — a `copiedTo` relationship can have one `from` and multiple `to` elements in a single relationship record [1]. This is more compact than two separate records, but it requires the relationship element to be updated when the split happens. For JASON-OS's forward-pointer model, two records with the same source is the equivalent and is simpler.

---

### 4d. File merge (two ported units combined into one in destination)

**What breaks if not updated:** Two ledger records both point to their respective sources. After the merge, both destination paths are gone. Both records report broken destination paths on drift check.

**What the ledger should do:** The merged file has two origins. The ledger should support multiple source pointers on a single destination record. This is the one case where the forward-pointer model (one source per record) is insufficient on its own. A merge produces a destination file that "came from" two sources.

**Fix-up UX:** When the user merges two tracked files, the tool prompts: "You are merging two tracked files. I will update the ledger to record both sources for the merged file. Confirm?" This requires either: (a) the destination record supports a list for `source_path`/`source_repo` fields (multi-valued), or (b) two records are created with the same destination path, each pointing to a different source.

**Option (b) — two records, same destination — is the cleaner approach** under the 12-field cap. No new fields needed; the representation is implicit (two records with matching destination path = merged file with two origins). The orchestrator's query logic needs to handle "multiple records for same destination" as a merge signal.

**What to learn from prior art:** Data lineage theory represents merges as a transformation node with two inputs and one output (per-hop edge model) [6]. In SPDX, a file that descends from two sources would have two `descendantOf` relationships. Both approaches converge on "record each origin separately" rather than trying to pack two origins into one record.

---

### 4e. File delete (ported source file deleted; what happens to the ledger record on the destination side?)

**What breaks if not updated:** The ledger record still points to a source that no longer exists. Drift check reports "source not found." This is the same observable symptom as a rename, but with a different resolution.

**What the ledger should do:** Nothing automatic. On drift check, the tool reports "source `skills/audit.md` in SoNash could not be found — it may have been deleted or renamed." The ledger record on the destination side remains valid — the file still exists in the destination. The record becomes a historical artifact: "this file was ported from SoNash at commit X; the source has since been deleted."

**Fix-up UX:** Tool offers three options: (1) "Mark source as deleted — keep the ledger record as historical." (2) "The file was renamed — provide new source path." (3) "This file is now standalone — remove source pointer and keep destination as an independent copy." All three are valid outcomes; the user chooses.

**Field needed:** A `source_status` field with values: `active` | `source_deleted` | `source_renamed` | `standalone`. This is 1 field. If the 12-field cap is tight, `source_status` could be folded into a general `status` field that covers both destination status and source status. Worth flagging to A1 (field naming).

**What to learn from prior art:** SPDX does not address element deletion in its relationship model — relationships use stable SPDXID references and provide no migration guidance for changed references [7]. git-subrepo similarly has no mechanism to detect or respond to upstream deletion; the `.gitrepo` metadata file simply becomes stale. The lesson: explicit status field is necessary and cannot be inferred from external state alone.

---

### 4f. Repo deletion / archival

**What breaks if not updated:** Every ledger record pointing into the deleted/archived repo has a broken `source_repo` reference. Drift check for all those records fails.

**What the ledger should do:** Repo deletion/archival is a bulk event. Same pattern as repo rename but with a different resolution: instead of rewriting to a new name, all records with that `source_repo` should be marked `source_status: source_repo_deleted` (or `source_repo_archived`). The destination files still exist and are still valid; they are now independent copies.

**Fix-up UX:** Tool detects the repo is unreachable on any pointer resolution. Reports: "Repo `SoNash` appears to have been deleted or archived. Mark all N records from this repo as 'source-archived'?" User confirms; bulk status update.

**Critical point:** If the user has multi-repo relationships (X in JASON-OS from Y in SoNash from Z in third-repo), and third-repo is deleted, the SoNash→JASON-OS hop is still valid. Only the leaf-hop record is affected. This is the argument for per-hop edges (see section 5).

---

## 5. Findings — Multi-repo transitive edges

### The scenario

File X in repo JASON-OS was ported from file Y in repo SoNash, which itself was ported from file Z in repo third-repo. Three repos, two hops.

### Three representation options

**Option 1 — One record per hop**

JASON-OS ledger has one record: `source: SoNash/Y`.
SoNash ledger has one record: `source: third-repo/Z`.

To find the full ancestry of X, you query JASON-OS ledger (one hop), then query SoNash ledger (second hop), then stop when there are no more source pointers.

- Pro: Each ledger is self-contained. Deleting third-repo only breaks the SoNash record, not the JASON-OS record.
- Pro: Ledger records stay small — no field explosion for deep ancestry chains.
- Pro: Each hop is independently queryable and auditable.
- Con: Full ancestry requires recursive cross-repo lookups. If SoNash is unavailable, you cannot traverse past the first hop.
- Con: No single-record view of "where did this ultimately come from?"

Data lineage theory supports this model: "triplets of form {i, T, o}" where each hop is a separate association [6]. The per-hop model is the standard in data lineage systems.

**Option 2 — One record with full ancestry chain**

JASON-OS ledger record for X includes `ancestry: ["SoNash/Y", "third-repo/Z"]`.

- Pro: Full provenance visible in a single record, no cross-repo lookups.
- Con: Every intermediate hop must update the destination record when its own source record is updated. Source-of-source changes cascade to destination.
- Con: Field cost: the ancestry array is unbounded in depth. Violates the 12-field hard cap unless capped at a fixed depth.
- Con: If third-repo is renamed, every record that transitively traces to third-repo must be updated — a deep cascade.

**Option 3 — Separate ancestry graph**

A separate "ancestry" structure (either a file or a section of the ledger) stores the transitive graph independently, while each record has only the immediate-hop forward pointer.

- Pro: Separates the per-file record (simple, bounded) from the graph (potentially complex, but only queried when needed).
- Con: Adds implementation complexity. Two data structures to keep in sync.
- Con: Overkill for the JASON-OS use case, which involves a small number of repos (user owns a handful of repos, not hundreds).

---

### Recommendation: one record per hop (Option 1)

For JASON-OS, the realistic transitive depth is at most 2-3 hops (user owns a small number of repos). The recursive lookup cost is trivial at this scale. Full ancestry is derivable by following the chain.

Per-hop edges also align with the "ledger as append-only record of movements" architecture: each movement event produces one record, regardless of ancestry. If JASON-OS later ports a SoNash file that was itself ported from third-repo, the JASON-OS ledger gains one new record pointing to SoNash. SoNash's existing record is unchanged.

The one caveat: the "check what's out of sync" dashboard command needs to follow the chain when it finds a SoNash source that is itself tracked. This is a query-time concern, not a storage-schema concern.

---

## 6. Recommendation summary

**Edge model: forward pointer (destination knows its source) + content hash at port time.**

One record per movement event, stored in the destination repo's ledger. Each record holds the source repo identifier, source path at port time, and source content hash at port time. No writes into source repos. No bidirectional pointers. No separate edge table.

**Field budget for the edge relationship:**
- `source_repo` — mutable identifier (not URL), supports bulk rename
- `source_path` — path at port time; may become stale after source rename
- `source_content_hash` — hash at port time; used for drift detection and rename search
- `source_status` — `active | source_deleted | source_renamed | standalone` (1 field; doubles as tombstone mechanism)

That is 4 fields for the full edge relationship. Within the 12-field cap when combined with the fields A1 will determine for unit-type, scope-tag, movement verb, and timestamp.

**For splits:** Two records with same source, different destinations. No new fields.
**For merges:** Two records with different sources, same destination. No new fields. Query logic handles "multiple records, same destination" as a merge signal.
**For deletes/renames/repo-events:** Update `source_status` and/or `source_path`/`source_repo`. Bulk operations for repo-level events.
**For transitive hops:** One record per hop. Ancestry is the chain of ledger records, not a field in any single record.

**One constraint to flag:** If A1's field analysis drives the field count above 8 for non-edge fields, the 4-field edge budget will conflict with the 12-field cap. In that case, `source_content_hash` is the first field to drop (retain as a nice-to-have, not required for correctness). `source_status` is the second candidate for consolidation into a general `status` field.

---

## 7. Claims

| # | Claim | Confidence | Source(s) |
|---|-------|-----------|----------|
| 1 | SPDX 3.0.1 stores relationships as separate Relationship element records with `from` and `to` properties, not as inline pointers within element records | HIGH | [1] SPDX 3.0.1 spec |
| 2 | git-subtree tracks upstream relationships via formatted commit message annotations (`git-subtree-dir`, `git-subtree-split`) rather than a dedicated metadata file, and loses tracking if upstream URL or path changes | HIGH | [4] Giant Swarm Handbook |
| 3 | git log --follow uses content-similarity heuristics (default 50% threshold) for rename detection; fails when files are heavily modified during a move | HIGH | [5] thelinuxcode.com 2026, independent confirmation from labex.io |
| 4 | Nix content-addressed derivation outputs derive identity from content hash + output name, not from source URL or derivation inputs; URL changes do not affect store path | HIGH | [3] Determinate Systems Nix manual |
| 5 | Data lineage theory represents transitive provenance as per-hop association triplets {input, transformation, output}, not as full ancestry chains in single records | MEDIUM | [6] Wikipedia data lineage |
| 6 | SPDX 2.3 relationship records do not address what happens when a referenced element is renamed or deleted — the specification assumes stable element identifiers | HIGH | [7] SPDX 2.3 spec |
| 7 | git-subrepo stores upstream remote and branch in a `.gitrepo` file within the subrepo directory; detailed field structure not confirmed in official documentation | MEDIUM | [8] Debian manpage (incomplete) |
| 8 | OpenLineage represents lineage through job-run events with `inputs` and `outputs` dataset arrays — functionally per-hop edge records keyed on run — and does not specify behavior for dataset renaming or deletion | MEDIUM | [2] OpenLineage deepwiki spec |
| 9 | Bidirectional pointers (source knows destination AND destination knows source) create consistency hazards when one side updates and the other doesn't | MEDIUM | First-principles reasoning, supported by git-submodule design decisions [implied from Atlassian tutorial] |
| 10 | Content hash alone cannot represent "derived from" relationships once content diverges; the relationship must be explicitly recorded at port time | HIGH | [3] Nix manual (content-addressed identity breaks on divergence), first-principles |

---

## 8. Sources

| # | URL | Title | Type | Trust | CRAAP (avg) | Date |
|---|-----|-------|------|-------|-------------|------|
| 1 | https://spdx.github.io/spdx-spec/v3.0.1/model/Core/Vocabularies/RelationshipType/ | SPDX 3.0.1 RelationshipType vocabulary | Official spec | HIGH | 4.4 | 2024 |
| 2 | https://deepwiki.com/OpenLineage/OpenLineage/1.1-core-specification | OpenLineage Core Specification | Community/derived | MEDIUM | 3.4 | 2024 |
| 3 | https://manual.determinate.systems/store/derivation/outputs/content-address.html | Nix Content-Addressed Derivation Outputs | Official docs | HIGH | 4.2 | 2024-2025 |
| 4 | https://handbook.giantswarm.io/docs/product/managed-apps/dev-experience/git-subtree/ | Git subtree for tracking upstream — Giant Swarm | Maintainer docs | MEDIUM-HIGH | 3.8 | 2024 |
| 5 | https://thelinuxcode.com/git-move-files-practical-renames-refactors-and-history-preservation-in-2026/ | Git File Rename and History Preservation 2026 | Community | MEDIUM | 3.2 | 2026 |
| 6 | https://en.wikipedia.org/wiki/Data_lineage | Data lineage — Wikipedia | Reference | MEDIUM | 3.6 | 2024 |
| 7 | https://spdx.github.io/spdx-spec/v2.3/relationships-between-SPDX-elements/ | SPDX 2.3 Relationships between Elements | Official spec | HIGH | 4.4 | 2023 |
| 8 | https://manpages.debian.org/testing/git-subrepo/git-subrepo.1.en.html | git-subrepo man page | Official docs | HIGH | 4.0 | 2025 |
| 9 | https://developers.redhat.com/articles/2026/02/17/how-contextual-sbom-pattern-improves-vulnerability-management | Contextual SBOM pattern — Red Hat | Official blog | MEDIUM-HIGH | 3.8 | 2026 |

---

## 9. Gaps and uncertainties

1. **git-subrepo .gitrepo field structure not confirmed.** The man page does not list specific field names stored in `.gitrepo`. The claim that it stores upstream commit hash and remote is inferred from the tool's behavior, not confirmed from primary field documentation. A direct inspection of a live `.gitrepo` file would confirm.

2. **OpenLineage rename/delete handling not specified.** The OpenLineage spec is silent on what happens to lineage records when datasets are renamed or deleted. This gap is shared across most lineage systems surveyed — none provide explicit guidance.

3. **SPDX 3.0 handling of deleted/renamed elements not specified.** Same gap as OpenLineage. The SPDX relationship model assumes stable identifiers; no migration path is documented.

4. **The 12-field hard cap interaction is A1's problem, but a 4-field edge budget is asserted here.** If A1 finds that non-edge fields (unit type, scope tag, movement verb, timestamps, status, notes) require more than 8 fields, the 4-field edge budget may need trimming. `source_content_hash` is the most obvious candidate to drop to 3 fields if necessary.

5. **Context-sync ledger need is unresolved (OQ-8 from BRAINSTORM.md).** This research did not investigate whether `/context-sync` needs the full edge model. The BRAINSTORM explicitly leaves this open. A1 or A4 may have relevant findings.

6. **Merge representation is asserted, not confirmed from prior art.** The "two records, same destination" approach for file merges is a first-principles recommendation. No prior art was found that explicitly addresses the "two ported files merged into one" case in a small-repo ledger context.

7. **No prior art found for "file split" handling in a non-graph ledger.** The SPDX graph approach (one-to-many `copiedTo` relationship) was cited, but no small-file JSONL system with an explicit split-handling mechanism was found.

---

## Confidence assessment

- HIGH claims: 5
- MEDIUM claims: 5
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: MEDIUM-HIGH

The edge model recommendation (forward pointer + content hash) is well-supported by multiple independent systems converging on similar patterns. The repo-evolution event handling is largely first-principles reasoning anchored by the confirmed behavior of prior-art systems (git-subtree, SPDX). The multi-hop recommendation (per-hop records) is well-supported by data lineage theory. The main uncertainties are in the specific field names (A1's scope) and the merge/split edge cases (no direct prior art found).
