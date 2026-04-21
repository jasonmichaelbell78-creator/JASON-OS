# DIAGNOSIS — Piece 3 Structural Fix + Scope Expansion + Re-run + Mirror Prep

**Status:** Draft — Phase 0 of `/deep-plan`
**Date:** 2026-04-21 (Session 13)
**Plan output location:** `.planning/piece-3-labeling-mechanism/structural-fix/`
**Parent plan:** `.planning/piece-3-labeling-mechanism/PLAN.md` (Piece 3 — S0–S13)
**Primary pickup:** `.planning/piece-3-labeling-mechanism/S10_HANDOFF.md`
**Findings ledger:** `.planning/piece-3-labeling-mechanism/S10_LEARNINGS.md`

---

## §1 ROADMAP alignment

JASON-OS v0.1 has no `ROADMAP.md` yet. Direction tracked in
`SESSION_CONTEXT.md` → Next Session Goals Step 2 explicitly directs this
`/deep-plan` as the primary session-13 work. **Aligned.**

No reframe needed — the topic (structural fix before re-run) matches the
handoff and the session-goals narrative.

---

## §2 What happened (context for the structural fix)

S10 back-fill was executed partially in Session 12 (17 batches, 34 agents,
169 records derived into a gitignored preview). Mid-run, three classes of
structural issues surfaced that would propagate into every future run,
into the dormant PostToolUse hook, into `/label-audit`, and into the
SoNash Piece 5.5 mirror if not resolved at root:

1. **Scope under-inclusion** against the user's canonical rule
   "committable = in scope."
2. **Schema v1.2 vs template/contract drift** (lineage, confidence,
   external-dep shape, enum gaps).
3. **Naming convention inconsistency** (basename vs slug vs mixed)
   breaking cross-references.
4. **`derive.js` heuristic gaps** for `.cjs/.mjs/.sh` + hook-lib edge cases.

The existing 169-file preview is **paused, gitignored, and explicitly
NOT to be promoted** per the handoff. The re-run on fixed foundation
replaces it.

---

## §3 Current state — verified file counts (2026-04-21)

| Claim                                    | Handoff value | Verified now    | Verify command                             |
| ---------------------------------------- | ------------- | --------------- | ------------------------------------------ |
| Total tracked files                      | 416           | **429**         | `git ls-files \| wc -l`                    |
| `.research/**` tracked                   | 210           | **241**         | `git ls-files '.research/*' \| wc -l`      |
| `**/__tests__/**` tracked                | 6             | **10**          | `git ls-files '**/__tests__/*' \| wc -l`   |
| S10 preview records written              | 169           | 169 (unchanged) | `wc -l .claude/sync/label/preview/*.jsonl` |
| Records NOT promoted (paused, gitignored) | yes          | yes             | `cat .gitignore \| grep sync/label`        |

The handoff numbers are stale by ~+13 files because Session 12 itself
committed the 30 migration-skill findings (`c11c492` paused S10;
`62edfd4` committed the findings). Scope decisions must use the
**current** 429 number, not the 416 in the handoff.

**Estimated delta under the "committable = in scope" rule:**
`429 total - 169 currently in scope ≈ 260 files to absorb`, skewed by
the 241 `.research/**` files. Exact delta gets computed during Phase 1
Q1 answers.

---

## §4 Schema v1.2 — drift inventory (verified against
`.claude/sync/schema/schema-v1.json`)

### §4.1 `lineage_object` shape — template diverges from schema

Schema v1.2 (lines 228–243):

```json
{
  "type": "object",
  "required": ["source_project", "source_path", "source_version", "ported_date"],
  "properties": { /* exactly those 4 keys */ },
  "additionalProperties": false
}
```

Template (`agent-primary-template.md` L85–88, `agent-secondary-template.md`
L85–88) says:

> Format (object): `{source_repo, source_path, source_version, notes}`.

Two fields invented (`source_repo`, `notes`); two required fields absent
(`source_project`, `ported_date`). ajv rejects every template-shape
lineage record. S10 run had to post-hoc fix 20+ records.

### §4.2 `confidence` field not in schema

Schema `file_record.additionalProperties: false` (line 634). `confidence`
is not listed. But both agent templates (L157–189) instruct agents to
emit a top-level `confidence` object. Every raw agent record is
schema-rejected until `confidence` is stripped. `verify.js` strips
before validate as a band-aid.

### §4.3 External-dep shape — template examples imply strings

Template (L71–78):

> - `external_services` — third-party APIs (GitHub, SonarCloud, OpenAI)
> - `tool_deps` — external CLI binaries (gh, gitleaks, go, node, bash)
> - `mcp_dependencies` — MCP server tool names
> - `required_secrets` — env var names (SONAR_TOKEN, GITHUB_TOKEN)

Schema (lines 369–384) requires `external_dep_entry = {name, hardness}`
objects for ALL four fields. Agents drifted to bare-string form until
the dispatch wrapper was patched mid-run.

### §4.4 Enum gaps

- `enum_type` (schema L10–36): no `git-hook`, no `skill-reference`, no
  `companion-doc`. `other` is the escape valve.
- `enum_portability` (L47–56): no `generated`. (`status` enum DOES
  include `generated` at L68.)
- `enum_hook_event` (L72–83): Claude Code events only; no git-hook
  events (applypatch-msg, commit-msg, pre-commit, etc.). `type: "hook"`
  currently requires a `hook_event` → git hooks can't use it.

### §4.5 `content_hash` not nullable

Schema (L419): `"content_hash": { "type": "string" }` — not nullable.
Template says agent-runner provides it; dispatch wrapper emitted `null`
for unknowns, schema rejects.

### §4.6 hook-lib schema too strict

Schema `allOf` branch for `hook | hook-lib` (L550–564) requires `event`
string. `.claude/hooks/lib/*.js` files are libraries with no event,
which is why the S10 run re-typed them as `script-lib` as a workaround.

---

## §5 Scope.json — current state

Path: `.claude/sync/label/scope.json` (v1, 56 include patterns + 12
exclude patterns).

Key current exclusions violating "committable = in scope":

| Exclude pattern         | Tracked files excluded     | Committable? |
| ----------------------- | -------------------------- | ------------ |
| `.research/**`          | 241                        | yes          |
| `**/__tests__/**`       | 10                         | yes          |
| `**/*.test.js`          | (subset of above)          | yes          |
| `**/*.test.cjs`         | (subset of above)          | yes          |

Comment in `scope.json` L68: ".research/ is excluded for MVP noise
reduction; revisit in S10 back-fill run if the census needs it" — S10
run established that the census DOES need it, per user rule.

**31 pattern-narrowness misses** documented in S10_HANDOFF.md §"Issue 1"
— 14 specific files that should be covered by broader include patterns
but aren't (LICENSE, sonar-project.properties, `.github/CODEOWNERS`,
etc.). Every one is currently tracked-but-excluded.

---

## §6 Naming convention — observed inconsistency

From S10_LEARNINGS.md B02/B03 findings:

- `.name` field uses basename for some records (`SKILL`, `PLAN`,
  `SCHEMA`), directory slug for others (`pr-review`, `deep-research`,
  `skill-creator`).
- 156 "dangling" deps in the preview cross-batch sweep = **115 naming
  mismatches** + 40 truly missing references.

No decision currently locks the canonical rule. `derive.js` L77 emits
`path.basename(rel, ext)` → always basename. The templates say:
"filename slug (without extension), or YAML `name:` frontmatter" —
agents respect frontmatter, producing mixed outcomes.

---

## §7 `derive.js` heuristic — observed conservatism

Tested cases from S10_LEARNINGS.md:

- `.validate-test.cjs` → `detectType()` returns `"other"` (agents chose
  `script`)
- `husky.sh` → `"other"` (agents chose `script`)
- Hook-lib vs hook distinction under `.claude/hooks/lib/` — function
  exists but is whole-directory (`/^\.claude\/hooks\/lib\//`) without
  further nuance

`detectType()` (derive.js L134–207) handles `.js|.cjs|.mjs` under
`scripts/` and `.claude/hooks/`, but not `.sh` for anything under
`scripts/` (L154–159). `.claude/hooks/**/*.sh` is matched by scope but
falls through `detectType()` → `other`.

---

## §8 Upstream hook wiring — confirmed dormant

Verified against `.claude/settings.json`:

- `hooks.PostToolUse` section contains no entry for
  `post-tool-use-label.js`. Grep confirms: no `post-tool-use-label`,
  `notification-label`, or `user-prompt-submit-label` references in
  settings.json.
- The scripts exist at `.claude/sync/label/hooks/*.js` but are not
  wired to events.
- The pre-commit validator (PLAN §S6) exists and is wired to
  `.husky/pre-commit`; it also reads `scope.json`.

Implication: any scope.json / schema change is consumed by
(a) `/label-audit` skill, (b) the pre-commit validator, and
(c) the back-fill orchestrator. The PostToolUse hook inherits
automatically once wired — no re-coordination needed, but the wiring
decision is explicit in the discovery.

---

## §9 Downstream impact surface

| Consumer                              | What it reads / writes                                                  | Impact of structural fix                                            |
| ------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `orchestrate.js` back-fill (S10)      | scope.json, agent templates, schema, derive.js                          | Full re-run consumes the fixed foundation                           |
| Agent-primary/secondary templates     | schema shapes, dep shapes, enums                                        | Templates rewritten to match schema v1.3                            |
| `verify.js` (new; committed S10 session) | schema-v1.json, sanity rules, preview JSONL                          | `confidence`-strip band-aid removed if confidence moves into schema |
| `/label-audit` skill                  | scope.json, catalog JSONL                                               | Dogfood after re-run to confirm coverage / accuracy                 |
| `.husky/pre-commit` validator         | scope.json, schema-v1.json                                              | Reads the fixed scope — blocks invalid records automatically        |
| PostToolUse hook (dormant)            | scope.json, schema-v1.json                                              | When wired, inherits fixed scope                                    |
| S11 audit checkpoint                  | new/modified files from the fix                                         | Moves; new files to review                                          |
| S12 end-to-end tests                  | Fixtures that may assume old scope / schema                             | Fixtures may need updating                                          |
| S13 SoNash mirror (Piece 5.5)         | scope.json, schema-v1.json, templates, verify.js                        | ALL cross; ordering matters                                         |
| Piece 5 `/sync` skill design          | Operates over whatever catalog Piece 3 produces                         | Unlocked only after clean foundation                                |
| `/migration` skill (crystallized)     | Brainstorm blocked on Piece 5 `/sync`                                   | Indirect — inherits clean catalog via /sync                         |

---

## §10 Reframe check

**Task as stated:** "Resolve the structural issues so the S10 re-run
produces a clean foundation; coordinate downstream impacts."

**Reframe examined:** Is this actually (a) just "expand scope and
re-run," (b) a schema v1.3 bump with template updates, or (c) a
broader re-plan of Piece 3? Evidence:

- It's not (a) alone — expanding scope without the schema/template/
  naming fixes would regenerate the same bugs.
- It's not (b) alone — schema v1.3 without the scope expansion still
  leaves the catalog 40%-covered.
- It's not (c) — S0–S9 are committed and working; the re-plan would be
  unnecessary scope expansion.

**Conclusion:** The task is what it appears to be — a coordinated
structural fix across five artifacts (scope.json, schema-v1.json,
templates ×3, derive.js) plus decisions on re-run strategy, hook
wiring, dogfood, and cross-repo mirror order.

---

## §11 Claims verified / `[UNVERIFIED]` flags

All numeric claims in this DIAGNOSIS have verify commands inline
(§3 table). Template drift claims verified by reading the template
files directly (this turn). Schema enum claims verified by reading
`schema-v1.json` directly. Hook-dormant claim verified by grep of
settings.json. No `[UNVERIFIED]` claims remain.

---

## §12 Phase-0 gate

User review requested:

- Confirm the 10 discovery categories from S10_HANDOFF.md §"Next step"
  are the right scope (add/remove any?).
- Confirm the artifact location `.planning/piece-3-labeling-mechanism/
  structural-fix/{DIAGNOSIS,DECISIONS,PLAN}.md` (vs overwriting the
  parent plan's artifacts).
- Confirm the stale 416 → current 429 file-count delta is acknowledged
  and discovery should use 429.
- Any reframe concerns before discovery begins.

No code changes pending this gate.
