# SONASH_MIRROR_DELTA — Piece 3 structural-fix cross-repo staging

**Session produced:** #15 (2026-04-22)
**Branch:** `fixes-42226` (JASON-OS)
**Supersedes:** the earlier `SONASH_HANDOFF.md` placeholder referenced
by parent PLAN §S13 (see §S13 addendum).
**Decisions:** D8.4, D8.5, D8.6 in
`.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md`.
**Consumer:** a future Piece 5.5 Claude Code session, opened inside
the SoNash repo, executes this delta.

---

## §1 Purpose

This document is the self-contained coordination artifact for mirroring
the Piece 3 structural fix from JASON-OS into SoNash. It describes:

1. Which artifacts cross the repo boundary (universal — D8.5).
2. Which artifacts do NOT cross (project-scoped — D8.5).
3. The port order + dependencies between mirrored files.
4. Per-file porting notes (SoNash-specific sanitizations, if any).
5. Validation the mirror side must run after receipt.
6. Backward-compat posture on the SoNash side (D3.7 gradual).

Nothing in this document writes to SoNash. Piece 5.5 is the execution
window; this delta is the input to that session.

---

## §2 Artifacts that cross (D8.5)

All paths below are JASON-OS-relative; SoNash copies to the identical
path in its repo unless noted.

### §2.1 Schema

| File | Rationale |
|---|---|
| `.claude/sync/schema/schema-v1.json` | v1.3 ajv schema (D2.1–D3.7 + §9.3 split + enum_git_hook_event) |
| `.claude/sync/schema/enums.json` | Auto-generated from schema; cross it for consumers that read it without Node |
| `.claude/sync/schema/SCHEMA.md` | §3.11 Lineage, §3.12 Confidence, §8.1 type-enum reflow, §8.4a generated-portability pair, §8.5a git_hook_event, §9.3 split, §9.11/§9.12 git-hook/test |
| `.claude/sync/schema/EVOLUTION.md` | §11 v1.3 entry + new §10 template ceremony rows |
| `.claude/sync/schema/EXAMPLES.md` | Examples 21–23 (git-hook, test, confidence); Example 6 cleanup per §9.3 split |
| `.claude/sync/schema/build-enums.js` | D3.5 auto-generation tool |
| `.claude/sync/schema/validate.test.cjs` | Renamed from `.validate-test.cjs` per D4.7 — D4.6-discoverable via test-suffix canon |

### §2.2 Templates + shared partial

| File | Rationale |
|---|---|
| `.claude/sync/label/backfill/agent-primary-template.md` | Uses `{{INCLUDE:agent-instructions-shared.md}}` marker; role preamble + hard constraints stay inline |
| `.claude/sync/label/backfill/agent-secondary-template.md` | Same — secondary role preamble |
| `.claude/sync/label/backfill/synthesis-agent-template.md` | No schema-shape drift; copy as-is |
| `.claude/sync/label/backfill/agent-instructions-shared.md` | **NEW (D5.2)** — canonical v1.3 field-rules body; single source of truth for schema shapes across both repos |

### §2.3 Back-fill + library

| File | Rationale |
|---|---|
| `.claude/sync/label/backfill/verify.js` | D5.6 strip-before-validate removed; validates raw agent output |
| `.claude/sync/label/backfill/cross-check.js` | No code change; confidence is now first-class (emits `confidence: fieldScores` compatible with v1.3) |
| `.claude/sync/label/backfill/prompts.js` | `{{INCLUDE:...}}` substitution + 5 `applyRuntimeGuards` (D6.8) + `SCHEMA_VERSION = "1.3"` |
| `.claude/sync/label/lib/derive.js` | D4.1 `deriveName` + D4.5 new detectType rules + D4.6 test detection |
| `.claude/sync/label/lib/validate-catalog.js` | D5.8 single-path v1.3 (extendStatusEnum removed) + D4.3 name-uniqueness enforcement |
| `.claude/sync/label/lib/scope-matcher.js` | No code change; handles dotfiles under `**/*` natively |
| `.claude/sync/label/lib/{fingerprint,confidence,catalog-io,agent-runner,sanitize}.js` | No schema-shape changes; cross for parity |

### §2.4 Docs

| File | Rationale |
|---|---|
| `.claude/sync/label/docs/CATALOG_SHAPE.md` | v0.3 update — §3 per-type extensions + §4.1 v1.3 bump + §4.6 writer contract + §7 example record |
| `.claude/skills/label-audit/reference/DERIVATION_RULES.md` | Rewritten as thin pointer to `agent-instructions-shared.md` (D5.4) |
| `.claude/skills/label-audit/reference/DISAGREEMENT_RESOLUTION.md` | v1.2→v1.3 version-string touch-ups; note about confidence being the single additional-properties exception (D2.2) |

### §2.5 Sub-directory READMEs (Phase E)

Cross if parity is desired, but these are skill/sub-area descriptions
— purely local. Recommend: cross to keep the mental model aligned
across both repos.

- `.claude/sync/label/README.md`
- `.claude/sync/label/backfill/README.md`
- `.claude/sync/label/docs/README.md`
- `.claude/sync/label/hooks/README.md`
- `.claude/sync/label/lib/README.md`
- `.claude/sync/label/skill/README.md`

### §2.6 Dev dependency

| Package | Version | Rationale |
|---|---|---|
| `ajv-formats` | `^3.0.1` | Required by the v1.3 schema harness (format:date-time on last_hook_fire). SoNash may already have it via other paths — check `package.json` before adding. |

---

## §3 Artifacts that do NOT cross (D8.5)

| File / Path | Reason |
|---|---|
| `.claude/sync/label/scope.json` | Project-scoped — SoNash maintains its own committable set. SoNash's scope.json can adopt the v2 `include: ["**/*"]` negative-space model (D1.1) but the exclude list is per-repo (SoNash has its own ignore surface). |
| `.claude/settings.json` | Per-project permissions + hook wiring. SoNash wires its own label hook delegators using the same pattern described in §4 below. |
| `.husky/pre-commit` | Per-project gate list. SoNash adopts the same `build-enums.js --check` + `validate-catalog.js --staged` blocks as patches to its own pre-commit, not by copy. |
| `.planning/**` | Project-specific planning artifacts. DIAGNOSIS / DECISIONS / PLAN etc. are per-repo work products. |
| `.research/**` | Project-specific research outputs. |
| `.claude/state/**` | Ephemeral; never versioned or mirrored. |
| Catalog `.jsonl` files (`.claude/sync/label/*.jsonl`, `.claude/sync/schema/*.jsonl`) | SoNash regenerates its own catalogs via a back-fill run against its own 5×-larger corpus. |

---

## §4 Port order + dependencies

Execute in this order — each step assumes previous steps landed cleanly:

1. **Schema first** — §2.1 files. Nothing else compiles until the v1.3
   schema is in place.
2. **Install dev dep** — `npm install --save-dev ajv-formats`. Run
   `node .claude/sync/schema/validate.test.cjs` to confirm 14/14 tests
   pass on SoNash's copy of the harness.
3. **Auto-generate enums.json** — run
   `node .claude/sync/schema/build-enums.js`. Should produce a file
   byte-identical to JASON-OS's `enums.json` (schema is universal;
   descriptions + decision_refs live in the build script's METADATA
   map, also universal). `git diff` should be clean if the script was
   copied correctly.
4. **Templates + shared partial** — §2.2 files.
5. **Library + backfill** — §2.3 files. Run SoNash's existing
   `.claude/sync/label/lib/__tests__/*.test.js` and
   `.claude/sync/label/backfill/__tests__/*.test.js` if they exist;
   the JASON-OS versions of these tests reference shared structural
   shapes and should pass after the library port.
6. **Docs + READMEs** — §2.4 + §2.5.
7. **Project-specific patches** — scope.json, settings.json hooks,
   .husky/pre-commit (all per-file edits, NOT copies).

---

## §5 Porting notes

### SoNash-specific sanitizations to check

Before copying each file, grep for these strings. If present, the file
is not universal as claimed — stop and reconcile:

- `SONASH` / `sonash`
- `JASON-OS` / `jason-os` (okay in references / doc links; flag in
  code)
- Absolute Windows paths (`C:\Users\jbell\...`)
- `jasonmichaelbell78` / GitHub usernames
- `WEATHER_API_KEY` or any `*_TOKEN` / `*_KEY` env-var name that is
  JASON-OS-specific

Expected result: zero hits across §2.1–§2.4 files. If any appear, they
are either doc-level cross-references (safe) or actual drift (reject).

### Handling SoNash's existing records

SoNash has pre-existing v1.2 records in its label catalogs. Per D3.7
(gradual backward-compat), those records validate cleanly under v1.3
without rewriting. SoNash's Piece 5.5 back-fill run will re-derive
them to stamp `schema_version: "1.3"`; until then, mixed-stamp
catalogs are valid.

### Scope.json adoption

SoNash's Piece 5.5 session SHOULD adopt the v2 negative-space model
(D1.1) at the same time as the structural-fix mirror, but this is
independent: SoNash can keep its current positive-list scope.json and
still validate records under the new schema. The two changes are
orthogonal.

---

## §6 Validation after cross

The Piece 5.5 session MUST run these checks post-mirror:

1. **Schema harness** — `node .claude/sync/schema/validate.test.cjs`
   → 14/14 tests pass (same as JASON-OS).
2. **Enums drift check** — `node .claude/sync/schema/build-enums.js --check`
   → OK (enums.json matches schema-v1.json).
3. **Library tests** (if SoNash has them) — `node --test
   .claude/sync/label/lib/__tests__/*.test.js` → all green.
4. **Backfill tests** (if SoNash has them) — `node --test
   .claude/sync/label/backfill/__tests__/*.test.js` → all green.
5. **Validate existing SoNash catalogs against v1.3** — `node
   .claude/sync/label/lib/validate-catalog.js` → should pass; v1.2
   records accepted by additive compatibility.
6. **Sanity: smoke new detectType rules** — derive.js test cases for
   `.husky/pre-commit` → `git-hook` and `smoke.test.js` → `test`.

If any of the above fails, STOP the mirror. Do not proceed to
SoNash-side back-fill until the mismatch is reconciled (likely a
missed file from §2.x or a local SoNash modification).

---

## §7 Backward-compat posture (D3.7)

- Every v1.2 record in SoNash's catalogs validates cleanly under v1.3
  (schema is additive-only — no fields removed, no enum values removed,
  no required-field additions without defaults).
- New SoNash records stamp `schema_version: "1.3"` after the mirror
  lands.
- Mixed-stamp catalogs (some "1.2", some "1.3") are valid per D5.8 —
  `validate-catalog.js` treats schema_version as informational.
- SoNash's pre-existing strip-before-validate in verify.js (if
  present) must also be removed as part of the §2.3 port. This is not
  optional — leaving it in place masks the confidence-shape difference
  between v1.2 (stripped) and v1.3 (explicit).

---

## §8 Piece 5.5 execution checklist

Short form for the Piece 5.5 session. Expand each checkbox per the
sections above:

- [ ] `/session-begin` in SoNash repo; confirm branch is clean and
      not on main
- [ ] Read this `SONASH_MIRROR_DELTA.md` top to bottom
- [ ] Run pre-flight sanity check: SoNash's current schema_version
      stamps (sampled), pre-existing scope.json shape, existing label
      catalogs
- [ ] Install `ajv-formats` as dev dep
- [ ] Mirror §2.1 schema files (7 files)
- [ ] Run §6 validation step 1 + 2 → must pass before continuing
- [ ] Mirror §2.2 templates (4 files)
- [ ] Mirror §2.3 library + backfill (the JS files and support libs)
- [ ] Run §6 validation steps 3 + 4
- [ ] Mirror §2.4 docs (3 files)
- [ ] Mirror §2.5 READMEs (6 files, optional parity)
- [ ] Rename SoNash's `.validate-test.cjs` → `validate.test.cjs`
      (D4.7 parallel)
- [ ] Update SoNash's `.husky/pre-commit` with the Check 2 enums drift
      block (see §3 — patched, not copied)
- [ ] Update SoNash's `.claude/settings.json` with label hook delegator
      wiring (pattern from JASON-OS; paths local)
- [ ] Update SoNash's `scope.json` per §5 "Scope.json adoption" —
      optional but recommended
- [ ] Commit as "feat(structural-fix): Piece 3 v1.3 mirror from
      JASON-OS @ `<sha>`"
- [ ] Run SoNash back-fill (separate session; not part of this mirror
      window — SoNash's 5× larger corpus is its own effort)

---

## §9 Cross-references

- **Source plan:** `.planning/piece-3-labeling-mechanism/structural-fix/PLAN.md`
- **Source decisions:** `.planning/piece-3-labeling-mechanism/structural-fix/DECISIONS.md` (D1.1–D8.7)
- **Parent plan addendum:** §S13 addendum in
  `.planning/piece-3-labeling-mechanism/PLAN.md`
- **Schema authority:** `.claude/sync/schema/SCHEMA.md` +
  `EVOLUTION.md` §11 (v1.3 entry)
- **Shared partial:** `.claude/sync/label/backfill/agent-instructions-shared.md`
- **Verification harness:** `.claude/sync/schema/validate.test.cjs`
- **JASON-OS commit range that produced this delta:** fixes-42226
  branch commits 1/8 through 8/8 (648a200..HEAD at time of writing)

---

**End of SONASH_MIRROR_DELTA.md.**
