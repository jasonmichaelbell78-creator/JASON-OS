# First-Pass SoNash Back-Fill — Decision Assessment

**Date:** 2026-04-22
**Purpose:** Decision aid for Thread B (sync-mechanism SoNash scope concern).
Evaluates which categories of SoNash-only material get frontmatter labels
during Session 2's first-pass back-fill, versus deferred to on-demand
labeling.
**Source material:** `.research/sync-mechanism/piece-1b-discovery-scan-sonash/`
(52 D-agents, HIGH confidence, direct filesystem observation of SoNash as of
2026-04-18). No new research dispatched — synthesized from existing findings.

---

## How to read this document

Each category has a standard structure:

- **What it is** — plain-language description
- **Concrete inventory** — specific file/skill/agent names and counts
- **JASON-OS presence** — what JASON-OS already has for this category
- **Labeling load** — how many items need labels if this is in first pass
  (file counts only; no time estimates — those are historically unreliable)
- **Deferral consequence** — what happens if this is labeled on-demand
  instead of first-pass
- **Dependencies** — what this category needs or blocks
- **Recommended verdict** — first-pass or defer, with rationale

Verdicts:
- **FIRST PASS** — label now in Session 2
- **DEFER** — label on-demand when a specific file needs to flow
- **NEVER-SYNC** — explicit never-sync label in first pass (safety guard)
- **BASELINE** — automatic inclusion (JASON-OS counterpart exists)

---

## 1. The baseline (automatic inclusion, not a menu question)

Every SoNash file that has a JASON-OS counterpart gets labeled in the first
pass. Per-file frontmatter labels are per-copy, so JASON-OS's Piece 3 pass
does not automatically label SoNash's copies — each copy needs its own labels.

From verification of JASON-OS current state and Piece 1b's SoNash inventory,
the baseline covers roughly these categories (specific counts from Piece 1a
and the port-status matrix in Piece 1b):

| Category | JASON-OS count | SoNash counterpart count | Baseline labeling load |
|---|---|---|---|
| Skills | 14 in JASON-OS | Same 14 exist in SoNash at equivalent paths | ~14 SoNash skill SKILL.md files |
| Agents (pipeline) | 8 `/deep-research` pipeline agents | Equivalents exist in SoNash | ~8 agent files |
| Foundation layer | `safe-fs.js`, `sanitize-error.cjs`, `security-helpers.js`, `symlink-guard.js` | Same 4 at equivalent paths | ~4 files |
| Scripts (in both) | `todos-cli.js`, `render-todos.js`, `session-end-commit.js`, `parse-jsonl-line.js`, `read-jsonl.js`, `resolve-exec.js`, `todos-mutations.js` | Same scripts exist | ~7 files |
| Hooks (in both) | block-push-to-main, commit-tracker, compact-restore, label-\*, settings-guardian, pre-compaction-save, large-file-gate, check-mcp-servers, run-node.sh | Same (plus SoNash-only extras) | ~11 hook files |
| Husky | `_shared.sh`, `pre-commit`, `pre-push` | Same + extras | ~3 files |
| Canonical memory (JASON-OS ~12 files) | Exists | ~22 files in SoNash canonical memory, ~18 already aligned per research | ~12 counterparts |
| Root docs | CLAUDE.md, SESSION_CONTEXT.md | Same + extras | ~2 files |

**Approximate baseline labeling load: ~60-75 files** (counterparts of
JASON-OS material that also exist in SoNash). This labor is not avoidable
— without it, /sync cannot reason about both sides of the shared universe.

The Menu A decisions below determine what ADDITIONAL material goes into the
first pass beyond this baseline.

---

## 2. Menu A — What gets labeled beyond counterparts?

### A1. Explicitly never-sync items

**What it is.** SoNash files that must never flow to JASON-OS under any
circumstance. Labeling them now with `scope: never-sync` creates explicit
safety guards that prevent accidental sync.

**Concrete inventory (per Piece 1b D17b, D18, D12, D24):**

*Security-flagged gitignored files (CRITICAL never-sync):*
- `firebase-service-account.json` — live RSA private key (CRITICAL severity)
- `.env.local` — live GitHub PAT + SonarCloud token + Context7 API key
- `.env.production` — live Firebase API key (NEXT_PUBLIC_)
- `config.local.toml` — OpenWeatherMap API key

*Deprecated agent stubs (DELETE, don't port):*
- `deployment-engineer`
- `devops-troubleshooter`
- `error-detective`
- `markdown-syntax-formatter`
- `penetration-tester`
- `prompt-engineer`
- `react-performance-optimization`
- `security-engineer`

*Deprecated skill stubs:*
- `website-synthesis` (superseded by `synthesize`)
- `repo-synthesis` (superseded by `synthesize`)

*Archived scripts (9 in `scripts/archive/`, README is stale, 2 have broken paths):*
- Specific files documented in D12-scripts-archive-tests.md

*Deprecated pre-`.claude/skills/` era directories:*
- `.agent/`
- `.agents/`

*Firebase subproject:*
- `functions/` — full Firebase Cloud Functions subproject (own package.json, tsconfig, .gitignore)

**JASON-OS presence.** None of these exist in JASON-OS. That's precisely
why the labels are needed — to ensure they never arrive.

**Labeling load.** Small discrete set of individual files + a handful of
directory-level labels. Total: 4 security files + 8 agent stubs + 2 skill
stubs + 9 archived scripts + 2 deprecated dirs + 1 subproject = **~26
label entries**, most of which are single-line `scope: never-sync`.

**Deferral consequence.** Without explicit never-sync labels, /sync has to
rely on scope-detection heuristics to avoid syncing these. That's possible
but riskier. One heuristic miss on `firebase-service-account.json` and a
production private key crosses repo boundaries.

**Dependencies.** None blocking — these are leaf items.

**Recommended verdict.** **FIRST PASS (NEVER-SYNC labels).** Load is
small; safety payoff is high; the labels are near-trivial to author. This
is the clearest first-pass win in the whole menu.

---

### A2. Product code directories

**What it is.** SoNash's Next.js/Firebase product code — app routes, React
components, product libraries, styles, etc. Entirely separate from Claude
Code infrastructure.

**Concrete inventory (per Piece 1b D19a, D19b):**

9 top-level directories in SoNash:
- `app/` — Next.js App Router pages
- `components/` — React components
- `lib/` — product libraries
- `src/` — DataConnect-generated SDK (auto-generated, not hand-authored)
- `styles/` — CSS/Tailwind
- `public/` — static assets
- `types/` — TypeScript type definitions
- `data/` — data files (some possibly gitignored)
- `dataconnect/` — Firebase Data Connect schemas

D19b census verdict: zero Claude Code artifacts in any of these 9 directories.

**JASON-OS presence.** None. JASON-OS has no product code — it's an OS
repo, not an application.

**Labeling load.** The cheapest approach is directory-level never-sync
labels: one entry per directory = **9 labels**. Per-file labeling would be
thousands of files (not recommended).

**Deferral consequence.** Same as A1 — /sync relies on scope heuristics
without explicit labels. Higher risk of accidental traversal into product
code during sync operations.

**Dependencies.** None.

**Recommended verdict.** **FIRST PASS (NEVER-SYNC, directory-level).**
Nine labels; covers a massive surface cheaply; removes ambiguity about
whether product code is ever in scope.

---

### A3. GSD global agents

**What it is.** The `get-shit-done-cc` npm package — 11 Sonnet-backed
agents that form a complementary workflow system (new-project / plan-phase /
execute-phase / verify-phase / debug / codebase-map). Zero SoNash coupling.

**Concrete inventory (per Piece 1b D21d, direct npm package inspection):**

| Agent | Size | Purpose |
|---|---|---|
| gsd-project-researcher | 24 KB | New-project: domain ecosystem research (spawned 4x parallel) |
| gsd-research-synthesizer | 7 KB | New-project: synthesizes 4 researchers into SUMMARY.md |
| gsd-roadmapper | 17 KB | New-project: transforms requirements into phase roadmap |
| gsd-phase-researcher | 20 KB | Plan-phase: researches how to implement a specific phase |
| gsd-planner | 45 KB | Plan-phase: creates executable PLAN.md files (largest agent) |
| gsd-plan-checker | 21 KB | Plan-phase: 6-dimension goal-backward verification |
| gsd-executor | 21 KB | Execute-phase: atomic commits, deviation rules, TDD |
| gsd-verifier | 23 KB | Verify-phase: goal-backward codebase verification |
| gsd-integration-checker | 13 KB | Verify-phase: cross-phase wiring and E2E flow |
| gsd-debugger | 38 KB | Debug: scientific-method debugging with persistent state |
| gsd-codebase-mapper | 16 KB | Map-codebase: 4-focus-area codebase analysis |

SoNash has v1.22.4 installed; v1.37.1 is latest (14 versions behind).
A 12th agent (`gsd-nyquist-auditor`) exists in the plugin but is not
installed in SoNash's project mirror.

**JASON-OS presence.** None. `.claude/agents/global/` directory does not
exist in JASON-OS.

**Labeling load.** 11 agent files to label. Labels would mark these as
`portability: portable-via-npm` and `scope: universal` since they're
npm-distributed and repo-agnostic.

**Deferral consequence.** GSD agents remain unlabeled in SoNash; on-demand
pull when JASON-OS wants one works fine. But since GSD is npm-installable
directly (not really "syncing" in the sync-mechanism sense), installing
JASON-OS's own GSD via `npm install get-shit-done-cc` might be the real
path rather than syncing SoNash's copy.

**Dependencies.** None on SoNash side. On JASON-OS side, installing GSD
would mean adding it to package.json.

**Recommended verdict.** **FIRST PASS, but with caveat** — label the 11
agents on SoNash side so /sync has a complete picture, AND separately
install GSD in JASON-OS via npm (not via /sync). The labels are small
effort; the install is a separate action not part of back-fill.

---

### A4. Hook-warning trio

**What it is.** A coherent three-hook warning-lifecycle system in SoNash
that tracks hook warnings across commits with append/resolve/sync-ack
semantics. Research flagged this as atomic — partial port leaves hooks in
inconsistent state.

**Concrete inventory (per Piece 1b D21b composite listing):**

- `append-hook-warning.js` — appends warnings to state file
- `resolve-hook-warnings.js` — marks warnings as resolved post-commit
- `sync-warnings-ack.js` — syncs warning acknowledgment across processes

The three together form a warning-lifecycle composite per D21b.

**JASON-OS presence.** None of the three exist in JASON-OS (verified
earlier in this session).

**Labeling load.** 3 files; atomic-group label (all three linked as a
composite for /sync purposes).

**Deferral consequence.** The trio remains unlabeled. On-demand pull of
one would have to recognize the atomic-group requirement and label all
three together anyway — deferring doesn't really help for this one.

**Dependencies.** The three depend on each other (composite). Labels must
mark them as a group so /sync treats them atomically.

**Recommended verdict.** **FIRST PASS.** Small (3 files), atomic
(deferral-resistant), and load-bearing (hook warning discipline is part of
the OS's behavioral guardrail system). Strong include.

---

### A5. SoNash-only portable skills

**What it is.** The skills in SoNash's portable subset that JASON-OS
doesn't have yet. Largest single first-pass-candidate category.

**Concrete inventory (per Piece 1b D1a–D1f + BRAINSTORM.md D14b):**

SoNash has ~47 skills marked portable. JASON-OS has 14 skills. The gap is
roughly **33 additional portable skills**.

Wave 1 discovery (D1a-D1f) broke skills into tiers by size. Tier 1 (the
mega-skills, 1.4 MB total — the 5 ecosystem-audit skills) illustrates the
upper bound:

| Skill | Size | Status |
|---|---|---|
| hook-ecosystem-audit | 359 KB | sanitize-then-portable |
| tdms-ecosystem-audit | 273 KB | not-portable (SoNash-only, depends on TDMS) |
| pr-ecosystem-audit | 272 KB | sanitize-then-portable |
| session-ecosystem-audit | 253 KB | sanitize-then-portable |
| script-ecosystem-audit | 239 KB | sanitize-then-portable |

Smaller tier skills (per D1b-D1f) include various portable skills whose
specific names are enumerated in the D-finding files. Concrete complete
list requires reading D1a through D1f for exhaustive naming.

The remaining ~33 portable SoNash skills not in JASON-OS span research,
audit, code review, and workflow families.

**JASON-OS presence.** JASON-OS has 14 skills; the 33 portable gap is all
novel-to-JASON-OS material.

**Labeling load.** 33 skill directories, each with SKILL.md plus companion
files (REFERENCE.md, scripts, etc.). Average skill is ~10-30 KB across
multiple files. Labeling each skill's SKILL.md frontmatter is one entry
per skill, but if companions need labels too the count grows. Conservative
labeling load: **33 SKILL.md entries** plus per-companion labels where
needed (could approach ~100+ file labels).

**Deferral consequence.** The 33 skills stay in SoNash unlabeled until
JASON-OS wants to pull one. Per Path 2 design, labeling happens inline at
pull time. Each pull adds ~5-15 minutes of interactive labeling work —
acceptable for pulls that happen occasionally, painful if you want to pull
many at once.

**Dependencies.** Some skills have cross-skill dependencies (composites)
that'd force labeling related skills in the same pass. A pulled skill
with 3 depend-on skills = labeling 4 things at once.

**Recommended verdict.** **DEFER.** This is the whole point of Path 2 —
avoid front-loading 33 skills of labeling work into Session 2. The
on-demand cost per pull is bounded and acceptable; the first-pass cost of
including all 33 is the biggest single item in the menu.

Counter-argument: if you expect to pull 10+ of the 33 in the first month
post-Session 2, front-loading might save net time. But predicting that is
hard, and the Path 2 premise is you DON'T know which you'll want.

---

### A6. SoNash-only non-portable skills

**What it is.** SoNash skills beyond the 47 portable that are
product-coupled or otherwise not portable to JASON-OS. Still need
scope-only labels (`scope: sonash-only`, `portability: not-portable`) to
prevent accidental sync attempts.

**Concrete inventory (per Piece 1b):** SoNash has roughly 80 skills total
(exact count varies by counting method — D24 deprecation data says 80).
Subtracting 47 portable + 14 JASON-OS has = **~19 SoNash-only non-portable
skills**.

Examples known from research:
- `tdms-ecosystem-audit` (depends on TDMS pipeline SoNash has)
- Skills tied to Firebase/Next.js product layer
- Skills depending on `sonash-context` agent injection pattern

**JASON-OS presence.** None.

**Labeling load.** ~19 SKILL.md entries; all labeled identically as
`scope: sonash-only, portability: not-portable`. Near-trivial because the
label decision is the same for all.

**Deferral consequence.** These skills never flow anyway. Deferring means
/sync heuristics have to guess they're sonash-only — possible but not
airtight.

**Dependencies.** None blocking.

**Recommended verdict.** **DEFER** by default, but reconsider if /sync's
scope heuristics turn out unreliable during testing. If heuristics are
solid, these never need labels. If not, promote to first pass. This is a
"decide after /sync Piece 5 has concrete heuristics" call.

---

### A7. SoNash-only scripts

**What it is.** Scripts in SoNash's `scripts/` tree that have no JASON-OS
counterpart. Covers 312 total SoNash scripts (per D12 census) minus the
~7-10 that also exist in JASON-OS.

**Concrete inventory (per Piece 1b D6a-d, D7, D8a-b, D9, D10a-b, D11a-b, D12):**

Piece 1b broke this into sub-categories:
- `scripts/` root (D6a-d) — root-level scripts
- `scripts/lib/` (D7) — shared library scripts beyond foundation
- `scripts/health/` (D8a-b) — health-check + health-lib + tests
- `scripts/debt/` + TDMS (D9) — 28-script TDMS pipeline (all-or-nothing; not-portable in JASON-OS for now per add-debt v0 stub)
- `scripts/reviews/` (D10a-b) — PR review scripts + tests + dist (includes `write-invocation.ts` — SoNash-only)
- `scripts/planning/` + clusters (D11a-b) — planning scripts (JASON-OS has `todos-cli.js`, `render-todos.js`)
- `scripts/archive/` (D12) — 9 archived scripts (all not-portable — covered under A1)
- 6 uncovered subdirs (audit/, cas/, config/, docs/, metrics/, multi-ai/) = 46 files not covered in Wave 1

Total: ~**290-300 SoNash-only scripts** beyond counterparts and archive.

**JASON-OS presence.** JASON-OS has scripts/lib/, scripts/config/,
scripts/planning/, and scripts/session-end-commit.js (baseline).
Everything else is SoNash-only.

**Labeling load.** 290-300 individual script label entries. Biggest single
numerical category in the menu.

**Deferral consequence.** Scripts that don't flow don't need labels. Most
scripts won't flow — they're SoNash-specific infrastructure (TDMS, CAS,
review tooling, Firebase hooks). On-demand labeling when a specific
script gets pulled is fine.

**Dependencies.** Some scripts are tightly coupled (TDMS = 28 scripts
operating on MASTER_DEBT.jsonl; CAS = 12 components + SQLite). If one
gets pulled, the whole family needs labeling.

**Recommended verdict.** **DEFER.** 290-300 labels is enormous relative
to the value — most of these scripts will never leave SoNash. On-demand
labeling handles the subset that actually flows.

---

### A8. SoNash-only hooks beyond counterparts and A4

**What it is.** SoNash hooks that aren't in JASON-OS and aren't the
hook-warning trio. Things like SoNash's SessionStart gsd-check-update,
context monitor, statusline hooks beyond what JASON-OS has.

**Concrete inventory (per Piece 1b D3a, D3b, D21d, D17b):**
- GSD-branded statusline hook (part of GSD cluster — labeled with A3)
- `statusline.js` in SoNash `.claude/hooks/global/`
- Context monitor hook (35%/25% remaining warnings)
- `.husky/` extras (Wave 3 timing, post-commit warning resolver, pre-push escalation gate — referenced in research but not individually enumerated)
- `gsd-prompt-guard.js` (DEAD REFERENCE — file doesn't exist, but settings.json references it; would be labeled never-sync to document the gap)

Total: **~5-8 SoNash-only hook entries** (plus GSD overlap, counted in A3).

**JASON-OS presence.** None of these specific hooks exist in JASON-OS.
JASON-OS's husky extras are a subset of SoNash's.

**Labeling load.** ~5-8 hook entries.

**Deferral consequence.** Hooks that don't flow don't need labels. But
hooks are load-bearing infrastructure — a hook that should have flowed and
didn't can cause behavioral drift between repos. Labels make that
visibility.

**Dependencies.** Some hooks depend on hook-libs; labels should reflect
that.

**Recommended verdict.** **DEFER** with one exception — if the husky
extras turn out to fix observable gaps in JASON-OS's husky (currently only
SKIP_CHECKS and HOOK_OUTPUT_LOG implemented per verification), labeling
them for near-term pull might be worthwhile. Baseline decision: defer;
revisit if a concrete gap surfaces.

---

### A9. SoNash-unique canonical memories

**What it is.** Canonical memory files in SoNash's `.claude/canonical-memory/`
that don't have JASON-OS counterparts. Universally applicable but
not yet promoted to JASON-OS's canonical-memory.

**Concrete inventory (per Piece 1b D5, D23):** SoNash has 22+ canonical
memory files. JASON-OS has ~12. Gap = **~10 additional canonical files**,
minus the 3 operationally-wrong ones that must NOT be synced as-is:
- `user_expertise_profile` (says "Node.js expert" — wrong)
- `feedback_stale_reviews_dist` (references removed command)
- `project_agent_env_analysis` (shows done work as in-progress)

Net additional portable canonical: **~7 files**.

**JASON-OS presence.** JASON-OS has ~12 canonical memory files already
(baseline).

**Labeling load.** ~7 files + 3 corrected-copies of the operationally-wrong
ones = ~10 label entries.

**Deferral consequence.** Canonical memories that don't get labeled stay
in SoNash and don't flow. On-demand labeling when JASON-OS wants one is
fine. But the 3 wrong ones need correction regardless — labeling them is
the moment to also mark them for correction.

**Dependencies.** The 3 wrong ones have cross-memory references that'd
ripple during correction.

**Recommended verdict.** **FIRST PASS for the 3 wrong ones** (they need
explicit correction-required labels); **DEFER for the ~7 universally
portable ones** (on-demand is fine).

---

### A10. User-home memories in SoNash

**What it is.** Memory files in SoNash's user-home memory dir (outside
the repo, under `~/.claude/projects/<sonash-slug>/memory/`). Per Piece 1a,
similar structure to JASON-OS's user-home memory dir.

**Concrete inventory (per Piece 1a):** SoNash user-home has an unknown
count; Piece 1a found JASON-OS has 62 user-home memories and 12 canonical
with a gap of 50 promotable memories. SoNash likely has 80+ user-home
memories (based on Piece 1b's broader surface).

**JASON-OS presence.** JASON-OS has its own user-home memories (62 per
Piece 1a).

**Labeling load.** 80+ entries if all get labels. Biggest memory category.

**Deferral consequence.** User-home memories are mostly personal /
session-context and rarely flow between repos. Deferring is easy.

**Dependencies.** Some memories reference each other (D23 memory graph).

**Recommended verdict.** **DEFER.** User-home memories are the clearest
defer candidate in the entire menu — they rarely flow and the labeling
load is large.

---

### A11. Planning artifacts

**What it is.** `.planning/` directory contents in SoNash — plan
documents, decision registries, todo backlogs, bookmark notes, port
analyses.

**Concrete inventory (per Piece 1b D15a, D15b):**
- `.planning/CL-PROTOCOL.md` (316 lines v1.1 — most portable artifact per research)
- JSONL decision architecture (SWS: 598 KB total):
  - `decisions.jsonl` (93 records)
  - `directives.jsonl` (40 records)
  - `tenets.jsonl` (19 records)
  - `ideas.jsonl` (42 records)
- `.planning/todos.jsonl` (49 records, 25 active / 24 completed) — counterpart-ish to JASON-OS's own
- Bookmark + port-analysis files
- Per-session planning programs

Total: ~**5-10 distinct planning artifacts**, but the JSONL files contain
hundreds of records that could be individually labelable.

**JASON-OS presence.** JASON-OS has `.planning/todos.jsonl` (35 records as
of this session). No canonical decisions/directives/tenets/ideas JSONLs
yet.

**Labeling load.** At the file level: ~5-10 labels. At the record level
(if each JSONL row gets labeled): hundreds.

**Deferral consequence.** Planning artifacts are mostly historical and
rarely flow between repos. The CL-PROTOCOL.md is the one exception —
it's a portable methodology doc.

**Dependencies.** JSONL records reference each other.

**Recommended verdict.** **FIRST PASS for CL-PROTOCOL.md** (single file,
high value). **DEFER the rest** — JSONL registries are a pattern that
could be rebuilt from scratch in JASON-OS rather than ported, and record-
level labeling is disproportionate.

---

### A12. Research artifacts

**What it is.** `.research/` directory contents — 11 indexed research
sessions, 9 un-indexed, 18 archived sessions.

**Concrete inventory (per Piece 1b D14a, D14b, D14c):**
- `.research/research-index.jsonl` (11 sessions, 2 incompatible schema variants, various drift issues)
- 11 indexed session directories (7 of 11 have reusable methodology)
- 9 un-indexed current sessions (including `.research/jason-os/` which is the origin document for JASON-OS itself)
- 18 archived sessions (28% have non-standard structure)

Total: ~**38 session directories plus the index file**.

**JASON-OS presence.** JASON-OS has its own `.research/` with 4 research
sessions. Migration-skill and sync-mechanism and a couple others.

**Labeling load.** 38 session dirs at directory-level = 38 labels.
Per-file would be hundreds.

**Deferral consequence.** Research artifacts are nearly always historical
reference, not active sync material. Deferring costs almost nothing.

**Dependencies.** `research-index.jsonl` has schema issues per research
— would need correction before use.

**Recommended verdict.** **DEFER.** Research archives rarely flow
between repos; the effort-to-value ratio is poor for first pass.

---

### A13. Root-level configs

**What it is.** Files at SoNash's repo root — config files, settings,
documentation, etc.

**Concrete inventory (per Piece 1b D17a, D17b):**
Selected load-bearing ones:
- `CLAUDE.md` (counterpart in JASON-OS — already in baseline)
- `SESSION_CONTEXT.md` (counterpart — baseline)
- `package.json` (counterpart — baseline)
- `.claude/settings.json` (counterpart — baseline)
- `.husky/_shared.sh` (counterpart — baseline)
- `sonar-project.properties` (SoNash-only; has the two-variant data-integrity bug T32 is tracking)
- `.github/workflows/*.yml` (17 workflows per D16: 15 applicable, 6 product-specific, 6 security-gate workflows already ported)
- `codecov.yml`, `knip.json`, `framer-motion.d.ts`, `eslint.config.mjs`, `firebase.json`, `firestore.indexes.json`, `firestore.rules`, `geocoding_cache.json`, `components.json` (all SoNash-product-specific)
- `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `DEVELOPMENT.md`, `AI_WORKFLOW.md`, `ARCHITECTURE.md`, `DOCUMENTATION_INDEX.md` (docs)
- `LICENSE` vs `README.md` contradiction (LICENSE = Apache 2.0, README = "Proprietary")

Total: ~**30-40 root-level files** not in baseline, most SoNash-only.

**JASON-OS presence.** JASON-OS has its own root-level configs + docs
(baseline). No Firebase configs, no product-specific files.

**Labeling load.** ~30-40 label entries if all first-pass. But the
majority are clearly SoNash-only (Firebase, framer-motion, etc.) and
could get a bulk `scope: sonash-only` label.

**Deferral consequence.** Root configs rarely flow individually. The
workflow files (`.github/workflows/`) are an exception — 9 are
JASON-OS-applicable per D16 and could flow at some point.

**Dependencies.** Some configs cross-reference each other (e.g.,
`sonar-project.properties` + `.qodo/` + `.pr_agent.toml`).

**Recommended verdict.** **FIRST PASS selectively** — label the 9
JASON-OS-applicable workflow files and the 3 existing security-gate
workflow counterparts. **DEFER the rest** (Firebase + product docs rarely
flow; bulk-label as sonash-only when they do come up, if ever).

---

## 3. Menu B — Explicitly-labeled never-sync

As noted in A1, the never-sync list collapses into A1's recommendation.
If you pick A1 FIRST PASS, Menu B is covered.

## 4. Menu C — On-demand labeling mechanism

When someone wants to pull a SoNash file that isn't in the first-pass set,
/sync needs a way to label it inline. Four shapes:

- **C1** — Pull-triggered only. Operator runs `/sync pull <path>`;
  labeling happens inline. No list mode.
- **C2** — Propose-list mode. `/sync` shows unlabeled files grouped by
  category; operator picks a batch.
- **C3** — Scheduled small batch. Periodic 5-10-file labeling sessions.
- **C4** — Hybrid C1 + C2. Both modes available in /sync.

**Recommendation: C4.** C1 alone is frustrating for related-file batches;
C2 alone requires entering list mode for quick one-offs; C3 reintroduces
scheduled back-fill (defeats Path 2's purpose). C4 keeps both modes
accessible; operator picks per situation.

## 5. Menu D — Back-port direction in first pass

Piece 1b identified 3 items flowing JASON-OS → SoNash (only version
inversions in the entire scan):
- `session-begin` (JASON-OS v2.1 > SoNash v2.0)
- `session-end-commit.js` (JASON-OS canonically better)
- `/deep-research` T23 Windows 0-byte safety net

- **D1** — First pass SoNash → JASON-OS only. 3 back-ports deferred.
- **D2** — First pass includes the 3 named back-ports, nothing else reverse.
- **D3** — Fully bidirectional first pass.

**Recommendation: D2.** Known wins should fill now; adding reverse-direction
back-fill for unrelated files doubles scope without clear reason.

## 6. Menu E — When does first pass happen?

- **E1** — After Piece 5 (sync engine built, tested on JASON-OS alone).
- **E2** — Piece 5.5 (bootstrap) and first-pass back-fill happen together.
- **E3** — After structural-fix Phase G finishes (current primary work)
  AND sync engine is built.
- **E4** — Decision deferred to Piece 5 /deep-plan.

**Recommendation: E3 if you want a decision locked now; E4 if you prefer
letting Piece 5 /deep-plan shape sequencing based on what the engine
actually looks like.**

---

## 7. Summary — first-pass scope under recommended picks

| Category | Verdict | Labeling load |
|---|---|---|
| Baseline (JASON-OS counterparts) | BASELINE (automatic) | ~60-75 files |
| A1 Never-sync items | FIRST PASS | ~26 labels |
| A2 Product code directories | FIRST PASS (dir-level) | 9 labels |
| A3 GSD global agents | FIRST PASS + npm install | 11 labels + install |
| A4 Hook-warning trio | FIRST PASS (atomic group) | 3 labels |
| A5 SoNash-only portable skills | DEFER | 0 labels up front (~33 on-demand) |
| A6 SoNash-only non-portable skills | DEFER | 0 labels up front (~19 on-demand) |
| A7 SoNash-only scripts | DEFER | 0 labels up front (~300 on-demand) |
| A8 SoNash-only hooks beyond A4 | DEFER | 0 labels up front (~5-8 on-demand) |
| A9 SoNash-unique canonical memories | MIXED (3 wrong: FP; 7 right: DEFER) | 3 labels up front |
| A10 User-home memories | DEFER | 0 labels up front (~80+ on-demand) |
| A11 Planning artifacts | MIXED (CL-PROTOCOL: FP; rest: DEFER) | 1 label up front |
| A12 Research artifacts | DEFER | 0 labels up front (~38 on-demand) |
| A13 Root-level configs | MIXED (9 workflows: FP; rest: DEFER) | 9 labels up front |
| D1/D2/D3 back-ports | D2 (3 named) | 3 labels |
| **Total first-pass labeling load under recommendations** | | **~125-140 label entries** |

Baseline (counterparts) is automatic and adds ~60-75. Beyond baseline, the
recommended picks add ~65 more entries. Total first-pass: roughly
**125-140 files** getting labels in Session 2.

For comparison, JASON-OS Piece 3 is currently labeling 459 files. Under
these recommendations, Session 2's first-pass SoNash back-fill is about
**30% of the JASON-OS-side effort** — meaningfully smaller than a full
SoNash inventory would be.

On-demand labeling absorbs the remaining ~470-480 SoNash items that would
need labels eventually if everything flowed — but most of those things
will never flow, so the on-demand cost is bounded in practice.

---

## 8. Decision log

*To be filled in as picks are made:*

| Menu | Decision | Rationale |
|---|---|---|
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |
| A9 | | |
| A10 | | |
| A11 | | |
| A12 | | |
| A13 | | |
| B | | |
| C | | |
| D | | |
| E | | |

---

## 9. Pertinent caveats

**The 3 wrong canonical memories (A9).** `user_expertise_profile`,
`feedback_stale_reviews_dist`, `project_agent_env_analysis` must NOT sync
to JASON-OS as-is. Whatever you pick for A9, the corrections for these 3
are mandatory before any sync involves them.

**Firebase service account (A1).** `firebase-service-account.json`
contains a live RSA private key. Per research, the file is gitignored but
git history hasn't been verified for accidental commit. Before any sync
mechanism runs against SoNash root, confirm the key was never committed.

**SonarCloud two-variant bug (A13).** `sonar-project.properties` has two
SonarCloud project-key variants in SoNash's config files — a pre-existing
data-integrity bug documented at `.research/archive/github-health/findings/D15-sonarcloud-integration.md`.
T32 in JASON-OS todos tracks this. Any sync involving this config needs
the bug resolved on the SoNash side first.

**GSD v1.22.4 vs v1.37.1.** SoNash's installed GSD is 14 versions behind
the latest. Picking A3 FIRST PASS means deciding whether JASON-OS
installs v1.37.1 (current latest) or pins to v1.22.4 (what SoNash has) —
open question per Piece 1b unresolved list.

**LICENSE/README contradiction (A13).** SoNash's LICENSE says Apache 2.0;
README says "Proprietary." Doesn't affect JASON-OS directly but would
surface during any doc sync.

**Schema corrections (separate from this decision).** Piece 1b identified
5 schema corrections that must apply before Piece 2 begins regardless of
Path 2 scope picks. Not in this menu — listed in RESEARCH_OUTPUT.md.

**Time estimates are deliberately absent from this assessment.** Per
JASON-OS tenet `tenet_time_estimates_unreliable`, the research's hour/day
numbers are historically wrong. Load is quantified via file counts only,
which are verified.

---

## 10. References

All findings per `.research/sync-mechanism/piece-1b-discovery-scan-sonash/`:
- `RESEARCH_OUTPUT.md` — synthesis + port status matrix + recommendations
- `findings/D1a-D1f*` — skill inventory by tier
- `findings/D2a-D2b*` — agent inventory
- `findings/D3a-D3b*` — hook inventory
- `findings/D4a-D4d*` — user-home memory inventory
- `findings/D5*` — canonical memory gap analysis
- `findings/D6a-D6d*`, `D7*`, `D8a-D8b*`, `D9*`, `D10a-D10b*`, `D11a-D11b*`, `D12*` — script inventory by subsystem
- `findings/D13*` — tools
- `findings/D14a-D14c*` — research artifacts (indexed, unindexed, archive)
- `findings/D15a-D15b*` — planning artifacts
- `findings/D16*` — CI/security
- `findings/D17a-D17b*` — root docs/configs/dotdirs
- `findings/D18*` — SoNash-specific dotdirs
- `findings/D19a-D19b*` — product dirs
- `findings/D20a-D20d*` — dependency maps
- `findings/D21a-D21d*` — composites + GSD cluster
- `findings/D22a-D22b*` — schema fields
- `findings/D23*` — memory graph
- `findings/D24*` — redundancy clusters
- `SCHEMA_SPEC.md` — current classification spec (with 5 known corrections)
