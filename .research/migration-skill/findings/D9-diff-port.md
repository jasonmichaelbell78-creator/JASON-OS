# D9 — Re-port / diff-port / fix-only-pull / revert-port semantics

**Agent:** Phase 1 D-agent D9-diff-port
**Sub-question:** SQ-D9 (BRAINSTORM §5 Q9)
**Depth:** L1
**Date:** 2026-04-21

---

## Summary

Once `/migration` has ported unit X from SoNash → JASON-OS once, the port is not
one-shot: both sides drift, and future changes may need to flow in either
direction, sometimes wholesale, sometimes as a narrow slice. Four distinct
patterns emerge: **full re-port**, **diff-port**, **fix-only pull**, and
**revert-port**. They are not four different skills — they are four modes of a
single "re-synchronization" operation that differ along two axes: **scope**
(whole-unit vs. narrow-slice) and **direction** (forward SoNash→JASON-OS vs.
reverse JASON-OS→SoNash).

The mechanism is not novel. It is a direct analog of:

- Linux kernel stable-tree backports (narrow-slice forward) + AUTOSEL classifier
- Copybara's `merge_import` mode (diff3 three-way merge preserving destination-only changes)
- Git cherry-pick (semantically equivalent to a 3-way merge against the picked commit's parent)
- Rails `app:update` with `THOR_MERGE` (three-way interactive merge during upgrade)

**Recommendation:** v1 ships **full re-port only**. Diff-port, fix-only, and
revert-port are v1.1+. All four modes share the same three-way-merge substrate
(base / source / destination), so the v1 implementation of re-port should
preserve enough state to make the other three modes an extension, not a rewrite.

**/sync vs /migration boundary (one sentence):** `/sync` detects drift and emits
a drift report at the *file* level (same / different / only-on-one-side);
`/migration` owns the *semantic* diff (what changed, why, and whether it should
propagate) and the *transformation* (sanitize/reshape/rewrite per D23/D24).

---

## 1. Four-scenario catalog

### Scenario A — Full re-port

**Shape:** Unit X was ported once (say 2026-02). SoNash has since added two
features + a bugfix to X. JASON-OS has independently sanitized-reshaped X and
added one small local adjustment. User wants JASON-OS's copy of X to absorb
everything SoNash has done since, while preserving JASON-OS's local adjustment.

**Is it a fresh `/migration` invocation?** Mostly yes, but with starting
context. The 7-phase arc still applies (discovery → research → plan → execute →
prove). What differs from the first port:

- **Phase 1 (discovery)** already has the prior port's manifest/state → reads
  as "what was X last port SHA" instead of "does X exist in destination?"
- **Phase 3 (research)** can skip destination-idiom research if idioms haven't
  shifted — verdict-conditional like R4 (D25).
- **Phase 4 (plan)** must produce a **3-way merge plan**, not a copy plan:
  - BASE = X at last-ported-SHA (reconstructed from SoNash git history)
  - SOURCE = X at current SoNash HEAD
  - DEST = X at current JASON-OS HEAD
- **Phase 5 (execute)** performs the merge with gated user conflict-resolution.

**Verdict:** Same `/migration` skill, explicit **re-port mode** flag, same
phase arc, different Phase 4 artifact shape.

### Scenario B — Diff-port

**Shape:** Only pull forward the *new work* on source side, not the whole unit.
Example: SoNash added one new exported helper to X; JASON-OS wants that helper
without re-examining the other 500 lines.

**Different mode? Different skill?** Same skill, narrower **diff-port mode**.
Key differences from full re-port:

- Unit granularity drops *below* the file — /migration now works on a
  commit-range or a patch-hunk, not a whole unit.
- The LLM must decide: "does this hunk make sense in isolation, or does it
  depend on adjacent un-ported hunks?" — dependency-chain analysis is
  mandatory (cf. Linux stable-tree: "fix must be standalone or brought with
  prerequisites").
- Conflict surface is smaller → gate count can compress.

**Verdict:** Same skill, mode flag `diff-port`, unit-type expands from
file/workflow/concept (D1) to include **commit-range** and **hunk-set**.

### Scenario C — Fix-only pull

**Shape:** Strictly narrower than diff-port. SoNash fixed a bug in X; SoNash
*also* added two features to X in the same period. JASON-OS wants ONLY the
bugfix commit(s), not the features.

**How does it differ from diff-port?**

- Diff-port pulls *everything new*; fix-only pulls *a designated subset*.
- Requires classification: which commits are fixes vs. features vs.
  refactors? (Linux kernel solves this with `Fixes:` trailer + AUTOSEL
  classifier; `Cc: stable@` convention; AI-based AUTOSEL since 2025.)
- High prerequisite-dependency risk: a bugfix may sit atop refactor commits
  that must be brought along or rebased away.

**Verdict:** Same skill, mode flag `fix-only-pull`. Requires an additional
Phase 2 classifier step (per-commit intent label: fix / feature / refactor /
docs). Can reuse commit-message heuristics (`fix:`, `Fixes:`) and/or delegate
to an LLM classifier agent analogous to AUTOSEL. Highest v1 complexity of the
four — strong candidate for v1.1+ deferral.

### Scenario D — Revert-port (back-flow)

**Shape:** While porting X into JASON-OS, `/migration` discovered a latent bug
and fixed it in the JASON-OS copy. That fix should flow back to SoNash.

**Same mechanism?** Yes, modulo direction. Per D16 (full both-direction build
from v1), direction is a parameter (`direction: in|out`) and D17
(endpoint-bounded repo-agnostic) makes JASON-OS always-one-endpoint regardless
of direction. Revert-port is simply "diff-port with direction=out from
JASON-OS to SoNash" and inherits diff-port's machinery.

**Wrinkle:** The sanitize transform was forward-only (strip secrets going out
of SoNash). Going back in, the *inverse* transform is "restore home-context
assumptions" which may not be reversible (e.g., a sanitize regex that
collapsed a repo-specific path to `<REPO>` cannot be un-collapsed without
context from the SoNash side). This means revert-port requires a **reshape
step** even on verdicts that were `sanitize` on the way out.

**Verdict:** Same skill, `direction=out` + mode=`diff-port` or `fix-only-pull`.
Asymmetric-sanitize handling is a new Phase 5 concern not present on the
forward path.

---

## 2. Detection methods

How does `/migration` recognize which scenario is in play?

| Method | Signal | Strength | Weakness |
|---|---|---|---|
| **Explicit user flag** | `/migration X --mode=diff-port` | Cheap, unambiguous, honors D8 (nothing silent) | User must know which mode applies |
| **Git-history comparison** | Walk SoNash + JASON-OS history for X; compute divergence point | Objective, reproducible | Requires reliable "last-ported SHA" state (see §3) |
| **File-hash comparison** | SHA256(X_sonash) vs SHA256(X_jason) vs last-known hash | Fast first-pass drift detection | Binary same/different; no semantic detail |
| **Rolling+strong checksum (rsync-style)** | Delta blocks between versions | Gives hunk-level granularity for free | Overkill for source files; textual diff is already sufficient |
| **LLM semantic diff** | Agent reads both versions + diff, categorizes each hunk as fix/feature/refactor | Handles Scenario C's classification need | Cost; requires human gate |
| **Commit-message trailers** | Linux-kernel-style `Fixes:`, `Cc: stable@`, Conventional Commits `fix:` | Cheap classifier input for Scenario C | Depends on disciplined commit hygiene |

**Recommendation:** Layered detection.

1. Cheap first pass: `/sync` reports "X differs" (file-hash comparison).
2. `/migration` reads **per-unit state** (§3) to find last-ported SHA.
3. Git-history comparison decides scope (whole-unit vs. hunks).
4. If scope is hunks and mode is `fix-only-pull`, LLM classifier + trailers
   label each commit.
5. User confirms mode via explicit gate (D8/R3).

---

## 3. Per-unit state schema

To support any of the four scenarios, `/migration` needs durable per-unit
state. This is the **MIGRATION_LEDGER** companion to the `MIGRATION_PLAN.md`
artifact (D3/D26).

Proposed fields (9 core + 2 optional):

1. **unit_id** — stable identifier (file path, concept name, workflow name)
2. **unit_type** — file / workflow / concept (D1)
3. **direction_of_original_port** — `in` (SoNash → JASON-OS) or `out`
4. **last_ported_at_sha_source** — source-side git SHA at port time
5. **last_ported_at_sha_dest** — destination-side SHA at port commit
6. **verdict_applied** — copy-as-is / sanitize / reshape / rewrite (D23)
7. **sanitize_transforms_applied** — list of regex/template transforms (for
   reversibility analysis on revert-port)
8. **reshape_notes** — free-text: what structural changes were made, so
   subsequent re-ports don't re-ask the user
9. **prior_port_plan_ref** — path/commit of the MIGRATION_PLAN.md that
   governed the original port (traceability)
10. *(optional)* **known_divergences** — list of intentional destination-only
    changes that should survive re-port (cf. Copybara `merge_import`'s
    destination-only preservation)
11. *(optional)* **blocked_on** — prerequisite IDs (for Scenario C dependency
    chains)

**Count:** 9 required + 2 optional = **11 fields total**.

**Storage:** per-unit JSON records in `.migration/ledger/<unit_id>.json`
mirrored across both endpoints (consistent with D18 workshop posture:
artifacts live centrally in JASON-OS, but the ledger must be readable from
either side for direction=out flows).

---

## 4. Relation to `/sync` (D9 consumer boundary)

Per D9, `/migration` is a **consumer + side-by-side** of `/sync`, not a
re-implementation. Concrete division of labor for diff-port scenarios:

**/sync provides:**

- File-level drift detection: "X exists in both, contents differ"
- Label-driven classification of which files are even in scope
- Sanitization transforms for files that cross the sanitize boundary (the
  base layer — regex transforms are /sync's job)
- Bidirectional propagation of the ledger itself (meta-recursive per §3.3 of
  sync-mechanism BRAINSTORM)

**/migration consumes /sync's drift report** and adds:

- Semantic diff: what *changed* (fix? feature? refactor?)
- Commit-range / hunk-set scoping
- Three-way merge planning with BASE = last-ported SHA
- Reshape / rewrite beyond sanitize (D23/D24)
- Prerequisite-chain analysis for Scenario C
- Asymmetric-sanitize handling for Scenario D revert-ports

**/sync does NOT provide:**

- Semantic classification of hunks (out of /sync scope; that's /migration's
  reshape layer)
- Interactive conflict resolution beyond "which side wins for this file"
- Cross-unit dependency reasoning (e.g., "bringing bugfix A requires also
  bringing refactor B")

**Architectural rule:** `/migration` never duplicates /sync's drift scan. It
reads /sync's output and adds a layer. If /migration finds itself doing raw
file-hash comparison, that's a smell — delegate to /sync.

---

## 5. Comparable tools catalog

Six prior-art analogs informing the design:

### 5.1 Git cherry-pick
Foundational primitive. Cherry-pick is internally a 3-way merge with BASE =
the picked commit's parent. Maps directly to diff-port's Scenario B. Has the
well-known "duplicate-commit / new hash on different ancestry" problem, which
is exactly the problem per-unit state (§3) is designed to solve by recording
the pairing. The `-x` flag documents origin — `/migration` should emit
equivalent provenance in commit messages.

### 5.2 git merge-file / diff3 (three-way merge)
The actual algorithm. Copybara's `merge_import` shells out to `diff3` with
(1) origin, (2) baseline, (3) destination. This is the exact shape `/migration`
needs. **Recommendation:** implement `/migration`'s 3-way merge as a call to
git's built-in `git merge-file` (same substrate as cherry-pick) rather than
custom diff logic.

### 5.3 Copybara `merge_import`
Most direct analog. Copybara is Google's internal→external code mover;
`merge_import` mode preserves destination-only edits while absorbing source
changes. Designates one repo as authoritative (source of truth). For
`/migration`, SoNash is the default source-of-truth, but D16 (both directions)
means authority is a per-unit attribute, not a global constant.

### 5.4 Linux kernel stable-tree backport + AUTOSEL
The reference for **Scenario C fix-only-pull**. Kernel workflow:
- Commits trailing `Fixes: <sha>` and/or `Cc: stable@` are candidates
- AUTOSEL (LLM-based since 2025) classifies uncertain commits
- Stable maintainers cherry-pick onto target branch; on conflict, request a
  hand-written backport from the author
- Opt-out: `Cc: <stable+noautosel@kernel.org>`

Direct mapping: `/migration` can adopt Conventional Commits (`fix:`,
`feat:`) as the lightweight trailer input and delegate classification
uncertainty to an LLM agent (reuse existing `deep-research-searcher` or
`contrarian-challenger` from D4 research).

### 5.5 Rails `app:update` with THOR_MERGE
UX precedent for interactive three-way merge during upgrades. For each
conflicting file, user gets Y/n/a/q/h/d/m prompt, where `m` launches a merge
tool (VS Code's three-pane view: upstream / yours / result). This is the UX
shape for D8's "nothing silent" constraint applied to diff-port conflicts.

### 5.6 Kustomize overlay regeneration
Different model, worth knowing for contrast. Kustomize keeps base + overlay
structurally separated; "regeneration" is re-rendering the overlay on a new
base, not a merge. For `/migration`, this would mean: JASON-OS's local
changes are stored as *patches/overlays* over the ported base, so re-port =
`base := new SoNash HEAD; re-apply overlay`. Cleaner than 3-way merge when it
works, but requires overlays to be commutable with upstream changes (often
they aren't in source code, unlike YAML). **Not recommended for v1**, but
noted as a v2+ architectural alternative if 3-way-merge conflict rates prove
intolerable.

### 5.7 rsync delta algorithm *(bonus, for detection only)*
Rolling checksum + strong checksum for block-level delta detection. Overkill
as a transformation engine but a useful conceptual model for *detection*:
"cheap first-pass signal, then expensive verification." Maps onto the layered
detection recommendation in §2.

---

## 6. v1 scope recommendation

Per D29 (v1 is local-filesystem only) and the "craft over shipping" discipline
(§3.4 of sync BRAINSTORM §3.4), v1 should be tight and extensible.

### v1 ships

- **Scenario A — Full re-port** — uses the same 7-phase arc as first-time
  port, with Phase 4 producing a 3-way merge plan (BASE = last-ported SHA,
  SOURCE = current source HEAD, DEST = current destination HEAD).
- **Per-unit state schema (§3)** — all 9 core fields from day one, so that
  v1.1+ diff-port can read v1-written ledgers without migration.
- **/sync boundary (§4)** — consume drift reports; do not duplicate.
- **Mode flag infrastructure** — `--mode=re-port` as the only accepted value
  in v1, but the flag plumbing exists so v1.1 adds `diff-port`, `fix-only`,
  `revert-port` without re-wiring.

### v1.1 adds

- **Scenario B — Diff-port** — sub-file unit granularity (commit-range /
  hunk-set). Requires the commit-range unit type to be added to D1.
- **Scenario D — Revert-port** — direction=out already exists from D16;
  v1.1 adds asymmetric-sanitize handling for non-reversible forward
  transforms.

### v1.2+ adds

- **Scenario C — Fix-only-pull** — deferred furthest because it compounds
  three hard problems: commit classification, prerequisite-chain analysis,
  and asymmetric-sanitize (if direction=out). Requires a dedicated classifier
  agent and commit-hygiene conventions adopted across both repos first.
- **Overlay-style regeneration** (Kustomize model from §5.6) as an
  architectural alternative if v1.1 conflict rates prove too high.

### Rationale for deferral order

- A before B: full re-port reuses the existing first-port phase arc almost
  verbatim; diff-port introduces a new unit granularity.
- B before D: direction=out without scope-narrowing is already covered by
  D16; adding diff-port in direction=in first validates the hunk-scoping
  machinery before inverting the sanitize transform.
- D before C: the asymmetric-sanitize problem is contained (per-unit
  reversal rules); fix-only-pull requires a classifier that depends on
  ecosystem commit hygiene that doesn't yet exist in either repo.

---

## Sources

- [How git cherry-pick and revert use 3-way merge — Julia Evans](https://jvns.ca/blog/2023/11/10/how-cherry-pick-and-revert-work/)
- [Git cherry-pick documentation](https://git-scm.com/docs/git-cherry-pick)
- [Cherry-picks vs backmerges — Runway](https://www.runway.team/blog/cherry-picks-vs-backmerges-whats-the-right-way-to-get-fixes-into-your-release-branch)
- [Understanding Git Cherry-Pick safely — Build with Matija](https://www.buildwithmatija.com/blog/git-cherry-pick-safely)
- [Linux stable-kernel-rules](https://docs.kernel.org/process/stable-kernel-rules.html)
- [Linux kernel backporting and conflict resolution](https://docs.kernel.org/process/backporting.html)
- [ANNOUNCE: AUTOSEL — Modern AI-powered Linux Kernel Stable Backport Classifier](https://lists.linaro.org/archives/list/linux-stable-mirror@lists.linaro.org/thread/EJWMRUH2JTI34CPWVZZG62XJ7HMIH5WT/)
- [Copybara — google/copybara GitHub](https://github.com/google/copybara)
- [Copybara reference docs (merge_import, diff3)](https://github.com/google/copybara/blob/master/docs/reference.md)
- [Moving code between Git repositories with Copybara — kubesimplify](https://blog.kubesimplify.com/moving-code-between-git-repositories-with-copybara)
- [Updating Rails with THOR_MERGE — dev.to](https://dev.to/rodreegez/updating-rails-applications-with-vimdiff-3a75)
- [VS Code as Rails app:update merge tool — davidrunger.com](https://davidrunger.com/blog/using-vs-code-as-a-rails-app-update-merge-tool)
- [Upgrading Ruby on Rails guide](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html)
- [Three-Way Merge — tonyg.github.io/revctrl](https://tonyg.github.io/revctrl.org/ThreeWayMerge.html)
- [Maintaining a fork of a repository — gruchalski.com](https://gruchalski.com/posts/2024-03-03-maintaining-a-fork-of-a-repository/)
- [Kustomize base and overlay inheritance patterns — oneuptime](https://oneuptime.com/blog/post/2026-02-09-kustomize-base-overlay-inheritance/view)
- [Declarative Management of Kubernetes Objects Using Kustomize — k8s docs](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Rsync — Wikipedia](https://en.wikipedia.org/wiki/Rsync)
- [Delta Transfer — RsyncProject/rsync DeepWiki](https://deepwiki.com/RsyncProject/rsync/2.2-delta-transfer)
- [The Rsync Algorithm — Tufts CS](https://www.cs.tufts.edu/~nr/rsync.html)
- Local: `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md` (§3 D9, D16, D17, D18, D23, D24, D28, D29; §5 Q9)
- Local: `C:\Users\jbell\.local\bin\JASON-OS\.research\sync-mechanism\BRAINSTORM.md` (§3.1–3.8 architecture; §3.3 symmetric self-propagating; §3.5 manual-with-prompting)
