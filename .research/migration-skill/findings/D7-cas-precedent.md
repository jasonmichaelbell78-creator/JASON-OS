# FINDINGS — D7-cas-precedent

**Agent:** D7-cas-precedent (Phase 1 D-agent, /migration deep-research)
**Sub-question:** SQ-D7a — Is CAS a usable decomposition precedent for the
candidate `/migration` split (scan / reshape / prove, or repo-profile / export)?
**Depth:** L1 (file:line for every structural claim)
**Date:** 2026-04-21
**Status:** FINAL

---

## Summary

CAS is a **direct, demonstrated precedent** for the kind of decomposition
BRAINSTORM §5 Q7 contemplates for `/migration`. It answers the structural
question — yes, one skill family can be cleanly fanned out into router +
handlers + postprocessors — with a real, working, audited shape. But it also
answers three second-order questions the brainstorm doesn't yet ask:

1. **Decomposition pays back only when you front-load the shared contract.**
   CAS works because `shared/CONVENTIONS.md`, `_shared/SKILL_STANDARDS.md`,
   `_shared/TAG_SUGGESTION.md`, `_shared/SELF_AUDIT_PATTERN.md`, and
   `schemas/analysis-schema.ts` exist *before* the handlers. Without that
   scaffolding, 4 handlers drift in 4 directions.
2. **Duplication inside the substrate is the real tax.** The two pain points
   from D6-cas-* (DDL duplicated between `rebuild-index.js:37-112` and
   `update-index.js:291-350`; byte-identical DB aliases `content-analysis.db`
   + `knowledge.sqlite`, MD5 `d098a358…c84e` both files) are not about the
   skill boundary — they are about the **shared-lib layer being under-
   factored**. Any decomposed skill family inherits this risk.
3. **Router-handler-postprocessor works; router → state-writer → verifier is
   a closer analogue for `/migration`.** Where CAS's handlers do bulk
   computation (analyze a source) and postprocessors synthesize across them,
   `/migration`'s moving parts are sequential (scan → reshape → prove), so
   the *shape* adopts but the *semantics* shift: each "handler" is a phase,
   not a peer.

**Works-count: 7.** **Breaks-count: 5.** CAS is the pattern to copy; its
drift and duplication are the mistakes to pre-empt.

---

## CAS decomposition shape (router-handler-postprocessor mapped)

**Router** — `/analyze`
(`.claude/skills/analyze/SKILL.md:24-40`, Router Flow at L195-230).
Type detection (§Type Detection table L179-193) → dispatch via `Skill` tool
(`analyze/SKILL.md:117,213-214`) → post-handler index update + routing-log
append (`analyze/SKILL.md:219-230`). **Router is thin** — 19039 bytes total
SKILL.md, compared to 25556 bytes for `repo-analysis/SKILL.md`.

**Handlers** — `/repo-analysis`, `/website-analysis`, `/document-analysis`,
`/media-analysis`. Four peer skills, same 9-phase scaffold
(CONVENTIONS.md:248-251):
`VALIDATE → PHASE 0 (Quick Scan) → GATE → PHASE 1 (Content Load) →
PHASE 2 (Dimensions) → PHASE 2b (Deep Read) → PHASE 4 (Creator View) →
PHASE 4b (Content Eval) → PHASE 5 (Engineer View) → PHASE 6 (Value Map) →
PHASE 6c (Tag Suggestion) → PHASE 6b (Coverage Audit) → SELF-AUDIT → ROUTING`.
Same state-file convention (`.claude/state/<handler>.<slug>.state.json`,
CONVENTIONS.md:401), same Zod contract
(CONVENTIONS.md:166-187 → `scripts/lib/analysis-schema.js`), same tail
pipeline (CONVENTIONS.md:409-446). Deviations MUST be documented as bugs
(CONVENTIONS.md:255-257).

**Postprocessors** — `/synthesize` + `/recall`.
- `/synthesize`: **cross-source interpreter.** Read-only on handler outputs,
  write-only to `.research/analysis/synthesis/`
  (`synthesize/SKILL.md:20-23`). 8-phase pipeline
  (`synthesize/SKILL.md:157-170`: `MENU → PRE-FLIGHT → PHASE 1 Load →
  PHASE 2 Synthesize → PHASE 2.5 Convergence → PHASE 3 Canonicalize →
  PHASE 4 Verify → PHASE 4.5 Convergence → PHASE 5 Present → RETRO →
  PHASE 6 Opportunity`). Invokes `/convergence-loop` mandatorily at 2.5
  and 4.5 (`synthesize/SKILL.md:246,289`).
- `/recall`: **query primitive.** SQLite/FTS5 over
  `.research/content-analysis.db` + tag vocabulary
  (`recall/SKILL.md:111-119`).

**Shared substrate** — three directories with clear ownership:
- `shared/CONVENTIONS.md` — canonical rules for the analyze/synthesize family
  (CONVENTIONS.md:1-13, 587-595: "Conventions in this file override any
  conflicting statement in individual skill files").
- `_shared/` — cross-cutting patterns that aren't CAS-only:
  `SKILL_STANDARDS.md` (every skill), `SELF_AUDIT_PATTERN.md`
  (Standard+ skills, `_shared/SELF_AUDIT_PATTERN.md:1-13`),
  `TAG_SUGGESTION.md` (CAS handler tail, `_shared/TAG_SUGGESTION.md:1-11`),
  `AUDIT_TEMPLATE.md`, plus `_shared/ecosystem-audit/*` (6 files).
- `schemas/` — type-only Zod sources: `analysis-schema.ts` (L31-96 defines
  `analysisSchema`), `findings-schema.ts`, `validate-artifact.ts`.

**Invocation contract** (verbatim, `analyze/SKILL.md:107-123`):
```json
{
  "target": "<raw input the user provided>",
  "auto_detected_type": "repo|website|document|media",
  "flags": { "depth": "...", "type": "..." }
}
```
Handler treats the call as if invoked directly; `auto_detected_type` is
*informational*. Router owns post-handler index update (1.0→1.1 lesson,
`analyze/SKILL.md:294-295`).

---

## What works (7 adoption-worthy patterns)

1. **Thin router, fat handlers.** `analyze/SKILL.md:25-26` — "MUST keep the
   router thin; all analysis logic lives in handler skills". Detection +
   dispatch + post-handler housekeeping is the router's whole job. Handlers
   carry the domain weight. This **scales the family** without coupling
   changes to the router.

2. **Handoff contract is data, not prose.** `analyze/SKILL.md:107-123`
   specifies a JSON payload; `document-analysis/SKILL.md:18-22` mirrors it
   back: "Handoff contract: the router passes `{target,
   auto_detected_type: "document"}` as if the skill were invoked directly."
   Handler acknowledgment in its own header **prevents router-vs-handler
   drift** at the call site.

3. **Write-to-disk-first as the cross-skill invariant.**
   CONVENTIONS.md:29-34 — "Every phase MUST write its output file before
   proceeding to the next phase. Orchestrators verify file existence, not
   return values." Survives compaction; survives hook-rejected inline prose;
   lets the router/postprocessor audit *files*, not trust return values.

4. **Per-skill state files with a canonical path.**
   `.claude/state/<handler>.<slug>.state.json` (CONVENTIONS.md:401). Enables
   `--resume` (`synthesize/SKILL.md:78,119`), prior-feedback replay
   (CONVENTIONS.md:526-581), crash recovery. D6-cas-integration §2 shows
   this dir already has 30+ live state files — the pattern scales.

5. **Shared schema as executable contract.** Handlers MUST validate
   `analysis.json` against `scripts/lib/analysis-schema.js` before writing
   (CONVENTIONS.md:168-187). The `schemas/` dir (`schemas/analysis-schema.ts:31-96`)
   is the source of truth; REFERENCE.md docs chase it, not vice versa
   (L2: "Canonical source of truth — REFERENCE.md must match this, not vice
   versa"). Decomposition without a schema contract is just copy-paste.

6. **Shared tail pipeline (Section 16).** CONVENTIONS.md:409-446 — "Pipeline
   Tail Contract (MUST — not skippable)": Tag Suggestion → Retro → Routing
   Menu → State File. Every handler runs the same closing sequence. **User
   decisions enter at a consistent point** across 4 disparate source types.

7. **Shared self-audit spine.** `_shared/SELF_AUDIT_PATTERN.md:37-50`
   mandates `scripts/skills/<skill-name>/self-audit.js` invoked via
   `node ... --target=<id> [--json]` with exit codes 0/1/2. Dim-coverage
   table (`_shared/SELF_AUDIT_PATTERN.md:111-127`) standardizes what each
   dimension means. Every CAS handler delegates to
   `scripts/cas/self-audit.js` (`_shared/SELF_AUDIT_PATTERN.md:48-49`:
   "CAS handlers → `scripts/cas/self-audit.js`"). **One audit script,
   N skills.**

---

## What breaks (5 anti-patterns surfaced by D6-cas-*)

1. **DDL duplicated across scripts.** `rebuild-index.js:37-112` and
   `update-index.js:291-350` both contain `CREATE TABLE IF NOT EXISTS`
   for all 5 tables (sources, extractions, tags, source_tags,
   extraction_tags). Diverging schema migrations would silently split
   the index. **Root cause:** no shared `createSchema()` module in
   `scripts/lib/`. CAS-specific in cause, general in pattern — any
   decomposed family with a shared data substrate **needs a DDL
   module, not per-caller DDL**.

2. **Byte-identical DB aliases.** `.research/content-analysis.db` and
   `.research/knowledge.sqlite` both 409600 bytes, both MD5
   `d098a358f3e75c978e0417e759e3c84e` (verified this session). But
   mtimes differ (04-17 vs 04-21) and both have live `-shm`/`-wal`.
   This is **stale alias of the real DB** — some code path (probably
   a legacy path or an operator convenience copy) is opening the wrong
   file. D6-cas-integration flagged this; it confirms the concern is
   real. **Generalization:** when a family evolves, the path constants
   drift, and the old paths linger unless pruned by a schema-version
   aware cleanup.

3. **Home-context coupling is implicit, not declared.** 4 handlers
   independently load the same 5 files (CONVENTIONS.md:120-129
   consolidates the list, but each handler's SKILL.md also declares
   it: `repo-analysis/SKILL.md:279-280`, `document-analysis/SKILL.md:61-63`,
   `media-analysis/SKILL.md:68-69`). If the home-context schema
   changes, 4 handlers + `/synthesize` + CONVENTIONS.md all need
   updating. **No single enforcement point** — a `loadHomeContext()`
   lib helper would fix this; none exists.

4. **SoNash-specific hardcoding leaks into handler logic.**
   `repo-analysis/SKILL.md:68`: "If target matches
   `jasonmichaelbell78-creator/sonash-v0`, redirect to
   `/audit-comprehensive`." The home-repo string is a magic literal,
   not config. D6-cas-integration §3 flagged this as a port blocker.
   **Generalization:** decomposed skills tend to accumulate identity
   assumptions in the handler code — they should live in a single
   config file (`.research/home-context.json` per
   `synthesize/SKILL.md:198-201`).

5. **Router-as-metrics-sink mixes concerns.**
   `analyze/SKILL.md:39`: "SHOULD log routing decisions to
   `.claude/state/analyze-routing-log.jsonl`". Plus the invocation-
   tracking calls in every handler (`recall/SKILL.md:234`,
   `repo-analysis/SKILL.md:530-537`) — SoNash-specific metrics
   plumbing braided into handler skills. When the metrics pipeline
   changes (JASON-OS defers it per CLAUDE.md §7 session-end), 6
   skills need touch-ups. **Metrics should be a hook, not a handler
   step.**

---

## Lessons for /migration

1. **Adopt the router-handler-postprocessor shape, but re-label for phase
   semantics.** `/migration` is temporally ordered (scan → reshape → prove),
   where CAS handlers are peers. Rename: `/migration` = orchestrator,
   sub-skills = *phases*, not *handlers*. An orchestrator-phase-verifier
   shape reads closer to CAS's analyze-handler-synthesize arc (synthesize
   runs *after* handlers across the substrate; a hypothetical
   `/migration-prove` runs *after* reshape on the migrated artifact set).

2. **Ship the shared substrate first.** Before `/migration-scan`, produce:
   - `shared/MIGRATION_CONVENTIONS.md` (the CONVENTIONS.md analogue)
   - `schemas/migration-schema.ts` (Zod source of truth for the
     migration manifest, matching CAS's `analysis-schema.ts` pattern)
   - `_shared/SELF_AUDIT_PATTERN.md` reuse (no new audit shape needed;
     JASON-OS should port the existing one)
   - A `scripts/lib/migration-io.js` module analogous to `safe-cas-io.js`
     that owns **all path constants and DDL** for the migration
     substrate, so sub-skills never inline them.

3. **Write-to-disk-first + per-sub-skill state files are load-bearing.**
   If /migration decomposes, each phase's state file at
   `.claude/state/migration-<phase>.<project-slug>.state.json` is the only
   way the next phase trusts the previous one ran. Mirrors
   CONVENTIONS.md:29-34.

4. **Keep the top-level /migration "handoff contract" as JSON + handler
   acknowledgment.** Copy `analyze/SKILL.md:107-123` verbatim as a
   template. Put an acknowledgment line in every sub-skill header (like
   `document-analysis/SKILL.md:18-22`). This is 3 lines of prose that
   prevents router-vs-sub-skill drift for the life of the family.

5. **Pre-empt the 5 CAS breaks with one change each:**
   - *(DDL duplication)* → `scripts/lib/migration-schema-ddl.js` — single
     `createSchema()` called by both write-path and rebuild-path.
   - *(DB aliases)* → enforce a single canonical path constant in a
     lib module; sub-skills import, never re-derive.
   - *(Implicit home-context)* → ship a `loadMigrationContext()` helper
     that reads `.research/home-context.json` (or whatever JASON-OS
     settles on) as the **only** source of project identity.
   - *(Hardcoded identity)* → never inline the project slug in a
     sub-skill; config-only.
   - *(Metrics in skill)* → if metrics are needed, add a
     `PostToolUse` hook that watches state-file writes. Don't braid
     metrics into phase code.

---

## Boundary heuristic for skill vs agent-within-skill

**One-sentence heuristic:** Promote a worker to a peer *skill* when it (a)
has its own user-facing invocation contract, (b) owns a distinct artifact
set on disk, and (c) can be re-run independently on a prior state;
otherwise keep it as an *agent-within-skill* (or a phase) that shares its
parent's state file and artifacts.

**Applied to CAS:** `/repo-analysis` et al. pass all three — users invoke
them directly (`document-analysis/SKILL.md:87-92`), own
`.research/analysis/<slug>/` as a complete artifact bundle
(CONVENTIONS.md:190-241), and re-run idempotently
(`analyze/SKILL.md:255-256`). `/synthesize` passes too (invokable,
owns `.research/analysis/synthesis/`, re-runnable with history archive
per CONVENTIONS.md:482-488). The dimension-wave sub-agents *inside*
`/repo-analysis` Phase 2 fail (c) — they have no standalone meaning —
so they stay agents, not skills (`analyze/SKILL.md:267-269`).

**Applied to /migration (tentative):**
- `/migration-scan` (repo profiling) — passes (a), (b), (c). Skill.
- `/migration-reshape` (apply transformations) — passes (a), (b);
  passes (c) only if reshapes are atomic + journaled. Probably skill
  with a mandatory scan-result input.
- `/migration-prove` (validation of reshaped state) — passes (a),
  (b), (c). Skill.
- *Per-file transformer agents* (if used inside reshape) — fails (a)
  and (c). Stay as agents within `/migration-reshape`.
- *Dependency graph builder* (inside scan) — fails (a). Agent.

**Contrast with /repo-profile + /migration-export:** that split treats
profile and export as separate skills, but profile-output only consumes
export-input in the /migration context. Both pass (a) and (b), but (c)
is awkward — re-running /migration-export without a fresh /repo-profile
is a latent correctness bug. The scan/reshape/prove split is cleaner
under this heuristic.

---

## Sources

### CAS skill SKILL.md files
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\analyze\SKILL.md:24-40,107-123,179-230,267-269,255-256,294-295`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\repo-analysis\SKILL.md:17-22,55-78,117-137,279-280,530-537`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\document-analysis\SKILL.md:18-22,61-63,87-92,110-120,124-140`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\media-analysis\SKILL.md:68-69`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\synthesize\SKILL.md:20-23,78,119,157-170,198-201,246,289,482-488`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\recall\SKILL.md:111-119,234`

### Shared substrate
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\shared\CONVENTIONS.md:1-13,29-34,120-129,168-187,190-241,248-257,401,409-446,482-488,526-581,587-595`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\SKILL_STANDARDS.md:1-150`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\SELF_AUDIT_PATTERN.md:1-332` (esp. 37-50, 111-127)
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\_shared\TAG_SUGGESTION.md:1-119`
- `C:\Users\jbell\.local\bin\sonash-v0\.claude\skills\schemas\analysis-schema.ts:1-98`

### Scripts (duplication + aliasing evidence)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\rebuild-index.js:14-112` (DDL block L37-112)
- `C:\Users\jbell\.local\bin\sonash-v0\scripts\cas\update-index.js:14-80,291-350` (DDL block duplicates rebuild's)
- `C:\Users\jbell\.local\bin\sonash-v0\.research\content-analysis.db` (409600 B, md5 `d098a358f3e75c978e0417e759e3c84e`)
- `C:\Users\jbell\.local\bin\sonash-v0\.research\knowledge.sqlite` (409600 B, identical md5)

### Cross-reference
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\findings\D6-cas-integration.md`
  — Ported 5-layer DAG (L336-396) informs the "ship shared substrate first"
  recommendation; auth/hooks/paths inventory in §1-§6 is the surface
  /migration must not duplicate when decomposing.

### BRAINSTORM refs
- `C:\Users\jbell\.local\bin\JASON-OS\.research\migration-skill\BRAINSTORM.md`
  §5 Q7 (decomposition candidates), §2 (seven-phase arc)
- `C:\Users\jbell\.local\bin\JASON-OS\CLAUDE.md` §1 (stack-agnostic),
  §7 (metrics-pipeline deferred — supports break #5 reasoning)

---

**End findings** — D7-cas-precedent L1 complete.
