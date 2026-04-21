# S10 Handoff — Paused for Structural /deep-plan

**Status:** S10 execution PAUSED.
**Date paused:** 2026-04-21 Session 12
**Reason:** Scope + schema structural issues discovered mid-run require
a `/deep-plan` to resolve correctly before proceeding.

## What got done

- S0–S9 of Piece 3 already complete (pre-session, via PR #9).
- S10 back-fill executed partially against a 169-file scope:
  - 17 batches dispatched (B01–B17)
  - 34 agents (17 primary + 17 secondary) — all completed
  - 169 records derived, cross-checked, verified
  - Preview written: `.claude/sync/label/preview/{shared,local}.jsonl`
    (137 shared + 32 local records) — **gitignored, not committed**
  - Per-batch intermediate artifacts in `.claude/state/s10-results/`
    (primary/secondary/crosschecked JSON per batch) — **gitignored, local only**

## Why paused — the structural issues

Discovered during the run that several pre-existing issues in upstream
contracts would propagate bugs into every future run + the downstream
`/sync` and `/migration` skills. The /deep-plan needs to resolve all of
these before any promotion happens.

### Issue 1: scope.json under-inclusion (biggest)

User rule: "if it is committable, it is within scope." Current scope.json
excludes **247 tracked files** (60% of the 416-file repo):

- **210 files under `.research/**`** — deep-research outputs,
  intentionally excluded "for MVP noise reduction" but per user rule
  should be in scope (committable, non-ephemeral)
- **6 test files** under `**/__tests__/**` — intentional but per user rule
  should be in scope (tests are first-class code)
- **31 pattern-too-narrow misses** — scope.json include patterns don't
  cover some extensions/paths even for intentionally-included areas:
  - `.claude/skills/*/*.yaml` (deep-research domains/*.yaml)
  - `.claude/skills/skill-creator/{LICENSE.txt, scripts/init_skill.py}`
  - `tools/statusline/{config.toml, config.local.toml.example, go.mod, go.sum}`
  - `.planning/jason-os/{BOOTSTRAP_DEFERRED, DEPENDENCIES, SYNTHESIS}.md`
  - `.planning/jason-os-mvp/HANDOFF.md`
  - `.planning/TODOS.md` (rendered from jsonl; debatable)
  - `.github/{CODEOWNERS, dependabot.yml, release.yml, pull_request_template.md}`
    (only `.github/workflows/**/*.yml` is covered)
  - `.claude/statusline-command.sh` (only `.claude/hooks/**/*.sh` covered)
  - `LICENSE` (root)
  - `sonar-project.properties`
  - `scripts/config/propagation-patterns.seed.json`
  - `scripts/lib/sanitize-error.d.ts`
  - `scripts/planning/package.json`
  - `.research/research-index.jsonl`

### Issue 2: Schema vs template/contract drift

- **`lineage` shape mismatch:** template says `{source_repo, source_path,
  source_version, notes}`; schema requires `{source_project, source_path,
  source_version, ported_date}`. `source_repo` and `notes` are rejected by
  ajv. Agents consistently emit the wrong shape. Post-hoc fixed 20+ records
  in this run.
- **`confidence` field not in schema** but required by template. Schema
  has `additionalProperties: false`, so raw agent output fails ajv until
  `confidence` is stripped. `verify.js` strips before validate; anywhere
  else that validates raw agent output will also need to strip.
- **Dependency shape drift on `required_secrets`, `tool_deps`,
  `external_services`, `mcp_dependencies`:** template examples look like
  bare strings; schema requires `{name, hardness}` objects. Agents split.
- **Type enum drift:** `hook_event` §8.5 enum covers only Claude Code
  events (PreToolUse, PostToolUse, etc.) — git-hook files (`.husky/_/*`)
  have no valid enum value. Agents chose `type: "other"` workaround.
  `portability` enum missing `"generated"`. `type` enum missing
  `"skill-reference"` or `"companion-doc"`.

### Issue 3: Naming convention inconsistency

Catalog records use inconsistent `.name` field — some files use basename
(`SKILL`, `PLAN`, `SCHEMA`), some use directory-slug (`pr-review`,
`deep-research`, `skill-creator`). Cross-references in the catalog are
unreliable. `/label-audit` dep-resolution passes see dangling references
everywhere. 156 "dangling" deps were 115 naming-convention mismatches +
only 40 truly missing references.

### Issue 4: `derive.js` heuristics too conservative

Returns `"other"` for `.cjs`, `.mjs`, `.sh` files that have obvious
functional types. Agents catch it and override, producing type-disagreement
warnings at scale.

### Issue 5: hook-lib schema too strict

`.claude/hooks/lib/*.js` files are utility modules, not hooks themselves —
they have no Claude Code event to fire on. But §9.3 requires `event:
string` for `type: "hook-lib"`. We re-typed them as `"script-lib"` as
workaround.

## Why NOT promote the current preview

- Covers only 40% of committable content (169/416)
- Schema issues (lineage, deps shape) were post-hoc band-aided, not fixed
  at root — re-runs would regenerate the bugs
- Naming convention is inconsistent — any downstream `/sync` or
  `/label-audit` work on this catalog would be unreliable
- SoNash mirror (S13) would inherit all of the above verbatim

## Where everything lives

### Committed (survives context clear)
- `.planning/piece-3-labeling-mechanism/PLAN.md` — §S10 patched with truthful
  Claude-driven invocation description
- `.planning/piece-3-labeling-mechanism/S10_LEARNINGS.md` — comprehensive
  learnings log (categories + per-batch findings + disagreement stats +
  recommendations for `/sync`)
- `.planning/piece-3-labeling-mechanism/S10_HANDOFF.md` — this file
- `.claude/sync/label/backfill/verify.js` — verification harness (schema +
  sanity + cross-batch consistency + statistical sanity); already strips
  `confidence` before schema validate (band-aid for Issue 2)
- `.claude/sync/label/preview/shared.jsonl` + `local.jsonl` — **gitignored**
  but preserved locally. Do NOT promote — superseded by re-run.

### Local-only (will be regenerated on re-run)
- `.claude/state/s10-results/*` — per-batch primary/secondary/crosschecked
  JSON. Useful for debugging what went wrong THIS run but not load-bearing
  for the next run.
- `.claude/state/s10-prompts/*` — the prompts that were sent to agents.

## Next step: `/deep-plan`

**Topic:** Piece 3 — structural fix + scope expansion + re-run + mirror prep

**Discovery categories the plan must cover:**

1. **Scope.json philosophy + implementation** — canonize the "committable
   = in scope" rule. Decide on `.research/` inclusion (yes, per user
   rule). Decide on `__tests__/` inclusion (yes, per user rule). Fix the
   31 pattern gaps. Identify any files the rule would EXCLUDE (gitignored
   + ephemeral only).

2. **Schema v1.3 fixes** — lineage shape (authoritative in schema, update
   template), required_secrets/tool_deps/external_services/mcp_dependencies
   shape (objects, update template), `confidence` field (add to schema
   with additionalProperties:true, OR document stripping as protocol),
   enum extensions (`git-hook` type + events, `"generated"` portability,
   `"skill-reference"` type or alternative).

3. **Naming convention canon** — pick ONE (basename vs slug vs mixed with
   explicit rules per type). Update `derive.js`. Decide how to handle
   existing records (programmatic rename pass on preview).

4. **derive.js heuristic expansion** — `.cjs`/`.mjs`/`.sh` rules, skill
   companion doc rule, hook-vs-script-lib distinction under
   `.claude/hooks/lib/`.

5. **Template updates** — `agent-primary-template.md`,
   `agent-secondary-template.md`, `synthesis-agent-template.md`,
   `CATALOG_SHAPE.md` §3.4 — align all with schema v1.3.

6. **Re-run strategy** — full re-run (all 416 files fresh)? Or partial
   (247 new-in-scope + programmatic patch for existing 169)?
   Recommendation: FULL for purity (proves mechanism + no post-hoc
   surgery); user's call.

7. **Upstream hook wiring implications** — PostToolUse hook uses same
   scope.json. Decide when to wire (currently dormant). Decide whether
   it needs any adjustment for the new scope/schema.

8. **`/label-audit` accuracy verification** — dogfood against the
   re-run output. Confirm audit passes cover the expanded scope.

9. **S11/S12/S13 impact review** — update test fixtures (S12) if
   expanded scope changes which files trigger what. SoNash mirror (S13)
   implications.

10. **SoNash mirror coordination (Piece 5.5)** — what artifacts get
    pushed across (scope.json, schema-v1.3.json, templates, verify.js)
    and in what order.

**Decision gates expected:** ~30–40 decisions across categories 1–10.
Estimate: one full session for discovery + lock, plus implementation
session(s).

## Pickup instructions for next session

1. Read this file (S10_HANDOFF.md) — you are here
2. Read `S10_LEARNINGS.md` for detailed findings
3. Read `PLAN.md` §S10 for the back-fill flow description
4. Run `/deep-plan` with topic: **"Piece 3 structural fix + scope
   expansion + re-run"**
5. At plan completion, re-run S10 against the fixed foundation
6. Then proceed to S11 / S12 / S13 / Piece 5

## Related artifacts NOT from S10 (committed in this same commit)

- `.research/migration-skill/findings/` — 30 deep-research findings
  files from an earlier /deep-research run on the migration-skill topic.
  Were untracked; committing as WIP checkpoint so they survive context
  clear.
