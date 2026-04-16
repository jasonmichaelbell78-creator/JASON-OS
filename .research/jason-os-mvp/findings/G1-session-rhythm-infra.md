# G1 — Session Rhythm Infrastructure (Gap Pursuit)

**Gap type:** missing-sub-question / low-confidence / verification-gap
**Profile used:** codebase
**Confidence:** HIGH

## Summary

Investigated three gap items from the Phase 3.95 scan: (G1) the full session-end
dependency graph and port plan; (G2) compaction defense hook input sources and
wiring order; (G14) scripts/lib missing scripts enumerated and ranked. All three
items were fully or substantially resolved by direct filesystem inspection of both
repos. The session-end port is viable at ~200 lines and requires four hooks/lib
files that JASON-OS currently lacks. The compaction defense trio is portable but
depends on four `.claude/hooks/lib/` files absent from JASON-OS. The G14 lib gap
resolves to three portable scripts and one SoNash-coupled script (safe-cas-io.js).

---

## Detailed Findings

### Item G1: Session-End Pipeline

#### Full Dependency Graph

Source: `C:/Users/jason/Workspace/dev-projects/sonash-v0/.claude/skills/session-end/SKILL.md` v2.2
Source: `C:/Users/jason/Workspace/dev-projects/sonash-v0/scripts/session-end-commit.js`

**Hard blockers (SoNash-specific, drop for v0):**

| Phase | Command | SoNash coupling |
|-------|---------|-----------------|
| 3 Step 7a | `npm run reviews:sync -- --apply` | SoNash reviews system |
| 3 Step 7b | `node .claude/skills/ecosystem-health/scripts/run-ecosystem-health.js` | Skill not ported |
| 3 Step 7c | `node scripts/debt/consolidate-all.js` | TDMS not ported |
| 3 Step 7d | `node scripts/debt/generate-metrics.js` | TDMS not ported |

**Soft blockers (need to exist, not SoNash-specific):**

| File | Status in JASON-OS | Fix |
|------|--------------------|-----|
| `SESSION_CONTEXT.md` at repo root | ABSENT | Create bootstrap stub |
| `scripts/lib/safe-fs.js` | PRESENT (confirmed by dir listing) | None needed |
| `scripts/log-override.js` | ABSENT | Non-blocking — called in try/catch `{stdio:"pipe"}` at lines 212-233 of session-end-commit.js |
| `ROADMAP.md` at repo root | ABSENT | Adapt Step 3 to `.planning/jason-os/PLAN.md` |

**Not a blocker (confirmed portable as-is):**

- `scripts/session-end-commit.js` — zero SoNash deps. Only requires `scripts/lib/safe-fs.js`
  (PRESENT in JASON-OS). The `log-override.js` calls at lines 214-231 are wrapped in
  try/catch with `{stdio:"pipe"}` — failure is non-blocking.
- Phase 4 cleanup (Step 8: `rm -f` ephemeral JSON files) — pure file deletion
- Phase 4 pre-commit gate (Step 9: `git status` + Y/n) — pure git commands
- Session state write (Step 6) — pure JSON write to `.claude/hooks/.session-state.json`
- Learning loop — pure auto-memory writes

#### SESSION_CONTEXT.md Format Contract

Three required sections (session-begin parses, session-end writes):

**A. Recent Session Summaries** — last 3 sessions, older moved to `docs/SESSION_HISTORY.md`
   Format must include `Session #N` identifier. Keep doc under ~300 lines target.

**B. Quick Status Table** — current TDMS numbers, sprint progress, plan step status.
   session-end-commit.js validates presence of "Quick Status" OR "Progress" text in diff.

**C. Next Session Goals** — updated S0/S1 counts, new goals unlocked, completed goals removed.
   session-end-commit.js validates "Next Session Goals" OR "Immediate Priority" in diff.

**Additional required fields:**
- `**Current Session Count(er)**` — regex `\*{0,2}Current Session Count(?:er)?\*{0,2}[\s:]*(\d+)/i`
  used by `pre-compaction-save.js` (line 70) and `commit-tracker.js` (line 155) to read session number.
- `**Uncommitted Work**: Yes/No` — patched by `session-end-commit.js` (line 118) at commit time.
- `**Last Updated**` — date field verified by session-begin freshness check.

**Bootstrap stub structure:**
```markdown
# Session Context

**Document Version**: 1.0 **Purpose**: Quick session-to-session handoff
**Last Updated**: [date] (Session #1)

## Quick Recovery

**Last Checkpoint**: [date] (Session #1 — bootstrap)
**Branch**: main **Working On**: JASON-OS bootstrap.
**Uncommitted Work**: No

**Current Session Counter**: 1

## Recent Session Summaries

[Session #1 — bootstrap: JASON-OS initial setup]

## Quick Status

| Item | Status |
|------|--------|
| Stack | TBD |

## Next Session Goals

- S0: [first priority]
```

#### Concrete Port Plan

**Copy as-is (zero modification):**
- `scripts/session-end-commit.js` → JASON-OS `scripts/session-end-commit.js`

**Copy and sanitize (strip Phase 3 SoNash commands):**
- SoNash `session-end/SKILL.md` → JASON-OS v0 (~200 lines):
  - Preserve: Phase 1 (Steps 1-3), Phase 2 skeleton (Steps 4/4b/4c/5b), Phase 4 (Steps 8-10)
  - Replace Step 6 (`npm run hooks:health -- --end`) → inline JSON write to `.session-state.json`
  - Replace Step 10 (`npm run session:end`) → inline: `git add SESSION_CONTEXT.md && git commit --only -m "docs: session end - mark complete" -- SESSION_CONTEXT.md`
  - OR: port session-end-commit.js (1 file, 0 SoNash deps) and wire as `node scripts/session-end-commit.js`
  - Drop Phase 3 entirely; replace with single note: "Metrics pipeline: not yet configured. Skip."
  - Adapt Step 3 to reference `.planning/jason-os/PLAN.md` instead of `ROADMAP.md`

**Create new:**
- `SESSION_CONTEXT.md` at JASON-OS repo root (see bootstrap stub above)
- Add `session:end` npm script to `package.json` (or inline the git command in SKILL.md)

**Prerequisite hooks/lib for Step 6 replacement (see Item G2):**
- `.claude/hooks/lib/git-utils.js` — needed by compaction hooks that also read SESSION_CONTEXT.md
- `.claude/hooks/lib/state-utils.js` — needed by pre-compaction-save.js

**Estimated port effort:** 2-3 hours (confirmed CH-C-009 estimate):
- 30 min: create SESSION_CONTEXT.md bootstrap
- 45 min: write 200-line v0 SKILL.md
- 30 min: copy session-end-commit.js + add npm script
- 45 min: dependency verification (safe-fs.js confirmed present; hooks/lib files for compaction)
- 30 min: Phase 2 compliance review scope decision

---

### Item G2: Compaction Defense Layer

#### Input Sources for All Three Hooks

**pre-compaction-save.js** (PreCompact, 466 lines):
Source: `.claude/hooks/pre-compaction-save.js` lines 49-58

Reads from:
| Input | Path | Populated by | At session #1? |
|-------|------|-------------|----------------|
| Session counter | `SESSION_CONTEXT.md` | session-end writes it | EMPTY — no file |
| Task states | `.claude/state/task-*.state.json` | `checkpoint` skill | EMPTY until /checkpoint runs |
| Commit log | `.claude/state/commit-log.jsonl` | `commit-tracker.js` | EMPTY until commits tracked |
| Git state | live git commands | git itself | POPULATED (branch, status, log always work) |
| Agent summary | `.claude/hooks/.session-agents.json` | `track-agent-invocation.js` hook | EMPTY — hook not wired |
| Context tracking | `.claude/hooks/.context-tracking-state.json` | `post-read-handler.js` hook | EMPTY — hook not wired |
| Session state | `.claude/hooks/.session-state.json` | `session-start.js` hook | EMPTY — hook not wired |
| Session notes | `.claude/state/session-notes.json` | AI writes during session | EMPTY initially |
| Active plan | `.claude/plans/*.md` | manual plan creation | EMPTY until plans exist |
| Active audits | `.claude/tmp/*-audit-progress.json` | audit skills | EMPTY until audits run |

**compact-restore.js** (SessionStart compact matcher, 286 lines):
Source: `.claude/hooks/compact-restore.js` lines 67-78

Reads only: `.claude/state/handoff.json` (written by pre-compaction-save.js OR /checkpoint skill).
Has a 60-minute staleness guard (line 260) — skips recovery if handoff is >60 min old.
Will output "No handoff.json found" at session #1 and exit cleanly (non-blocking).

**commit-tracker.js** (PostToolUse Bash, 529 lines):
Source: `.claude/hooks/commit-tracker.js` lines 71-72

Reads: `.claude/hooks/.commit-tracker-state.json` (previous HEAD hash — self-written)
Writes: `.claude/state/commit-log.jsonl` (appends on every detected commit)
Session #1 state: Starts fresh, creates its own state file on first commit. Self-bootstrapping.

#### Which Inputs Are Empty at Session #1

At session #1 before any session-end has run:
- `SESSION_CONTEXT.md` — ABSENT (no file). pre-compaction-save silently returns `null` (line 74 wrapped in try/catch).
- `.session-agents.json` — ABSENT. Returns empty `{agentsInvoked:[]}`.
- `.context-tracking-state.json` — ABSENT. Returns `{filesRead:[]}`.
- `.session-state.json` — ABSENT. Returns `{}`.
- `commit-log.jsonl` — ABSENT (no tracked commits yet). Returns `[]`.
- `task-*.state.json` — ABSENT. Returns `{}`.

**Net result:** pre-compaction-save at session #1 produces a valid `handoff.json` but populated
only with git state (branch, recent commits from git log, uncommitted files). The handoff is
structurally valid but content-thin. compact-restore can read it and output a partial recovery
block. This is FUNCTIONAL (not broken), just data-sparse.

#### Portable Code Path Verification

All three hooks use try/catch fallbacks for every lib import. Failure to load a lib causes
graceful degradation, not crash. Confirmed:

**pre-compaction-save.js:**
- Lines 36-46: if `./lib/git-utils.js` fails → `console.log("ok"); process.exit(0)` (silent skip)
- Lines 42-46: if `./lib/state-utils.js` fails → `loadJson = () => null; saveJson = () => false`

**compact-restore.js:**
- Lines 19-28: if `./lib/sanitize-input` fails → inline fallback implementation
- Lines 30-34: if `../../scripts/lib/security-helpers.js` fails → inline sanitizeError fallback

**commit-tracker.js:**
- Lines 27-30: if `./lib/symlink-guard` fails → `isSafeToWrite = () => false` (fail-closed)
- Lines 32-42: if `security-helpers.js` or `git-utils.js` fail → `process.exit(0)` (silent skip)

#### Missing hooks/lib Files (JASON-OS currently has only `symlink-guard.js`)

JASON-OS `.claude/hooks/lib/` is missing:

| File | Lines | Needed by | Impact if absent |
|------|-------|-----------|-----------------|
| `git-utils.js` | 66 | pre-compaction-save, commit-tracker | pre-compaction-save exits silently (line 38-40) |
| `state-utils.js` | 139 | pre-compaction-save | loadJson/saveJson degrade to no-ops; handoff.json never written |
| `sanitize-input.js` | ~30 | compact-restore, commit-tracker | inline fallback activates — safe |
| `rotate-state.js` | 352 | commit-tracker | rotation skipped — commit-log grows unbounded |

**Critical finding:** Without `git-utils.js`, `pre-compaction-save.js` exits at line 39 with
`console.log("ok")` — the entire pre-compaction snapshot is skipped silently. This is the
highest-impact missing lib for compaction defense.

Without `state-utils.js`, pre-compaction-save runs but `saveJson()` is a no-op — the
`handoff.json` is never written. compact-restore then finds no file and exits cleanly.

**These four hooks/lib files are fully portable (zero SoNash coupling):**

| File | Dependencies | Portable? |
|------|-------------|-----------|
| `git-utils.js` | `node:child_process`, `node:fs`, `node:path` only | YES — copy as-is |
| `state-utils.js` | `node:fs`, `node:path` only | YES — copy as-is |
| `sanitize-input.js` | pure Node.js string ops | YES — copy as-is |
| `rotate-state.js` | `node:fs`, `node:path`, `node:os` only | YES — copy as-is |

#### Correct Wiring Order for JASON-OS

To make compaction defense operationally effective (not just structurally wired):

1. Copy `hooks/lib/git-utils.js`, `hooks/lib/state-utils.js`, `hooks/lib/sanitize-input.js`,
   `hooks/lib/rotate-state.js` to JASON-OS `.claude/hooks/lib/` (prerequisite for all three hooks)
2. Wire `commit-tracker.js` (PostToolUse Bash) — self-bootstrapping, starts tracking immediately
3. Wire `pre-compaction-save.js` (PreCompact) — now has git-utils + state-utils, will write handoff
4. Wire `compact-restore.js` (SessionStart compact matcher) — reads handoff if it exists
5. Create `SESSION_CONTEXT.md` (for session counter reads by commit-tracker + pre-compaction-save)
6. Run `/session-end` to write first meaningful session state — AFTER this, compaction defense
   transitions from "structurally wired but data-sparse" to "fully operational"

**CH-C-003 confirmation:** The contrarian challenge is validated. At session #1 (before step 6),
compaction defense is wired and produces a valid-but-sparse handoff. Git state is always captured.
Task states, agent summaries, commit log, and session notes are empty. "Compaction Does Not Mean
Amnesia" becomes the advertised property only after the first full session-end run.

---

### Item G14: Portable Utility Scripts Absent

#### Complete scripts/lib Comparison

**JASON-OS scripts/lib has (7 files):**
- `parse-jsonl-line.js`, `read-jsonl.js`, `safe-fs.js`
- `sanitize-error.cjs`, `sanitize-error.d.ts`, `sanitize-error.js`
- `security-helpers.js`

**SoNash scripts/lib has (21 files). Missing from JASON-OS (14 files):**

Group A — Portable, potentially needed by ported JASON-OS artifacts:

| Script | Lines | Dependencies | Used by (SoNash) | Urgency |
|--------|-------|-------------|-----------------|---------|
| `validate-skip-reason.js` | 69 | None (pure JS) | hooks/post-write-validator.js | MEDIUM — CLAUDE.md §4.14; post-write-validator would need this when ported |
| `validate-paths.js` | 227 | `node:path`, `node:fs` only | hooks/post-write-validator.js | MEDIUM — same; not needed until post-write-validator is ported |
| `log-override.js` (scripts root) | 635 | `.claude/hooks/lib/symlink-guard`, `scripts/lib/safe-fs`, `scripts/lib/parse-jsonl-line` | session-end-commit.js (non-blocking) | LOW — non-blocking try/catch; port for completeness but not blocking |

Note: `log-override.js` is at `scripts/log-override.js` (not `scripts/lib/`). Its three
dependencies are all PRESENT in JASON-OS (symlink-guard.js in hooks/lib, safe-fs.js and
parse-jsonl-line.js in scripts/lib).

Group B — SoNash-coupled (do NOT port):

| Script | Lines | Why SoNash-specific |
|--------|-------|---------------------|
| `safe-cas-io.js` | 249 | Requires `analysis-schema.js` (CAS — SoNash Content Analysis System) |
| `analysis-schema.js` | unknown | CAS schema definitions — SoNash app logic |
| `ai-pattern-checks.js` | unknown | SoNash analytics |
| `confidence-classifier.js` | unknown | SoNash CAS |
| `generate-content-hash.js` | unknown | SoNash CAS |
| `learning-router.js` | unknown | SoNash learning system |
| `load-propagation-registry.js` | unknown | SoNash propagation system |
| `reference-graph.js` | unknown | SoNash reference graph |
| `retag-mutations.js` | unknown | SoNash analytics |

Group C — Portable, low urgency (normalizers):

| Script | Lines | Notes |
|--------|-------|-------|
| `normalize-file-path.js` | unknown | Path normalization utility — no clear consumer in JASON-OS yet |
| `normalize-category.js` | unknown | Category normalization — no clear consumer in JASON-OS yet |

#### Urgency Ranking (JASON-OS-specific)

1. **CRITICAL (blocking hooks/lib, not scripts/lib):** `git-utils.js`, `state-utils.js`,
   `sanitize-input.js`, `rotate-state.js` — these are in `.claude/hooks/lib/` (not scripts/lib),
   but are the actual blockers for compaction defense (see Item G2). Portability: copy as-is.

2. **LOW (scripts/lib):** `validate-skip-reason.js` (69 lines, zero deps, copy as-is) —
   needed when `post-write-validator.js` is ported. Nothing currently broken without it.

3. **LOW (scripts/lib):** `validate-paths.js` (227 lines, node-only deps) —
   only consumer in SoNash hooks is `post-write-validator.js`, not yet in JASON-OS.

4. **LOW (scripts root):** `log-override.js` (635 lines) —
   session-end-commit.js calls it non-blocking. All its deps are present in JASON-OS.
   Port when session-end is ported; not blocking.

5. **DO NOT PORT:** `safe-cas-io.js` and the analytics group — SoNash CAS infrastructure,
   not part of the portable OS.

**Note:** Items G14 investigation was partially incomplete. The following were NOT examined:
- `normalize-file-path.js` and `normalize-category.js` line counts and dependency graphs
  (grouped as "low urgency, no known consumer in JASON-OS" based on names alone)
- The analytics group (`ai-pattern-checks.js`, `confidence-classifier.js`, etc.) were assessed
  as SoNash-specific from names + `analysis-schema.js` coupling observed in `safe-cas-io.js`;
  not individually read

---

## Gaps

1. **`normalize-file-path.js` and `normalize-category.js`** — not read. Assessed as
   low-urgency normalizers with no known JASON-OS consumers. Could have hidden portability
   value; not investigated.

2. **`hooks/lib/sanitize-input.js` exact contents** — referenced in compact-restore.js and
   commit-tracker.js; both have inline fallbacks that activate on require failure. File
   not read — assumed portable (pure string sanitization from context). Would need verification
   before porting.

3. **session-begin SKILL.md Step 2.1 full parse logic** — the exact regex and validation that
   session-begin uses to read SESSION_CONTEXT.md was not audited. The format contract above is
   derived from session-end's write side; session-begin's read side may have additional
   requirements not captured here.

4. **`npm run session:end` package.json entry** — not verified whether JASON-OS `package.json`
   exists or has a `scripts` section. Session-end SKILL.md v0 can inline the git command
   directly but if a package.json npm script is desired, this needs to be checked.

5. **`scripts/log-override.js` full behavior** — only the first 50 lines and the call sites
   in session-end-commit.js were read. The `--quick` flag behavior (lines 214-231) was observed
   but the full analytics/list/clear modes were not audited for JASON-OS relevance.

---

## Serendipity

**pre-compaction-save.js exits silently when hooks/lib is missing, not noisily.** The try/catch
at lines 36-39 calls `console.log("ok"); process.exit(0)` — not an error. If JASON-OS wires the
hook without copying `git-utils.js`, the hook will silently succeed without writing any handoff.
This is the exact "wired but not operational" failure mode CH-C-003 warned about, but at the
hooks/lib layer rather than the state-file layer. There is zero operator feedback.

**compact-restore.js has cross-platform awareness already.** Lines 54-65 handle Windows path
comparison via `.toLowerCase()` — it's already Windows-aware. No adaptation needed for JASON-OS
running on Windows.

**commit-tracker.js is self-bootstrapping.** Unlike the other two compaction hooks, commit-tracker
creates its own state file (`.commit-tracker-state.json`) on first write. It does not depend on
any other hook having run first. This means it can be wired in isolation immediately and will
begin producing useful commit-log.jsonl data from session #1 onward — assuming `git-utils.js`
and `state-utils.js` are present. If those are absent, it silently exits.

**The validate-skip-reason.js gap is actually a CLAUDE.md §4.14 enforcement gap.** CLAUDE.md
rule 14 says "Never set SKIP_REASON autonomously — user must authorize exact wording." This is
a behavioral rule enforced by operator trust today. In SoNash, `validate-skip-reason.js` provides
a programmatic guard. In JASON-OS, there is no enforcement — the rule is advisory only. This is
acceptable at bootstrap but should be noted in any future CLAUDE.md §2 security section.

**`log-override.js` all three dependencies exist in JASON-OS right now.** `symlink-guard.js`
is in `.claude/hooks/lib/`, `safe-fs.js` and `parse-jsonl-line.js` are in `scripts/lib/`.
This means `log-override.js` can be ported and wired immediately with zero additional
prerequisite work — it's the lowest-friction missing script in the set.

---

## Claims

- **[C-G1-01]** `scripts/session-end-commit.js` has zero SoNash-specific dependencies and
  can be copied to JASON-OS as-is. Its only runtime deps are `scripts/lib/safe-fs.js` (present)
  and `scripts/log-override.js` (called non-blocking). (confidence: HIGH)

- **[C-G1-02]** SESSION_CONTEXT.md requires five fields for full system compatibility:
  `Current Session Counter` (integer), `Uncommitted Work: Yes/No`, `Last Updated` (date),
  `Quick Status` section, and `Next Session Goals` section. (confidence: HIGH)

- **[C-G1-03]** Phase 3 of session-end SKILL.md (Steps 7a-7d) is entirely SoNash-specific
  and must be dropped for JASON-OS v0. Phases 1, 2, and 4 are portable with two npm-script
  substitutions. (confidence: HIGH)

- **[C-G2-01]** All three compaction defense hooks (pre-compaction-save.js, compact-restore.js,
  commit-tracker.js) use try/catch fallbacks for every lib import and fail gracefully when libs
  are absent. None crash — they silently produce degraded or no output. (confidence: HIGH)

- **[C-G2-02]** Without `hooks/lib/git-utils.js`, pre-compaction-save.js exits at line 39
  with no handoff.json written. This is the critical missing dependency for compaction defense
  to function at all. (confidence: HIGH)

- **[C-G2-03]** All four missing `hooks/lib/` files (git-utils.js, state-utils.js,
  sanitize-input.js, rotate-state.js) have only Node.js built-in dependencies and are fully
  portable. (confidence: HIGH — git-utils and state-utils confirmed by reading; sanitize-input
  and rotate-state confirmed by dependency inspection of callers)

- **[C-G2-04]** At session #1, compaction defense produces a valid-but-sparse handoff.json
  containing only live git state. All other fields (session counter, task states, agent summary,
  commit log) are empty/null. The mechanism is structurally functional; operational value
  accrues after the first session-end run. (confidence: HIGH)

- **[C-G14-01]** `safe-cas-io.js` is NOT portable — it requires `analysis-schema.js`
  (SoNash CAS infrastructure). Do not port. (confidence: HIGH)

- **[C-G14-02]** `validate-skip-reason.js` (69 lines, zero deps) and `validate-paths.js`
  (227 lines, node-only deps) are both fully portable but have no current consumer in JASON-OS.
  They become needed when `post-write-validator.js` is ported. (confidence: HIGH)

- **[C-G14-03]** `scripts/log-override.js` (635 lines) can be ported to JASON-OS immediately —
  all three of its dependencies (`symlink-guard.js`, `safe-fs.js`, `parse-jsonl-line.js`) are
  already present in JASON-OS. (confidence: HIGH)
