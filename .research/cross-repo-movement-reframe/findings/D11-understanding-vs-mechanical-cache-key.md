# Findings: Cache-Key Shape for Understanding-vs-Mechanical Fast-Path

**Searcher:** deep-research-searcher (D1 — singleton in strand D)
**Profile:** web + reasoning
**Date:** 2026-04-23
**Sub-Question IDs:** D-standalone (open question #5 from BRAINSTORM.md)

---

## 1. Sub-Question

What is the cache-key shape that the tool uses to decide "this is in the recipe
library, skip full comprehension" vs "I need to invoke the understanding layer"?

Four sub-parts: cache key composition, tradeoff between too-narrow and
too-broad, invalidation triggers, and where the cache lives.

---

## 2. Approach

Surveyed four production build-system cache key designs:

- **Bazel** — action cache + CAS two-level key (SHA256 of command + inputs;
  separate content-addressable blob store)
- **Turborepo** — global hash + task hash two-level split (config/env/global
  files vs per-package files + env)
- **Nix** — input-addressed derivation hash (hash of name + system + builder +
  args + all input derivation paths)
- **ccache/sccache** — direct mode (manifest per source file; re-hash includes
  to validate) vs preprocessor mode (hash preprocessed output)

Applied findings against the BRAINSTORM.md constraints:
- "Recipe-first fast path for recognized patterns" — key must enable confident
  pattern matching without over-specificity
- "Not a bypass of the dashboard — a mode of it" — cache hits still surface in
  the dashboard
- "Implementation-level scope separation" — companions share a cache library but
  may have different cardinality tradeoffs

Cross-referenced with general cache key design literature on cardinality
tradeoffs and hit-rate observability.

---

## 3. Findings — Cache Key Composition

### Field-by-Field Analysis

**Field 1: unit_type**
Verdict: REQUIRED.
Rationale: The fundamental routing signal. A `skill-family` moves differently
from a `context-artifact`. Recipes are indexed by unit type. Without this
field, the cache key spans radically different movement behaviors. Analogous to
Bazel's "mnemonic" (action type label, hashed as part of the action key) [1].
Value space: the existing enum from BRAINSTORM.md — file / family / memory /
context-artifact / concept.

**Field 2: source_repo_id**
Verdict: REQUIRED.
Rationale: The same file type from two different source repos may have different
conventions. A `skill-family` from SoNash may need sanitization that one from a
fresh scaffold does not, because SoNash has evolved conventions baked into its
patterns. The source's identity is a prerequisite for the recipe's
applicability.
Analogous to Turborepo's workspace-level scope: the package context is part of
the task hash, not just global [2].
Representation: a short stable identifier — repo name slug or git remote URL
fragment. NOT a full git SHA (too narrow — would miss on every commit).

**Field 3: target_repo_id**
Verdict: REQUIRED.
Rationale: Different targets have different gate-and-guardrail profiles. A unit
moving into a repo with Semgrep + Gitleaks + pre-commit hooks needs different
shaping than one moving into a bare scaffold. The target identity controls which
convention profile applies.
Representation: same form as source_repo_id — stable repo slug.

**Field 4: target_convention_profile_fingerprint**
Verdict: REQUIRED — but NOT as a full profile hash.
Rationale: The fingerprint must capture what actually changes the recipe's
applicability. Two profiles that differ only in a color-scheme preference do not
change whether a YAML skill file needs its absolute paths scrubbed. The
fingerprint should be a hash of a small subset of the profile: specifically the
fields that recipes consult. Concretely: the gate flags vector (has_semgrep,
has_gitleaks, has_codeql, etc.) plus the target's directory convention for this
unit type. Not the entire profile object.
This is the Nix pattern: the derivation hash includes all inputs that affect the
output, and nothing more. Including irrelevant env variables causes spurious
cache misses — Bazel's explicit env allowlist (`--action_env`) exists precisely
to solve this [1, 3].
Representation: sha256 of the compact gate-flags JSON + shape-expectations
slice for this unit_type. Call it profile_slice_hash.

**Field 5: unit_content_hash**
Verdict: EXCLUDED from the fast-path key. INCLUDED in validation step.
Rationale: This is the critical design choice. Including the content hash in the
primary key makes the key too narrow — every edit to the source file would be a
cache miss, meaning the fast path would never fire for anything that changes.
The ccache design is instructive: direct mode does NOT hash the raw source file
as the primary key. Instead, it hashes the source file to build a manifest, then
uses the manifest entry for subsequent lookups. The content hash is the
validation check, not the routing key [4].
For this system: the cache key does NOT include unit content hash. Instead, the
cache stores a content_hash_at_last_verdict alongside the cached verdict.
At lookup time, if current content hash != stored content_hash_at_last_verdict,
the entry is stale and must be re-evaluated. This is invalidation trigger #1
(see section 5).

**Field 6: last_verdict**
Verdict: EXCLUDED from the key. It is the VALUE, not the key.
Rationale: The verdict (copy-as-is / sanitize / reshape / rewrite / skip /
blocked-on-prereq / greenfield-clone) is what the cache stores as its output.
Including it in the key would make the cache a no-op — you would need to know
the verdict to look it up.

**Field 7: recipe_library_version**
Verdict: REQUIRED — as a global hash component, not per-entry.
Rationale: When the recipe library updates, existing cached verdicts may be
wrong. But this is expensive to track per-entry. The better pattern (from
Turborepo's global hash [2]): a global signal that, when changed, invalidates
ALL entries. The recipe library version is a global hash input. When it bumps,
the entire cache is considered stale.
Implementation: store recipe_library_version in the cache header or as a
validated constant at startup. If the current version != stored version, the
fast path is disabled until the cache is rebuilt (or simply: emit all misses
until entries are repopulated by new verdicts).

### Summary Table

| Field                          | Role in Key       | Rationale                                    |
|-------------------------------|-------------------|----------------------------------------------|
| unit_type                     | REQUIRED          | Core routing signal; recipes are per-type   |
| source_repo_id                | REQUIRED          | Source conventions affect recipe match      |
| target_repo_id                | REQUIRED          | Target gates/shape drive which recipe fires |
| profile_slice_hash            | REQUIRED          | Compact hash of gate-flags + shape slice    |
| unit_content_hash             | EXCLUDED (key)    | In value as validation check only           |
| last_verdict                  | EXCLUDED (key)    | Is the value, not the key                   |
| recipe_library_version        | GLOBAL invalidator | Bumps invalidate entire cache               |

**Resulting key:**
```
unit_type + ":" + source_repo_id + ":" + target_repo_id + ":" + profile_slice_hash
```

---

## 4. Findings — Tradeoff: Too-Narrow vs Too-Broad

### The Pathological Cases

**Too-narrow (over-specificity trap):**
Including content hash in the key means every unit edit is a miss. The fast
path fires at rate approaching zero for any actively-developed source. The
ccache issue tracker documents this exact failure — including preprocessing
output as the ONLY key produces perfect correctness but defeats incremental
caching for large codebases [4].

**Too-broad (staleness trap):**
A key of just `unit_type + target_repo_id` ignores source conventions entirely.
A `skill-file` from a repo with CLAUDE.md-embedded absolute paths would get the
same cache entry as one without, causing the recipe to emit incorrect output
silently. The Bazel env-leakage problem is the canonical example: two machines
with different compilers in `/usr/bin/` get the same action key but different
outputs — the broad key produces wrong cache hits [1].

### The Sweet Spot

The sweet spot is: **structural identity, not content identity, in the key.
Content hash as a staleness check in the value.**

The key encodes "what kind of movement is this?" (type + source + target +
profile shape). The value stores "what was the verdict last time?" plus "what
was the content hash when we reached that verdict?" At lookup time, the two-step
check is:

1. Does a cache entry exist for this key? (Structure match)
2. Does the stored content_hash_at_last_verdict match the current content hash? (Content freshness)

If both pass: fast path fires.
If key exists but content hash differs: stale entry, run understanding layer, update entry.
If no key: cold miss, run understanding layer, create entry.

This mirrors ccache's direct mode manifest structure [4] and Bazel's two-level
AC + CAS separation [1, 5].

### Observable Quality Signal

The quality of the cache key design is measurable as:

**Primary signal: fast-path hit rate per unit_type bucket.**
A well-tuned key produces a stable hit rate (>60% for common file types after
the first few ports). A key that is too narrow shows near-zero hit rate even
for identical structural movements. A key that is too broad causes
understanding-layer verdicts to disagree with cached verdicts on re-inspection.

**Secondary signal: verdict divergence rate.**
When the understanding layer re-evaluates a unit (cache miss), compare its new
verdict to the stored verdict. If they frequently match for same-key entries,
the key is well-calibrated. If they frequently differ for same-key entries, the
profile_slice_hash is not capturing enough of the relevant profile structure.

**Tertiary signal: invalidation-storm frequency.**
If recipe_library_version bumps frequently and the entire cache empties each
time, the library version granularity is too coarse. Consider per-recipe
versions instead of a global version (but only if the library grows large enough
to warrant it — over-engineering guard applies).

---

## 5. Findings — Cache Invalidation Triggers

### Trigger 1: Source unit content changes

**Detection:** At lookup time, compute sha256 of the current unit body. Compare
to content_hash_at_last_verdict stored in the cache entry. If different,
invalidate the entry.

**Recovery:** Re-run the understanding layer for this unit. Update the entry
with the new verdict and new content hash.

**Signal type:** Per-entry, lazy (detected on next lookup, not proactively).
This is the correct pattern — proactive invalidation requires watching all
source files, which is build-system overhead. The tool only moves units on
explicit invocation; lazy detection is fine.

**Why NOT timestamp:** Timestamps are unreliable across machines and git
checkout operations. ccache notes that modification times trigger false
rebuilds when files are touched without content changes [4]. Content hash is
correct here.

### Trigger 2: Target convention profile re-discovered with a different fingerprint

**Detection:** On each tool invocation, the target-process-profile is either
loaded from cache (if it exists) or discovered fresh. If the profile discovery
produces a different profile_slice_hash than what is stored in existing cache
entries, those entries are stale.

**Recovery:** Invalidate all cache entries for this target_repo_id. The fast
path is disabled for that target until entries are repopulated by new verdicts.
This is a partial-cache invalidation (scoped to target), not a full flush.

**User signal:** Surface in the dashboard: "Target profile for [repo] has
changed since last port. [N] recipe cache entries invalidated. Understanding
layer will run for next ports to this target." Do NOT silently re-run. This is
a surfacing event that requires acknowledgment per the anti-goals.

### Trigger 3: Recipe library version bump

**Detection:** The recipe library maintains a monotonically increasing version
string. On startup, the tool checks the current version against the version
stored in the cache header.

**Recovery:** Full cache invalidation (all entries stale). The fast path is
disabled until entries are repopulated. The dashboard surfaces: "Recipe library
updated to v[N]. Cache cleared. Understanding layer will run until entries
rebuild."

**Granularity consideration:** If the library grows to dozens of recipes, a
global version is too coarse — a change to the `skill-family` recipe should not
invalidate `context-artifact` entries. Introduce per-unit_type recipe versions
when that threshold is reached. At v1 scale (small library), global version is
sufficient and simpler.

### Trigger 4: Manual user override ("re-comprehend this")

**Detection:** User explicitly requests re-evaluation ("even though the cache
says fast-path is fine, run the understanding layer").

**Recovery:** Mark the specific entry as force-invalidated. Run understanding
layer. Update entry with new verdict and content hash.

**Implementation:** Add a `force_recomprehend` flag to the lookup call. Skips
both the key lookup and the content-hash staleness check. The new verdict
overwrites the cache entry.

**Why this matters:** The cache must never be an invisible wall. The user has
the authority to say "I don't trust this cached verdict" without needing to
manually edit the cache file. This satisfies the "No fire-and-forget state
changes. All surfaced data requires acknowledgment" anti-goal.

---

## 6. Findings — Where the Cache Lives

### Option A: In the ledger (each port record stores its cache key + verdict)

Pros: No separate file. Lineage and cache are co-located. A port record already
exists when a verdict is produced.

Cons: The ledger is a lineage record — it tracks what happened, not what the
current recipe state is. Querying "what is the current fast-path verdict for
unit_type X, source Y, target Z?" requires scanning the full ledger for the
most recent matching record. The ledger can grow large. Cache-specific fields
(content_hash_at_last_verdict, recipe_library_version_at_verdict) pollute the
ledger schema. This couples two concerns that should stay separate.

Verdict: EXCLUDED. Schema coupling + query performance are disqualifying.

### Option B: Separate `.claude/state/comprehension-cache.jsonl`

Pros: Isolated concern. Fast to scan (small file, indexed by key). Can be
cleared without affecting ledger. Easy to inspect and debug.

Cons: Another file to manage. Requires its own schema and migration strategy.
Must coordinate invalidation with the ledger (if a ledger record for a port is
deleted, the cache entry may be orphaned).

Verdict: PREFERRED. The separation of concerns outweighs the coordination cost.

### Option C: In the target-process-profile (per-target cache entry)

Pros: Co-located with the profile data the cache key depends on. Natural
scoping.

Cons: The profile is scoped per target repo. But the cache key includes
source_repo_id too — entries for different source repos moving into the same
target would all live in the target's profile file. This creates a confusing
ownership model. Profile discovery and recipe verdict caching are different
operations with different invalidation semantics.

Verdict: EXCLUDED. Ownership model confusion outweighs co-location benefit.

### Option D: In the recipe library itself (annotations on each recipe)

Pros: Recipes are already authoritative about what they match. Adding "matches
these signatures" metadata is conceptually clean.

Cons: This conflates recipe coverage (structural) with instance-level verdict
caching (stateful). The recipe's match signature says "I cover skill-family from
any repo"; the cache says "last time I ran on this specific unit, the verdict
was sanitize." These are different levels of abstraction. The recipe library is
a static asset; the cache is mutable state. Mixing them creates update
complexity.

Verdict: EXCLUDED. Level-of-abstraction violation.

### Recommendation: Option B

`.claude/state/comprehension-cache.jsonl` with the following characteristics:

- One record per (unit_type, source_repo_id, target_repo_id, profile_slice_hash) tuple.
- Records are keyed by a compact key string; file is append-log (last wins) for simplicity, compacted periodically.
- Separate from the ledger. Ledger records movements; cache records recipe
  applicability.
- Cache header record (first line) stores recipe_library_version for global
  invalidation check.
- File is gitignored (local state, not portable). Cache is rebuilt from
  movements as they happen.

---

## 7. Proposed Cache Key Schema

```jsonc
// Cache header record (first line of comprehension-cache.jsonl)
{
  "record_type": "header",
  "recipe_library_version": "0.1.0",
  "created_at": "2026-04-23T00:00:00Z",
  "last_compacted_at": "2026-04-23T00:00:00Z"
}

// Cache entry record
{
  "record_type": "entry",
  "key": "skill-family:jason-os:sonash:a3f7b1c2",
  "key_fields": {
    "unit_type": "skill-family",
    "source_repo_id": "jason-os",
    "target_repo_id": "sonash",
    "profile_slice_hash": "a3f7b1c2"
  },
  "value": {
    "verdict": "sanitize",
    "recipe_ids": ["skill-family.strip-absolute-paths", "skill-family.normalize-frontmatter"],
    "content_hash_at_last_verdict": "sha256:4a8f...",
    "recipe_library_version_at_verdict": "0.1.0",
    "confidence": 0.92,
    "verdict_source": "understanding-layer",
    "last_updated_at": "2026-04-23T10:30:00Z"
  }
}
```

Key fields:
- `key` — concatenated string for fast scanning / grep-ability
- `key_fields` — exploded for readability and targeted queries
- `verdict` — the fast-path answer
- `recipe_ids` — which specific recipes to invoke (not just "go to recipe library"; names the exact ones)
- `content_hash_at_last_verdict` — staleness check at lookup time
- `recipe_library_version_at_verdict` — per-entry version for fine-grained invalidation when global version bumps but only some recipe categories changed
- `confidence` — the understanding layer's certainty at the time of verdict; if below threshold (e.g., 0.8), fast path does NOT fire even on a hit
- `verdict_source` — "understanding-layer" (derived from comprehension) or "user-override" (user manually set)

---

## 8. Worked Example

### Scenario: Moving a skill family from JASON-OS to SoNash

**Setup:**
- unit_type = "skill-family"
- source_repo_id = "jason-os"
- target_repo_id = "sonash"
- profile_slice_hash = "a3f7b1c2" (hash of SoNash's gate flags + skill-family shape expectations)
- key = "skill-family:jason-os:sonash:a3f7b1c2"

---

**Case A: Fast-path HIT**

1. User says "move /deep-research skill family to SoNash."
2. Orchestrator identifies unit_type = skill-family, source = jason-os, target = sonash.
3. Cache lookup: key "skill-family:jason-os:sonash:a3f7b1c2" found.
4. Staleness check: sha256 of current skill files = "sha256:4a8f..." matches content_hash_at_last_verdict. PASS.
5. recipe_library_version check: current "0.1.0" == version_at_verdict "0.1.0". PASS.
6. confidence = 0.92 >= 0.8 threshold. PASS.
7. Fast path fires. Dashboard surfaces: "Recipe fast-path: verdict = sanitize, recipes = [strip-absolute-paths, normalize-frontmatter]. Proceed? [Y/skip to full comprehension]"
8. User confirms. Recipes execute.
9. Ledger records the port with a note: "fast-path hit, cache key a3f7b1c2."

---

**Case B: Cache MISS (first time this source/target pair)**

1. User says "move /brainstorm skill to SoNash."
2. key = "skill-family:jason-os:sonash:a3f7b1c2" — no entry found.
3. Cold miss. Understanding layer invoked. Comprehension pass runs.
4. Verdict: sanitize (confidence 0.91). Recipe IDs identified.
5. Cache entry written with content hash of current skill files.
6. Dashboard surfaces: "Understanding layer verdict: sanitize. Recipes: [strip-absolute-paths]. Proceed?"
7. User confirms. Port executes. Ledger records.

---

**Case C: Cache HIT but content STALE**

1. User modified `/brainstorm` skill (added an absolute path reference).
2. User says "move /brainstorm skill to SoNash."
3. Cache lookup: key found, entry exists.
4. Staleness check: sha256 of current skill files = "sha256:9c2e..." != stored "sha256:4a8f...". FAIL.
5. Stale. Understanding layer re-invoked.
6. New verdict: sanitize (same, but now a new absolute path pattern is detected — recipe ID list updated).
7. Cache entry updated with new content hash.
8. Dashboard surfaces: "Content changed since last verdict — re-ran understanding layer. Verdict: sanitize (updated). Proceed?"

---

**Case D: Recipe library version bump — full invalidation**

1. Recipe library updated to "0.2.0".
2. Tool starts up. Reads header record: stored version "0.1.0" != current "0.2.0".
3. Entire cache invalidated (all entries treated as stale).
4. Dashboard surfaces: "Recipe library updated (0.1.0 -> 0.2.0). Understanding layer will run for all ports until cache rebuilds."
5. Next port runs understanding layer; rebuilds cache entry with version "0.2.0".

---

**Case E: Manual override**

1. User: "re-comprehend this even though the cache says fast-path is fine."
2. force_recomprehend flag set.
3. Cache lookup skipped entirely. Understanding layer runs.
4. If new verdict differs from cached: surface the difference, ask which to keep.
5. Cache entry updated with new verdict and user-override verdict_source.

---

## 9. Claims

1. **The fast-path key must NOT include the unit content hash.** [CONFIDENCE: HIGH]
   Content hash in the key defeats the optimization — every file change is a
   miss. Content hash belongs in the value as a staleness check. [Sources: 4, 2]

2. **A two-level key structure (structural key + content-hash validation) mirrors proven build system designs.** [CONFIDENCE: HIGH]
   Bazel uses AC (structural action key) + CAS (content-addressed blobs).
   ccache direct mode uses manifest (structural entry) + include hash
   validation. Both separate routing from freshness checking. [Sources: 1, 4, 5]

3. **profile_slice_hash must hash only recipe-relevant profile fields, not the full profile.** [CONFIDENCE: HIGH]
   Bazel's explicit env allowlist exists because broad env hashing causes
   spurious misses. Nix's derivation hash is a function of all and only
   inputs that affect the output. Same discipline applies here. [Sources: 1, 3]

4. **Recipe library version should be a global invalidator at v1 scale.** [CONFIDENCE: MEDIUM]
   Turborepo uses a global hash for configuration-level changes; per-task
   hashes for per-package changes. At small library scale (v1), the global
   approach is simpler and correct. Per-recipe versioning is the upgrade path
   if the library grows large. [Sources: 2]

5. **Cache miss rate and verdict divergence rate are the observable quality signals for key tuning.** [CONFIDENCE: MEDIUM]
   General cache design literature confirms hit rate and miss rate are the
   primary indicators of key cardinality problems. Verdict divergence (cached
   verdict vs re-evaluated verdict) is specific to this domain. [Sources: 6, 7]

6. **The cache must live in a separate file from the ledger.** [CONFIDENCE: HIGH]
   Ledger = lineage record (what happened). Cache = recipe applicability (what
   pattern applies). Coupling these produces schema pollution and incorrect
   query semantics. [Sources: reasoning from system separation principles]

7. **Fast-path hits must surface in the dashboard, not execute silently.** [CONFIDENCE: HIGH — ARCHITECTURE CONSTRAINT]
   Explicit in BRAINSTORM.md design constraint #1: "Not a bypass of the
   dashboard — a mode of it." Confirmed by the anti-goal: "Operate silently.
   No fire-and-forget state changes." [Source: BRAINSTORM.md]

8. **Confidence threshold below 0.8 should prevent fast-path firing.** [CONFIDENCE: MEDIUM]
   The understanding layer's confidence in its verdict is itself a signal.
   A low-confidence verdict cached should not drive a fast-path that skips
   re-evaluation. The threshold (0.8) is a first-pass proposal; calibrate
   against real verdicts. [Sources: reasoning]

---

## 10. Sources

| # | URL | Title | Type | Trust | CRAAP (avg) | Date |
|---|-----|--------|------|-------|-------------|------|
| 1 | https://bazel.build/remote/caching | Remote Caching — Bazel | Official docs | HIGH | 4.4 | 2024 |
| 2 | https://turborepo.dev/docs/crafting-your-repository/caching | Caching — Turborepo | Official docs | HIGH | 4.6 | 2025 |
| 3 | https://nix.dev/manual/nix/2.34/language/derivations.html | Derivations — Nix Reference Manual | Official docs | HIGH | 4.5 | 2024 |
| 4 | https://ccache.dev/manual/latest.html | ccache manual | Official docs | HIGH | 4.5 | 2025 |
| 5 | https://blogsystem5.substack.com/p/bazel-remote-caching | Understanding Bazel remote caching | Maintainer blog | MEDIUM-HIGH | 3.8 | 2023 |
| 6 | https://caioferreira.dev/posts/introducing-cache-in-your-system/ | Introducing Cache in your System | Engineering blog | MEDIUM | 3.2 | 2023 |
| 7 | https://wiki.nixos.org/wiki/Low-level_derivations | Low-level derivations — NixOS Wiki | Community docs | MEDIUM-HIGH | 3.6 | 2024 |

---

## 11. Gaps and Uncertainties

**Gap 1: confidence threshold calibration.**
The 0.8 threshold for suppressing fast-path on low-confidence verdicts is
proposed without empirical grounding. Real calibration requires running the
understanding layer on a corpus of known unit types and observing the
distribution of confidence scores. This cannot be done until the understanding
layer is implemented.

**Gap 2: profile_slice_hash — which profile fields are recipe-relevant.**
The design says "hash only the fields that recipes consult." Enumerating those
fields requires knowing the full recipe library structure, which does not exist
at v1 design time. The profile_slice_hash design is correct in principle; the
exact field list must be specified when recipes are authored.

**Gap 3: per-unit_type recipe versioning trigger.**
At what library size does global version invalidation become too coarse? No
empirical threshold found. Recommendation: revisit when the library reaches
10+ distinct unit_type recipe sets.

**Gap 4: cache compaction semantics.**
The append-log design (last-wins) requires periodic compaction. The trigger for
compaction (size threshold, time-based, on-startup) is not specified here. This
is an implementation detail for planning.

**Gap 5: orphaned cache entries.**
If a target_repo_id is removed from the tool's config, its cache entries become
permanently orphaned. A cleanup mechanism (scan cache on startup, drop entries
whose target_repo_id is not in the known-repos list) should be part of the
implementation design.

---

## Confidence Assessment

- HIGH claims: 5
- MEDIUM claims: 3
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH (core design pattern is well-supported by multiple
  production build systems; the BRAINSTORM architecture constraint is
  authoritative; uncertainties are implementation-detail calibration gaps,
  not structural unknowns)
