# DIAGNOSIS — cross-repo-movement-reframe

**Date:** 2026-04-24 (Session 20)
**Deep-plan phase:** 0 — context gathering
**Status:** DRAFT v2 — awaiting user confirmation before Phase 1 discovery begins
**Produced by:** `/deep-plan cross-repo-movement-reframe`
**Skill version:** deep-plan v3.4 (authority-split mandate, Session 20)
**Supersedes:** DRAFT v1 of this file (which conflated user-locked decisions
with research recommendations — see `tenet_research_recommends_user_decides.md`)

---

## What this plan is

One planning deliverable that turns the Session 18 brainstorm (architecture
direction locked) and the Session 19 research (98 verified claims across four
strands) into an executable implementation plan for JASON-OS's cross-repo
movement system.

The system being planned:

- **One user-facing orchestrator skill** (a conversational dashboard; name
  TBD in discovery).
- **Four companion skills**, shipped in sequence: `/context-sync` (local
  context across the user's machines — the bootstrap scaffold, ships first),
  `/port` (name TBD — one-time ports between owned repos), `/sync-back`
  (reconciliation after a port has evolved), `/extract` (inbound from
  unowned repos via bare-clone, shim-blocked on CAS port).
- **Four shared data structures** that live together in `.claude/state/`:
  ledger, `/context-sync` drift record, target-process-profile cache,
  comprehension / recipe cache.
- **Shared internals** reusing existing infrastructure without modification.

The plan also formally retires five prior planning artifacts (see "Plans
being superseded" below).

---

## Upstream inputs (authoritative; do not re-derive)

| Input | Path | Role |
|---|---|---|
| Brainstorm | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | Direction D' locked: orchestrator + companions |
| Landscape synthesis | `.research/cross-repo-movement-reframe/PHASE_0_LANDSCAPE.md` | Prior-artifact synthesis (11 sources) |
| Research (final) | `.research/cross-repo-movement-reframe/RESEARCH_OUTPUT.md` v2.0 | 98 claims, 107 sources, HIGH on core architecture |
| Claims DB | `.research/cross-repo-movement-reframe/claims.jsonl` | 98 claims with confidence tags |
| Sources DB | `.research/cross-repo-movement-reframe/sources.jsonl` | 107 citations |
| Contrarian | `.research/cross-repo-movement-reframe/challenges/contrarian-deep-research.md` | 8 challenges; 3 planning-musts |
| OTB | `.research/cross-repo-movement-reframe/challenges/otb-deep-research.md` | 8 alternatives; 3 worth planning-time glance |
| Disputes | `.research/cross-repo-movement-reframe/findings/dispute-resolutions.md` | 5 contradictions resolved with dissent records |
| Per-strand findings | `.research/cross-repo-movement-reframe/findings/D1–D11.md` + `V1–V2.md` + `G1–G2.md` | Source material |

**Verification chain:** The research's V1 + V2 phases filesystem-verified 62
claims. Every claim reused below that asserts codebase state carries a
filesystem-VERIFIED verdict, unless flagged.

---

## ROADMAP alignment

No `ROADMAP.md` exists in JASON-OS v0.1 (explicitly deferred per
`session-begin` skill). The de-facto roadmap is `SESSION_CONTEXT.md`'s
"Next Session Goals," which names this plan as Step 2. **Aligned.**

---

## Existing codebase surfaces this plan builds on

Confirmed by direct filesystem survey (Explore agent, 2026-04-24):

**Skills** (14 present) — relevant neighbors: `/brainstorm`, `/deep-research`,
`/deep-plan`, `/convergence-loop`, `/checkpoint`, `/session-begin`,
`/session-end`, `/skill-creator`, `/skill-audit`, `/label-audit`,
`/pre-commit-fixer`, `/pr-review`, `/todo`, `/add-debt`. None overlap with
the four movement companions; name collisions are clear.

**Shared library** (`scripts/lib/`, 8 files) — the three CLAUDE.md §2
boundary helpers all exist: `safe-fs.js` (including `safeAppendFileSync`,
`withLock` with 5s timeout at line 372, stale-lock PID-liveness broker at
lines 442–456, `DEFAULT_READ_MAX_BYTES = 2 MiB` at line 265,
`streamLinesSync` for ceiling-bypass reads), `sanitize-error.cjs`,
`security-helpers.js`. Also present: `parse-jsonl-line.js`, `read-jsonl.js`,
`todos-mutations.js`, `resolve-exec.js`.

**State directory** (`.claude/state/`) — 4 existing `.jsonl` files confirm
the house style for lightweight state: `commit-log.jsonl`,
`commit-failures.jsonl`, `hook-warnings-log.jsonl`,
`label-promote-audit.jsonl`.

**Sync surface** (`.claude/sync/`) — schema contract v1.3 at
`.claude/sync/schema/` including `enums.json` with the five-value scope-tag
enum (universal, user, project, machine, ephemeral). Piece 3 labeling
infrastructure at `.claude/sync/label/`, including architecture-fix commit
`1b2afb4` (generic `applyArbitration` + helpers — survives unchanged).

**Hooks** — live: `SessionStart` (`check-mcp-servers.js` +
`compact-restore.js`), `PreToolUse Bash` (`block-push-to-main.js`),
`PreToolUse Read` (`large-file-gate.js`), `PreToolUse Write/Edit`
(`settings-guardian.js`), `PreCompact` (`pre-compaction-save.js`),
`UserPromptSubmit` (`plain-language-reminder.js`), `PostToolUse Bash`
(`commit-tracker.js`).

**Husky** — `.husky/pre-commit` (gitleaks secrets scan),
`.husky/pre-push`, `.husky/_shared.sh`.

**Workflows** (`.github/workflows/`, 7 files) — `codeql.yml`,
`semgrep.yml`, `sonarcloud.yml`, `dependency-review.yml`, `scorecard.yml`,
`cleanup-branches.yml`, `auto-merge-dependabot.yml`.

**Agents** (8 under `.claude/agents/`) — all deep-research agents + dispute
resolver.

**Canonical memory** (`.claude/canonical-memory/`) — `MEMORY.md` + 7
`feedback_*.md` + 3 `user_*.md` + `session-end-learnings.md`. Primary
input set for `/context-sync`.

---

## Codebase surfaces this plan creates (greenfield)

Confirmed NOT present (2026-04-24):

- **`.claude/state/ledger.jsonl`** — created on first `/port` run.
- **`.claude/state/context-sync-state.jsonl`** — created on first
  `/context-sync` run.
- **`.claude/state/profiles/`** — directory does not exist.
- **`.claude/state/comprehension-cache.jsonl`** — does not exist.
- **Any file matching `*ledger*`, `*lineage*`, `*port*.js`, `*migrate*.js`,
  `*context-sync*`, `*profile-cache*`** — nothing in the tree (excluding
  `.research/`, `.planning/`, `node_modules/`).
- **Orchestrator skill** — no movement-related SKILL.md.
- **`/context-sync`, `/port`, `/sync-back`, `/extract`** — none present.
- **`~/.claude/keybindings.json`** — not present on this machine.

---

## Plans being superseded

Five planning artifacts to be formally deprecated in the new plan's
closeout phase (DEPRECATED banners + pointer + archival):

| Plan | Path |
|---|---|
| sync-mechanism | `.research/sync-mechanism/` (BRAINSTORM + FIRST_PASS_ASSESSMENT + piece-1a/1b) |
| schema-design (Piece 2) | `.planning/piece-2-schema-design/` |
| labeling-mechanism parent (Piece 3) | `.planning/piece-3-labeling-mechanism/` |
| labeling-mechanism structural-fix | `.planning/piece-3-labeling-mechanism/structural-fix/` |
| migration-skill | `.research/migration-skill/` |

**NOT superseded** (bootstrap-level, stand unchanged): `.planning/jason-os/`,
`.planning/jason-os-mvp/`. Architecture-fix commit `1b2afb4` survives.

---

## Reframe check

The request matches the user's stated model ("behind-the-scenes agent who
guides me when I need guiding and follows my lead when I want to lead").
The Session 18 brainstorm already resolved the earlier reframe (from
sync-mechanism as starting framing to cross-repo movement as starting
framing). No further reframe indicated.

---

## Authority split of prior findings

Per the `tenet_research_recommends_user_decides.md` tenet that landed
Session 20, prior findings are split into four buckets with explicit
counts. Buckets 3 and 4 feed Phase 1 discovery; buckets 1 and 2 do not.

### Bucket 1 — User-locked (does not re-enter discovery) — 11 items

These are constraints the user stated directly in BRAINSTORM or CLAUDE.md,
or they reflect codebase state that already embodies a prior user decision.

1. **Direction D'** — one user-facing orchestrator skill plus four
   companion skills (user Phase 3 convergence in BRAINSTORM.md).
2. **12-field ledger hard cap at v1** (BRAINSTORM pre-plan deliverable
   #1 — user-stated as a constraint to prevent schema sprawl; cap stands
   whether the specific 12 fields are the right 12).
3. **Scope-tag enum reused unchanged** — the five values (universal,
   user, project, machine, ephemeral) already live in
   `.claude/sync/schema/enums.json` from Piece 2. Not re-extended.
4. **`/context-sync` ships first as the bootstrap scaffold** (BRAINSTORM
   pre-plan deliverable #4; this is the mechanism that resolves the
   bootstrap paradox).
5. **Anti-goal: no hooks in v1** — conversational + direct invocation
   only (user-named anti-goal).
6. **Anti-goal: no `--flag`-driven CLI where conversation can carry
   meaning** (user-named).
7. **Anti-goal: no writes into unowned repos; reads only** (user-named).
8. **Anti-goal: no fire-and-forget state changes; all surfaced data
   requires acknowledgment** (user-named + CLAUDE.md §4 rule 6).
9. **Anti-goal: no deriving a large schema from evidence at start** —
   the G.1 lesson, user-named anti-goal.
10. **Meta-principle: "thoroughness balanced with not-over-engineering"**
    (user-quoted verbatim from Session 18 — design force with the same
    weight as the anti-goals).
11. **Mandatory use of `safe-fs.js` + `sanitize-error.cjs` +
    `security-helpers.js`** at all file-I/O boundaries (CLAUDE.md §2).

### Bucket 2 — Filesystem facts (observed, not decided) — 13 items

These are observations about current codebase state. They constrain later
choices but aren't themselves choices. Confirmed via V1/V2 research
verification or the Session 20 Explore survey.

1. Four existing `.jsonl` files in `.claude/state/` confirm append-only
   JSONL is the house style for state.
2. `safe-fs.js` exposes `safeAppendFileSync` and `withLock`; lock timeout
   is 5 seconds (line 372); stale-lock PID-liveness broker at lines
   442–456; `DEFAULT_READ_MAX_BYTES = 2 MiB` at line 265;
   `streamLinesSync` bypasses the ceiling for streaming reads.
3. 14 existing skills live at `.claude/skills/*/SKILL.md`; none collide
   with orchestrator/`/port`/`/sync-back`/`/extract`/`/context-sync`.
4. `.claude/canonical-memory/` contains MEMORY.md + 7 `feedback_*.md` + 3
   `user_*.md` + `session-end-learnings.md` — the primary input set for
   `/context-sync`'s user-scoped memory category.
5. Zero files currently use `type: tenet` in frontmatter; current tenet
   files are identified only by `t[N]_` filename prefix.
6. `~/.claude.json` is the current canonical MCP config file, NOT
   `~/.claude/mcp.json` (gap-pursuit verified).
7. `~/.claude/statusline/config.local.toml` contains a confirmed live
   API key.
8. The 18-sync-unit inventory was derived from direct filesystem walk
   across ~12 category implementations (rows 1–3 are canonical-memory
   subtypes sharing one directory glob).
9. `commit-log.jsonl` records average ~586 bytes/record (measured by
   V1); ledger records with shorter paths will likely be smaller.
10. `.claude/state/profiles/` does not yet exist.
11. No file matching `*ledger*`, `*lineage*`, `*port*.js`, `*migrate*.js`,
    `*context-sync*`, `*profile-cache*` exists anywhere in the tree.
12. `.husky/pre-commit` in JASON-OS runs gitleaks only (foundation-scoped
    per bootstrap).
13. Architecture-fix commit `1b2afb4` is on `main` and carries generic
    `applyArbitration`, `apply-arbitration.js`, `aggregate-findings.js`,
    `synthesize-findings.js`, `plain-language-reminder.js` hook.

### Bucket 3 — Research-recommended defaults (become Phase 1 questions) — ~30 items

Every design-specific recommendation the research produced. These enter
Phase 1 discovery as questions of the form **"research recommends X because
Y; weakness is Z; accept default, override, or ask?"** Accepting the
default is a decision, not a skip.

Grouped by strand so discovery batches can target them.

**Ledger defaults (enter Phase 1 Batch 3):**

- Which exact 12 fields comprise the v1 ledger (research proposed
  `record_id`, `verb`, `source_project`, `source_path`, `dest_project`,
  `dest_path`, `source_version`, `moved_at`, `unit_type`, `scope_tag`,
  `verdict`, `ledger_schema_version`).
- Append-only event log, not mutable records (research-recommended based
  on 4 existing jsonl files + G.1 lesson + git-subrepo negative example).
- Write-last rollback rule (ledger append is LAST write of every
  movement op).
- Forward-pointer edge model + source-hash recomputed on demand at v1
  (rather than storing `source_content_hash`).
- Ledger physical location: `.claude/state/ledger.jsonl`, gitignored.
- Locking via `safeAppendFileSync` + `withLock` at 5s.
- `source_status` and `source_content_hash` as v1.1 candidates with
  explicit promotion criteria.

**Drift record defaults (enter Phase 1 Batch 2):**

- Separate file at `.claude/state/context-sync-state.jsonl` (not
  unified with ledger).
- Exact 7 fields: `path`, `category`, `src_hash`, `dst_hash`,
  `source_wins`, `machine_exclude`, `synced_at`.
- Five drift states: NEW, CLEAN, SOURCE-DRIFTED, DEST-DRIFTED,
  BOTH-DRIFTED.
- Four normalization rules: CRLF→LF unconditional, RFC 8785 JCS for
  JSON key ordering, volatile-frontmatter-field strip on `.md`
  (`last-modified`, `synced_at`, `last-touched`, `updated_at`),
  comment-only changes treated as semantic.
- Ephemeral-machine guard as two lines: `CI=true || CODESPACES=true →
  exit 0`.
- Machine-excluded-at-registration flag for known machine-bound files
  (canonical example: `config.local.toml` with the live API key).
- Sidecar file pattern for `settings.local.json` sub-file granularity.
- Tenet identification by filename prefix `t[N]_` (not by `type: tenet`
  frontmatter).

**Profile defaults (enter Phase 1 Batch 4):**

- 8 top-level fields: `schema_version`, `repo_name`, `repo_remote_url`,
  `discovered_at`, `discovered_at_sha`, `discovery_source_map`, `gates`,
  `shapes`.
- 6-field gate record: `gate_id`, `trigger`, `required_by`,
  `action_description`, `companion_directive`, `confidence`.
- 3-field shape block per unit type: `directory`, `companion_files`,
  `naming_scheme`.
- Location: `.claude/state/profiles/<repo-name>.json` (owned),
  `.claude/state/profiles/unowned/<slug>.json` (unowned).
- Unowned via `git clone --bare --no-local` + `git show HEAD:<path>`
  reads; no working tree.
- Extend `safe-fs.isSafeToWrite` with `forbiddenRoots` using
  `/^\.\.(?:[\\/]|$)/` regex (defense-in-depth).
- Re-discovery triggered by SHA mismatch, not time.
- Unowned profiles carry `discovery_mode: "unowned-static"` and
  `probe_eligible: false`.

**Comprehension-cache defaults (enter Phase 1 Batch 5):**

- 4-field cache key: `unit_type:source_repo:target_repo:profile_slice_hash`.
- Value carries `verdict` + `content_hash_at_last_verdict` + `confidence`.
- At v1, `profile_slice_hash` hashes the FULL profile (circular-dependency
  resolution — Planning-must 3).
- Key does NOT carry content hash; hash is in the value as a staleness
  check.

**Cross-cutting defaults:**

- Bootstrap ordering: `/context-sync` drift record + mechanism FIRST, then
  ledger schema, then profile discovery, then comprehension cache;
  shared schema-versioning policy written after step 2.
- Per-record `schema_version` stamping on all four files; EVOLUTION.md §8
  mirror rule does NOT apply (each file is single-canonical-location).
- Scope-tag enum reused unchanged across ledger, drift record, profile.

### Bucket 4 — Research speculations (open discovery questions) — 13+ items

These are items the research itself flagged as gaps, estimates, or
unresolved. Research may offer a starting point, but the planning decision
is unconstrained.

1. Path normalization on Windows (backslash vs forward-slash at write
   time — V1 surfaced, no research answer).
2. `unit_type` enum final values (file, family, memory, context-artifact,
   concept — or different?).
3. `verdict` enum final values (copy-as-is, sanitize, reshape, rewrite,
   greenfield-clone, skip, blocked, observe-only — ratify or prune?).
4. `companion_files` population algorithm — heuristic scan with
   `discovery_gap` fallback is research-recommended default, but the
   heuristic details are unspecified (Dispute 5).
5. `memory_type` → scope-tag mapping table (natural classification
   mechanism; mapping needs to be defined once).
6. CLAUDE.md "tweak block" identification convention (sentinel comment?
   section-header naming? not yet defined).
7. Ephemeral-machine guard implementation location (skill-internal vs
   shared helper in `scripts/lib/`).
8. Orchestrator-to-companion routing mechanism (static list vs
   `.claude/skills/` scan with marker frontmatter).
9. "Check what's out of sync" UX on a sparse or empty ledger (first-run
   behavior).
10. Per-category vs across-the-board invocation for `/context-sync`
    (single "sync everything" vs fine-grain).
11. Calibration parameters explicitly flagged ESTIMATED — 0.8 fast-path
    suppression threshold, >60% cache hit rate target,
    2,600–4,000+ sharding threshold — and the metric-tagging discipline
    for how these live in the plan (MEASURED / DERIVED / ESTIMATED per
    Challenge 6).
12. The three **planning-musts** the Session 19 contrarian surfaced
    (discovery must resolve all three): (a) field-budget conflict
    between the 12-field cap and proposed `source_status` /
    `source_content_hash` fields — research recommends 12 stays, both
    demote to v1.1 candidates, but user must ratify; (b) does
    `ledger.jsonl` travel across machines as category 19 in
    `/context-sync`'s inventory? Research recommends YES with
    `source_wins: true` and `machine_exclude: false`; user must
    ratify; (c) `profile_slice_hash` hashes full profile at v1 —
    research resolved this via dispute; plan must lock it explicitly.
13. The three **OTB alternatives** that deserve a planning-time glance
    (adopt / reject / defer with rationale): (a) per-file frontmatter
    lineage as a ledger complement; (b) GitHub API as optional fast-path
    for unowned repo profile discovery; (c) `port_recipe.md` adjacent to
    portable units as understanding-layer short-circuit.
14. Companion naming (`/port` vs `/migrate-unit`; `/sync-back` folded
    into `/port` with mode, or separate; `/extract` vs `/research-port`;
    orchestrator skill name).
15. Decision register contents (pre-plan deliverable #3 — folded into
    the new plan as Phase 0, or produced as a short dedicated step first).

---

## Bootstrap ordering constraint

Per Challenge 8 (Session 19 contrarian), implementation within the plan
must follow:

1. `/context-sync` drift record + mechanism FIRST. No ledger dependency.
2. Ledger schema second. After Planning-must 1 resolves field budget.
3. Profile discovery third. Can reference ledger fields as needed.
4. Comprehension cache last. Ships empty (no recipe library yet);
   profile_slice_hash hashes full profile per Planning-must 3.
5. Shared schema-versioning policy written AFTER step 2 (not as a
   pre-step — knowing all four schemas requires at least two to be
   stable).

This is a research recommendation (Bucket 3) with enough structural force
that it shapes the plan's phase structure, not just a single decision.
Discovery will re-ask it as a question with weakness ("weakness: we could
write the versioning policy up-front after step 1 using ledger's planned
schema").

---

## Phase 1 discovery preview (batches)

Discovery walks eight themed batches, pulling from Buckets 3 and 4 above.
Each batch presents questions conversationally with research-default +
weakness per question. Floor ~15 questions, no ceiling.

1. **Orchestrator shape** (naming, routing mechanism, two-mode behavior,
   dashboard surface, CI-entry guard) — mostly Bucket 4.
2. **`/context-sync` specifics** — ratify drift-record shape, tenet
   identification, memory-type mapping, sidecar pattern, ephemeral guard
   location, per-category vs across-the-board — Buckets 3 + 4.
3. **Ledger design details** — the three planning-musts + specific
   12 fields + append-only + write-last + edge model + path
   normalization + metric tagging — Buckets 3 + 4.
4. **Profile discovery** — owned/unowned split, companion_files
   algorithm, 3-field shape block specifics, unowned profile staleness
   trigger — Buckets 3 + 4.
5. **Comprehension cache + recipe fast-path** — key shape ratification,
   Planning-must 3 lock, calibration-parameter discipline, fast-path
   priority order with OTB 3 hybrid option — Buckets 3 + 4.
6. **Decision register** — fold into new plan as Phase 0 vs separate
   pass; disposition convention (survives / superseded / discarded).
7. **Closeout mechanics** — DEPRECATED banner text, archival path,
   cleanup of G.1 preview catalogs, the three todos (T33–T35) currently
   in `.planning/TODOS.md`, paused Phase G.2.
8. **OTB planning-time glance** — per-file lineage marker, GitHub API
   fast-path, `port_recipe.md` adjacent recipe (adopt / reject / defer
   with rationale).

Additional batches may emerge (e.g., a companion-skill-scaffold batch if
naming branches).

---

## Signals that this diagnosis is ready to confirm

- Every prior finding lives in one of four clearly-named buckets with a
  count.
- Bucket 1 (user-locked) is small and defensible — each item traces to a
  specific user statement in BRAINSTORM, CLAUDE.md, or Piece 2 output.
- Bucket 2 (filesystem facts) is observational only; no decisional weight.
- Bucket 3 (research-recommended defaults) is explicitly listed and
  routed into Phase 1 batches as questions, not absorptions.
- Bucket 4 (research speculations + planning-musts + OTB alternatives) is
  explicitly open for discovery.
- Every codebase surface named has a filesystem check behind it.
- The bootstrap ordering constraint is explicit and treated as a Bucket 3
  default (ratifiable in discovery).
- Five prior plans named with paths for the closeout phase.

**Phase gate:** user confirms this diagnosis (or reframes), then Phase 1
Batch 1 begins with the orchestrator-shape category.
