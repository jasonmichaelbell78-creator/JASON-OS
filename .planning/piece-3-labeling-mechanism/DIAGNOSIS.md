# DIAGNOSIS — piece-3-labeling-mechanism

**Date:** 2026-04-19 (Session #9)
**Topic:** How schema-conforming labels get attached to files and kept valid
**Branch:** `piece-3-labeling-mechanism` (stacked on `piece-2-schema-design`)
**Preceding:** `.planning/piece-2-schema-design/{DECISIONS,PLAN,DIAGNOSIS}.md`;
  `.research/sync-mechanism/BRAINSTORM.md`; Piece 1a/1b RESEARCH_OUTPUT.md
**Status:** DRAFT v2 — rewritten to remove pre-recommended defaults and
  surface user-stated hard constraint. Awaiting Phase 0 sign-off.

---

## 1. What this piece decides

Piece 3 designs the **mechanism** for getting schema-conforming records into
the registry (and keeping them valid). Piece 2 produced the contract; Piece 3
produces the machinery that fills it.

Specifically, Piece 3 decides:

1. **Attachment strategy** — in-file frontmatter, external catalog-only, or
   hybrid (which fields live where)
2. **Who creates records** — scan agent, write-hook, or combination
3. **Section detection** — how mixed-scope `sections[]` get identified and
   maintained (per D17–D19)
4. **First-pass (back-fill) workflow** — how existing files get labeled
5. **New-file workflow** — how files born after the mechanism exists get
   labeled
6. **Update workflow** — when a file changes, what re-validates its record
7. **Validation enforcement** — where `ajv` + `schema-v1.json` run
8. **Storage-boundary decision** — Piece 3 must answer "external catalog file?"
   yes/no; Piece 4 decides format/path of that catalog if yes

**What Piece 3 does NOT decide (deferred to Piece 4):** catalog file format
(JSONL vs TOML vs hybrid), paths, query/indexing, derived caches.

Piece 4's decisions are downstream of Piece 3's attachment decision.

---

## 2. ROADMAP alignment

JASON-OS has no ROADMAP.md (bootstrap v0.1). Alignment check is against
`project_jason_os` memory and `BRAINSTORM.md §5`:

> | 3 | Labeling mechanism design | `/deep-plan` | Format spec per file type
>   + hook behavior |

**Verdict:** ALIGNED. Piece 3 is the canonical next step after Piece 2.
Piece 3.5 (provisional back-fill step) may reduce or change shape based on
decisions here.

**Possible reframe for user to accept/reject in Phase 0 signoff:** the
surface of Piece 3 reads as "pick a YAML format," but the load-bearing
decision is **where the source of truth lives** (in-file vs external). That
choice drives validation venue, back-fill shape, update detection, and
Piece 4's handoff contract. Flagging this so the framing is explicit — not
committing to it as THE reframe without your agreement.

---

## 3. User-stated hard constraint (surfaced Session #9)

> **"Day to day there can be NO MANUAL STEPS to keep up with changes.
> Running an occasional skill for checks is fine though."**

### 3.1 What this rules OUT

| Option ruled out | Axis | Why ruled out |
|---|---|---|
| A2 — In-file only | Source of truth | Every file edit requires author to update N fields manually |
| B3 — Author manual | Who creates | Definitional manual step |
| Any "author provides minimum" on new-file creation | Who creates | Author typing fields daily is manual |
| D1 — Author declares sections | Section detection | Manual step on every mixed-scope file |
| Any "author confirms heuristic" on every write | Section detection | Manual step per write |

### 3.2 What this permits

| Behavior class | Example | User's acceptance |
|---|---|---|
| Fully automatic (hook, fires on write, zero prompts) | Pre-commit validator | ✅ Not a manual step |
| On-demand skill invocation | `/label-scan` | ✅ "Occasional skill for checks is fine" |
| Hook auto-derives without prompting | Label written by hook from content scan | ✅ Auto-derive allowed; prompting is manual |
| Agent-driven bulk back-fill | One-time `/label-backfill` run | ✅ One-time is fine |

### 3.3 Implication for decision shape

Axes A, B, C, D (see §5) were originally enumerated with 4 options each. The
hard constraint collapses several. What remains is a narrower (but still
genuinely debatable) shape — see §5 for the revised axis tables.

---

## 4. Prior research inputs

### 4.1 Piece 1a/1b discovery scan facts

| Fact | Signal for Piece 3 |
|---|---|
| JASON-OS: ~187 units | Surface size; every unit needs a record |
| SoNash: 81 skills alone, 20× byte spread | Total surface estimate ~500–800 files |
| **Frontmatter already carried:** skills, agents, memories (YAML) | ~30% of files have SOME metadata today |
| **No frontmatter today:** hooks, scripts, tools, configs, CI, research, planning | ~70% of file types can't carry YAML without disruption |
| Team files use HTML-comment metadata, not YAML | Parser must handle both formats |
| 3 generations of memory-file frontmatter observed | Schema drift already happens without enforcement |
| `pr-review` uses markdown-body `**Lineage:**` lines (not YAML) | Existing lineage convention is prose-heading, not frontmatter |
| `ajv` already proven in Piece 2 validation harness | Validation engine ready |
| `.husky/pre-commit` exists (gitleaks today; expansion points noted) | Validation insertion point exists |

### 4.2 Piece 2 decisions that constrain Piece 3

| Piece 2 decision | Piece 3 implication |
|---|---|
| 26 universal + up to 7 per-type fields per record | Pure in-file is infeasible (already ruled out by §3 constraint too) |
| `content_hash` is universal (D30-supplement §8) | Record drift is hash-detectable independent of frontmatter |
| `lineage` is universal, object-or-null (D25) | Must be populated on every ported file — a natural fit for hook auto-derive on port |
| `sections[]` is optional (D17), ~10–20 files expected | Section detection is a narrower sub-problem |
| `data_contracts[]` (D30), `state_files[]` (D28), `dependencies[]` (D23) | Structured arrays — auto-derivation requires code analysis, not just file parsing |
| Schema mirrored identically in both repos (§12) | Whatever Piece 3 produces must be symmetric |
| Port-over sanitizes as safety net (BRAINSTORM §3.8) | Piece 3's validator has a backstop |

### 4.3 No prior labeling/registry code

Checked: `scripts/*.js`, `scripts/lib/*.js`, `.claude/hooks/*.js`. No hits on
`registry | label | frontmatter | manifest | catalog`. Piece 3 builds from
scratch on top of `safe-fs.js`, `sanitize-error.cjs`, `ajv`, husky pre-commit.

### 4.4 Existing patterns worth leveraging

| Pattern | Location | Piece 3 use |
|---|---|---|
| YAML frontmatter (skills/agents/memories) | Various | Compat-read as seed data for back-fill |
| `**Lineage:**` markdown heading (pr-review) | `.claude/skills/pr-review/` | Body-text pattern is a precedent — NOT frontmatter |
| `ajv` + `schema-v1.json` | `.claude/sync/schema/` | Validation engine |
| `.husky/pre-commit` + `_shared.sh` | `.husky/` | Validation insertion point |
| `safe-fs.js`, `sanitize-error.cjs` | `scripts/lib/` | All file I/O + error paths |
| Agent-driven bulk scan | Piece 1a/1b | Template for back-fill agent design |

### 4.5 BRAINSTORM risks that concern Piece 3

- **Risk #4 (labeling fatigue)** — addressed by hard-constraint §3 (no manual
  steps day-to-day)
- **Risk #1 (schema stabilization)** — DE-RISKED by port-over safety net;
  Piece 3 validator MAY warn rather than block for transitional fields
- **Risk #2 (synthesis overload)** — if back-fill uses many parallel agents,
  a synthesis pass is mandatory

---

## 5. Decision axes — OPEN questions with per-option risk analysis

Each axis is genuinely open. No defaults recommended here — recommendations
live inside individual Discovery questions, answered one at a time.

### Axis A — Source of truth for universal fields

Options remaining after §3 constraint (A2 ruled out):

| Option | What it means | Drift risk | Housekeeping risk | Update risk |
|---|---|---|---|---|
| **A1: External catalog only** | All 26 universal + per-type fields in a catalog file. No labels in source files. | **Low.** Single source; no two-place disagreement. | **Medium.** Catalog can go stale between scans. Mitigation: pre-commit hash check vs catalog hash. | **Medium.** Any file edit needs corresponding catalog update. If a file edit commits WITHOUT catalog update, the catalog silently lies until next scan. |
| **A3: Hybrid — universal external, per-type in-file** | 26 universal in catalog. Per-type fields stay in existing frontmatter (skills use YAML, memories use YAML, team files use HTML). | **High for per-type fields.** 3 generations of memory frontmatter drift already observed — this option inherits that problem. **Low for universal.** | **High.** Two places to keep in sync. Author-edits on per-type fields silently drift external catalog expectations. | **High.** Per-type field changes require file edit (auto-derivable?) AND silent impact on universal dependencies field that references per-type. |
| **A4: Hybrid — minimal identity in-file (name/type/purpose), rest external** | 3-field identity anchor in source file. 23+ universal + per-type in catalog. | **Low.** Identity rarely changes (name/type structural; purpose narrow). Heavy-tail drift lives only in external. | **Low.** Tiny in-file surface area; catalog is the maintained surface. | **Medium.** Same as A1 for external. Identity anchor enables catalog-to-file mapping if paths rename. |
| **A5: External catalog + content-hash tethering** | Pure A1 but every record carries `content_hash` and `path`. No in-file label at all. Hash mismatch flags drift. | **Low.** Single source. | **Low.** Hash drift is detectable automatically — pre-commit verifies hash matches, flags if catalog stale. | **Low-Medium.** Hash catch prevents silent stale; ACTUAL update of record content (purpose, dependencies) still needs re-derivation on edit. |

**NB:** A5 is a strengthened variant of A1 that uses the `content_hash`
column Piece 2 already mandated (D30-supplement §8). If chosen, Piece 3
leans on that column to close A1's "silent stale" gap.

### Axis B — Who creates/updates records

Options remaining after §3 constraint (B3 and any author-involvement on
every write ruled out):

| Option | What it means | Drift risk | Housekeeping risk | Update risk |
|---|---|---|---|---|
| **B1: Scan agent only, on-demand skill** | User runs `/label-scan` when they feel like it. No automatic triggers. | **High.** Records stale until next scan. | **Low** during scan (automated). **High** between scans (user forgetfulness). | **High between scans.** A file edit doesn't update its record until next skill run. |
| **B2: Write-hook auto-derive** | Hook fires on file write/commit. Derives label from file content without prompting. | **Low.** Updates every commit. | **Low.** Zero user involvement. | **Medium.** Hook must handle every file type's auto-derivation; failures silently skip or log. |
| **B1+B2: Hook on writes + skill on-demand for drift** | Hook does per-file auto-updates; periodic skill catches what hook missed or drifted. | **Low.** Two layers. | **Low.** Hook automatic; skill on-demand (user's stated acceptance). | **Low.** Hook catches most; skill backstops. |
| **B6: Hook on writes + pre-commit validator + NO scan skill** | Hook derives; pre-commit blocks invalid. | **Low if hook derivation is complete.** | **Low.** | **Low if hook complete. High if hook has gaps.** |

### Axis C — When/where validation runs

All options fit §3 (no manual steps; pre-commit is not manual):

| Option | What it means | Drift risk | Housekeeping risk | Update risk |
|---|---|---|---|---|
| **C1: Pre-commit only** | ajv runs on every `git commit`. Bad records block. | **Medium.** Catches invalid NEW records; misses drift that doesn't touch git this commit. | **Low.** | **Medium.** Content-hash drift without a file edit commit goes undetected. |
| **C2: Write-hook (PostToolUse)** | Validates on every file write, even uncommitted. | **Low.** Instant feedback. | **Low.** | **Low** — but hook runs constantly. |
| **C3: Pre-commit + periodic sweep skill** | Pre-commit for near-term; `/label-audit` for drift. | **Low.** | **Low** (hook auto + skill on-demand). | **Low.** |
| **C4: Pre-commit + port-over sweep** | Validation at sync events only for deep scan. | **Medium.** Between sync events, same-repo drift possible. | **Low.** | **Medium** (sync-cycle-gated). |

### Axis D — Section detection for mixed-scope files (~10–20 files)

Options remaining after §3 constraint (D1 and D4's author-confirms ruled out):

| Option | What it means | Drift risk | Housekeeping risk | Update risk |
|---|---|---|---|---|
| **D2: Agent pass detects content bleed** | Skill-invokable agent scans each file for scope bleed. User runs when they want to re-audit. | **Medium.** Sections drift between agent runs. | **Low during run; Medium between runs** (user forgetfulness). | **Medium** — author edits to a file can create new bleed until next audit. |
| **D3: Heuristic (headings + scope-keyword grep)** | Fast rule-based detection. Runs during scan/validation automatically. | **Medium-High.** Heuristic misses subtle bleed (false negatives). | **Low.** | **Low.** Heuristic re-runs fast on every edit. |
| **D2+D3: Heuristic auto + agent skill audit** | Heuristic in pre-commit / scan; agent skill for deep periodic audit. | **Low** when both used. | **Low.** | **Low.** |

### §5 summary — what's genuinely on the table

- **Axis A:** A1 vs A3 vs A4 vs A5 (four options with distinct risk profiles)
- **Axis B:** B1 vs B2 vs B1+B2 vs B6 (four options)
- **Axis C:** C1 vs C2 vs C3 vs C4 (four options)
- **Axis D:** D2 vs D3 vs D2+D3 (three options)

**Interaction note:** Axes aren't independent. If A5 chosen, C1 gets stronger
(hash check + ajv). If B2 chosen, C1 becomes partial-redundant. Discovery
will walk these in a coherent order rather than axis-by-axis.

---

## 6. Verification of code-state claims

Convergence-loop `quick` preset completed inline (6 claims). Results:

| # | Claim | Verdict | Notes |
|---|---|---|---|
| 1 | Schema at `.claude/sync/schema/` (6 files) | VERIFIED | Phase 0 ls output |
| 2 | `.validate-test.cjs` uses `ajv` | VERIFIED | `require('ajv')` line 11; `ajv.compile(schema)` line 21 |
| 3 | `.husky/pre-commit` exists | VERIFIED | Gitleaks check + post-foundation expansion list |
| 4 | No existing registry/label code | VERIFIED | grep clean in scripts/, scripts/lib/, .claude/hooks/ |
| 5 | Piece 2 DECISIONS.md has D1–D32 | VERIFIED | 33 narrative D-references |
| 6 | Piece 1a catalogued ~187 units | VERIFIED | LEARNINGS.md line 147 |
| 7 | SoNash has 81 skills, 20× byte spread | VERIFIED | LEARNINGS.md |
| 8 | Team files use HTML-comment metadata | VERIFIED | RESEARCH_OUTPUT.md line 85 |
| 9 | 3 generations of memory frontmatter drift | VERIFIED | RESEARCH_OUTPUT.md line 148 |
| 10 | `scripts/lib/safe-fs.js` exists | VERIFIED | ls hit |
| **11** | **ajv in `package.json`** | **CONTRADICTED** | `ajv@8.18.0` is installed but marked `extraneous` — not declared in `devDependencies`. The validator works today but the dep is unpinned. **Action for Piece 3 execution:** `npm install --save-dev ajv` to make it declared. |
| **12** | **`port_lineage:` in pr-review** | **PARTIALLY VERIFIED (reworded)** | Pattern is `**Lineage:**` in markdown body text (SKILL.md line 19; 2 reference docs), NOT YAML frontmatter. Still supports the "lineage convention exists" claim; does not support "frontmatter pattern ready to port." |

**Effect on plan:** Claim 11 adds a Piece 3 execution step (declare ajv).
Claim 12 means Piece 3 cannot lean on a pre-existing YAML-frontmatter
precedent for lineage; it would need to design one (or stay with external-
only).

---

## 7. Deliverables for Piece 3

1. `.planning/piece-3-labeling-mechanism/DIAGNOSIS.md` — this file (v2)
2. `.planning/piece-3-labeling-mechanism/DECISIONS.md` — Phase 2 output
3. `.planning/piece-3-labeling-mechanism/PLAN.md` — Phase 3 output
4. `.claude/state/deep-plan.piece-3-labeling-mechanism.state.json` —
   incremental state

Expected execution-phase artifacts (decided in PLAN, built later):

- Label tooling root (path TBD)
- Scan/back-fill component
- Pre-commit validation step (extension of `.husky/pre-commit` sequence)
- Write-hook OR on-demand skill (decision pending)
- Section-detection helper (scope TBD)
- Initial filled `files.jsonl` + `composites.jsonl` for JASON-OS
- `ajv` declared as proper devDependency (fix for CL claim 11)

---

## 8. Open questions — Phase 1 Discovery planning

All axes genuinely open per §5. No defaults committed here.

Batching plan (approximate; real count depends on inter-batch synthesis):

1. **Batch 1: Reframe confirmation + Axis A** — is source-of-truth the
   primary question? Pick A1 / A3 / A4 / A5.
2. **Batch 2: Axis B** (who creates) — constrained by Batch 1 outcome.
3. **Batch 3: Axis C + D** (validation timing + section detection) —
   interaction with A and B.
4. **Batch 4: Back-fill shape** — Piece 3.5 still needed? Agent topology,
   pacing, rollback.
5. **Batch 5: New-file + update workflows** — hook specifics or skill-only;
   how does file-edit → record-update happen under chosen axis combo?
6. **Batch 6: Author ergonomics under constraint §3** — if NO manual steps,
   how does an author writing a new skill validate it? (Auto-derive at
   write? Nothing required, skill fills later?)
7. **Batch 7: Edge cases + storage boundary to Piece 4** — cross-repo
   mirror discipline, failure modes, Piece 4 handoff contract.

---

## 9. Effort estimate

**Planning:** L (60–90 min — user time mostly in batched Q&A)
**Execution:** L/XL (tooling build, bulk back-fill, validation harness, hook
integration, mirror to SoNash). 3–5 execution sessions plausible.

---

## 10. Phase gate

**Asks for sign-off:**

1. Is the §2 reframe ("source-of-truth is the load-bearing decision")
   correct, or do you want to reframe?
2. Does the 4-axis decomposition in §5 match how you want to decide, or
   would you prefer the 9-session-goal linear list?
3. Are there other hard constraints beyond §3 I should surface before
   Discovery opens?
4. CL findings §6: agree claim 11 fix (`npm install --save-dev ajv`) and
   claim 12 reframe (no YAML-frontmatter lineage precedent; convention
   would need design) both belong in the record?

Once confirmed → Phase 1 Discovery Batch 1.
