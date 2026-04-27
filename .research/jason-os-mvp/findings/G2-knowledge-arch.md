# G2 — Knowledge Architecture (Gap Pursuit)

**Gap Agent:** G2
**Profile:** codebase
**Date:** 2026-04-15
**Phase:** 3.95 (gap pursuit)
**Confidence:** HIGH

## Summary

The `/todo` skill requires a three-script Node.js CLI stack (todos-cli.js,
render-todos.js, todos-mutations.js) that does not exist in JASON-OS; a markdown
stub is viable in 30 minutes and would satisfy all programmatic callers. Of the
9 ported JASON-OS skills, 7 carry `Document Version` + `Last Updated`
frontmatter but 2 (session-begin, convergence-loop, todo) lack it, and no
JASON-OS SKILL_INDEX.md tracks per-skill versions or synced dates — making
divergence from SoNash invisible. The memory portability gap is partially
resolved: JASON-OS now commits `.claude/canonical-memory/` to git (commit
1d7fc0c); SoNash's own sync is manual (`cp`) with no hook enforcement, meaning
both repos share the same benign-but-fragile pattern.

---

## Detailed Findings

### Item G6: /todo Skill Viability

#### What the skill requires (ground truth)

Full read of `<JASON_OS_ROOT>\.claude\skills\todo\SKILL.md`
(369 lines, v1.2, 2026-04-10). JASON-OS todo SKILL.md is byte-for-byte identical
to SoNash v1.2 — confirmed by tail comparison.

**Storage layer (lines 56-61):**
```
Data:      .planning/todos.jsonl      (one JSON object per line)
View:      .planning/TODOS.md         (generated, do not edit)
CLI:       scripts/planning/todos-cli.js
Render:    scripts/planning/render-todos.js
```

**The hard rule (line 29-31):**
> "All JSONL mutations go through `scripts/planning/todos-cli.js`. NEVER
> read-then-Write the file directly. The CLI acquires an advisory lock,
> strictly parses, applies the mutation, runs a regression guard against
> silent drops, and only then writes. Bypassing it reintroduces the T26/T27/T28
> data-loss bug. [T30 fix]"

Every one of the 8 menu actions calls `node scripts/planning/todos-cli.js`
with a subcommand. Exit code 2 = fatal. All mutations blocked without the CLI.

**The invocation tracking snippet (lines 349-358):**
```bash
cd scripts/reviews && npx tsx write-invocation.ts --data '{...}'
```
This calls `scripts/reviews/write-invocation.ts` — a SoNash-specific TypeScript
invocation tracker. Also absent from JASON-OS.

**Script dependencies in SoNash (confirmed by reading todos-cli.js lines 1-60):**

| Script | Path | Import type |
|--------|------|-------------|
| `todos-cli.js` | `scripts/planning/todos-cli.js` | ESM top-level, blocking |
| `render-todos.js` | `scripts/planning/render-todos.js` | ESM import (line 48) |
| `todos-mutations.js` | `scripts/lib/todos-mutations.js` | CommonJS require (line 51) |
| `safe-fs.js` | `scripts/lib/safe-fs.js` | ESM import (line 46) |
| `sanitize-error.js` | `scripts/lib/sanitize-error.js` | ESM import (line 47) |

`safe-fs.js` and `sanitize-error.js` ARE already present in JASON-OS at
`<JASON_OS_ROOT>\scripts\lib\`. Only
`todos-cli.js`, `render-todos.js`, and `todos-mutations.js` are missing.

#### What programmatically calls /todo in JASON-OS

**SoNash session-start.js (line 1347-1363):** Reads `.planning/todos.jsonl`
directly (not via CLI) to surface the todo count in startup output:
```
📋 Todos: 3 active (1 P0, 2 P1) — run /todo to manage
```
This is a READ-ONLY operation — no CLI required. It gracefully skips if the
file doesn't exist (line 1348: `if (fs.existsSync(todosPath))`).

JASON-OS's `session-start.js` does NOT exist in JASON-OS's 4-hook set. The
todo-surfacing code lives in the SoNash session-start.js hook, which JASON-OS
has not ported. So this caller does not currently exist in JASON-OS.

**CLAUDE.md §7 (line 98):** `/todo` listed as "cross-session task tracking"
under session boundaries. This is advisory — no automated dispatch mechanism
in JASON-OS yet (no UserPromptSubmit hook).

**session-begin SKILL.md:** No direct /todo invocation found. The skill
references `/alerts`, `/session-end`, and `/checkpoint` as neighbors, but
does NOT call `/todo` programmatically.

**session-end SKILL.md:** The SKILL.md (line 316-319) says "Before closure,
the session-end skill SHOULD read todos.jsonl and prompt" — but session-end
does not exist in JASON-OS.

**post-todos-render.js hook:** Exists only in SoNash, not ported to JASON-OS.
It fires on PostToolUse Write/Edit when `.planning/todos.jsonl` is written, to
re-run render-todos.js. Not a caller of /todo — it's a downstream side effect.

**Conclusion:** No programmatic caller of /todo exists in JASON-OS today. The
session-start hook (which surfaces todo counts) has not been ported. The skill
is invoked only manually by the user via `/todo`.

#### (a) Minimal-viable stub contract

A markdown-only /todo stub that satisfies CLAUDE.md §7 ("cross-session task
tracking primitive") without the CLI stack:

```markdown
---
name: todo
description: >-
  STUB v0 — Cross-session todo management via .planning/TODOS.md (markdown).
  Full JSONL stack deferred. Single operator, no concurrency risk at v0.
  Upgrade to JSONL when: second operator joins OR frequency >10/day.
---
# Todo (Stub v0 — Markdown)

**Storage:** `.planning/TODOS.md` — edit directly. No JSONL, no CLI.
**Upgrade trigger:** Port todos-cli.js when concurrency is real.
```

**What the stub can satisfy:**
- CLAUDE.md §7 reference ("cross-session task tracking primitive") — YES
- Manual invocation `/todo` to view/add/complete — YES (via direct file edit)
- Session-end's "You have N open todos" prompt — YES (count lines in TODOS.md)
- session-start.js todo surfacing — NOT APPLICABLE (hook not ported)
- Compaction resilience — YES (file lives on disk)

**What the stub cannot satisfy:**
- Critical Rule 6: "All JSONL mutations MUST go through todos-cli.js" — VIOLATED
  (but stub declares itself v0-stub and overrides this rule explicitly)
- T26/T27/T28 data-loss protection — NOT PRESENT (but irrelevant for 1 operator
  with low write frequency)
- Invocation tracking (`write-invocation.ts`) — NOT PRESENT (also missing the
  dependency)

**Stub SKILL.md override required:** The SKILL.md must be modified to declare
itself a v0-stub with an explicit rule override for Critical Rule 6, and state
the upgrade criteria. This is the only safe approach — leaving the existing
SKILL.md as-is while running without the CLI is a latent lie.

#### (b) Full port dependency graph + effort estimate

**Dependencies to port (ordered by coupling):**
1. `scripts/lib/todos-mutations.js` — CommonJS, pure functions, no external deps
   beyond the project's `safeParseLine`. Estimated: ~200 lines. 30 min copy.
2. `scripts/planning/render-todos.js` — reads todos.jsonl, writes TODOS.md.
   Imports `safe-fs.js` (present) and `parse-jsonl-line.js` (present). 
   Estimated: ~100 lines. 15 min copy.
3. `scripts/planning/todos-cli.js` — ESM, imports render-todos + todos-mutations +
   safe-fs + sanitize-error. All deps now present after steps 1-2.
   Estimated: ~400 lines. 30 min copy + smoke-test.
4. `.planning/todos.jsonl` — create empty file. 2 min.
5. Modify SKILL.md — remove invocation tracking snippet (requires
   `scripts/reviews/write-invocation.ts`, absent and SoNash-specific).
   Estimated: 10 min.

**Total full-port effort: ~1.5 hours** (copy 3 scripts + smoke-test + SKILL.md
edit). This is less than the 3-4h estimate in CH-O-008 because:
- `safe-fs.js` and `sanitize-error.js` are already present
- The scripts have no SoNash-specific deps (confirmed by reading todos-cli.js
  import list — no Firebase, no TDMS, no SoNash path references)
- The invocation tracking snippet can simply be removed (it's a SHOULD, not a MUST)

**What the invocation snippet requires (and why to drop it):**
`npx tsx write-invocation.ts` requires `scripts/reviews/write-invocation.ts`
(TypeScript, SoNash-specific review analytics). This is not portable. The
SKILL.md "Invocation Tracking" section (lines 348-358) references
`_shared/SKILL_STANDARDS.md` — which JASON-OS has not ported. Safe to delete
the entire "Invocation Tracking" section for the JASON-OS port.

#### (c) Recommendation

**Adopt the stub immediately (30 min). Port the full stack in the same session
if Node.js is the chosen runtime.**

Rationale:
1. No programmatic callers exist in JASON-OS today — zero urgency for the full
   stack's concurrency protection.
2. The stub resolves the CLAUDE.md §7 lie (listed as available but broken).
3. The full port is only ~1.5h because the hard dependencies (safe-fs, sanitize-
   error, parse-jsonl-line) are already present. This is close enough to the
   stub time that doing both in one sitting is sensible.
4. CH-O-008 rationale holds: "stub creates migration step that may never happen."
   If JASON-OS chooses a non-Node stack, the JSONL CLI is dead weight. Stub + defer
   is the right pattern until the stack decision is made (CLAUDE.md §1: TBD).

**SKILL.md modification required for both paths:**
- Stub: Replace "all mutations through todos-cli.js" with stub declaration.
  Add: `**Version:** 0.1-stub — markdown-only. Upgrade to JSONL when: second
  operator or high-frequency use makes T26/T27/T28 risk real.`
- Full port: Remove the invocation tracking section (lines 348-358).

---

### Item G10: Skills Maintenance Trap

#### (a) Version field survey — JASON-OS ported skills

9 skills were surveyed via grep for `Document Version` and `Last Updated`:

| Skill | Has `Document Version`? | Has `Last Updated`? | Current version in JASON-OS | Same in SoNash? |
|-------|------------------------|--------------------|-----------------------------|-----------------|
| `brainstorm` | YES (line 12) | YES (line 13) | 1.0 / 2026-04-01 | Same |
| `checkpoint` | YES (line 12) | YES (line 13) | 2.0 / 2026-02-14 | Same |
| `deep-plan` | YES (line 12) | YES (line 13) | 3.0 / 2026-03-07 | Same |
| `deep-research` | YES (line 12) | YES (line 13) | 2.0 / 2026-04-05 | Same |
| `skill-audit` | YES (line 13) | YES (line 14) | 3.0 / 2026-03-06 | Same |
| `skill-creator` | (not checked directly) | (not checked) | has Version History | unknown |
| `convergence-loop` | NO `Document Version` | NO `Last Updated` | has Version History table | unknown |
| `session-begin` | NO `Document Version` | NO `Last Updated` | has Version History table | unknown |
| `todo` | NO `Document Version` | NO `Last Updated` | 1.2 / 2026-04-10 in table | Identical |

**Summary:** 5 of 9 skills have explicit `Document Version` + `Last Updated`
frontmatter. 4 skills (convergence-loop, session-begin, todo, and skill-creator)
use only a Version History table at the bottom — the frontmatter block is absent.

**Pattern finding:** The `Document Version` / `Last Updated` frontmatter appears
only in skills that had those fields in SoNash. SoNash's `session-begin` v2.0 also
lacks Document Version frontmatter (confirmed: grep finds `Last Updated` only on
line 37, which is a SESSION_CONTEXT.md reference in the skill body, not
frontmatter). This is an inherited inconsistency, not a JASON-OS-specific gap.

**All 9 JASON-OS skills are at the same version as SoNash** (verified for
brainstorm, checkpoint, deep-plan, deep-research, skill-audit, todo). This is
expected — they were ported 2026-04-15, the day of this research.

**Divergence clock starts now.** SoNash will receive updates; JASON-OS will not.
The first divergence will be invisible without a sync primitive.

#### (b) SoNash skill-audit skill — version-tracking mechanism

`skill-audit` (v3.0) is a 577-line behavioral quality audit skill. It audits
individual skills against 12 quality categories. It does NOT contain any
version-sync or fork-tracking mechanism for tracking the SKILL.md document
versions against a source repo.

The skill does track:
- Which SKILL.md was audited (target skill name)
- Decisions made during the audit (state file per audit)
- Invocation tracking (via write-invocation.ts — SoNash-specific)

What it does NOT track:
- Source version (e.g., "this was ported from SoNash v3.0")
- Last-synced date with source
- Whether the skill has diverged from its source
- Forked/diverged status

**Conclusion:** SoNash has no built-in skill version-sync mechanism. The
`SKILL_INDEX.md` (v2.6) lists 64 skills with descriptions but no version
columns, no last-synced dates, and no source paths. The SKILL_INDEX is a
navigation catalog, not a sync manifest.

**There is no existing pattern in SoNash for marking skills as
"forked/diverged from original."** This is a gap in SoNash itself that
JASON-OS would be inheriting and should solve proactively.

#### (c) Minimum viable sync primitive

**Proposed: `SKILL_INDEX.md` schema addition**

JASON-OS already needs a SKILL_INDEX.md (D2e Finding 5). The MVP is to create
it with a version+sync schema rather than SoNash's description-only format.

Proposed columns:

```markdown
| Skill | Category | Portability | Version | Last Updated | Source Path (SoNash) | Synced Date |
|-------|----------|-------------|---------|--------------|---------------------|-------------|
| `brainstorm` | planning | portable | 1.0 | 2026-04-01 | `.claude/skills/brainstorm/SKILL.md` | 2026-04-15 |
| `checkpoint` | planning | portable | 2.0 | 2026-02-14 | `.claude/skills/checkpoint/SKILL.md` | 2026-04-15 |
| `deep-plan` | planning | portable | 3.0 | 2026-03-07 | `.claude/skills/deep-plan/SKILL.md` | 2026-04-15 |
| `deep-research` | research | portable | 2.0 | 2026-04-05 | `.claude/skills/deep-research/SKILL.md` | 2026-04-15 |
| `skill-audit` | meta | portable | 3.0 | 2026-03-06 | `.claude/skills/skill-audit/SKILL.md` | 2026-04-15 |
| `session-begin` | session | portable | 2.0 | 2026-03-16 | `.claude/skills/session-begin/SKILL.md` | 2026-04-15 |
| `convergence-loop` | quality | portable | (see table) | 2026-03-? | `.claude/skills/convergence-loop/SKILL.md` | 2026-04-15 |
| `skill-creator` | meta | portable | (see table) | 2026-03-? | `.claude/skills/skill-creator/SKILL.md` | 2026-04-15 |
| `todo` | session | portable | 1.2 | 2026-04-10 | `.claude/skills/todo/SKILL.md` | 2026-04-15 |
```

**Minimum viable cadence (least effort):**

- **Manual, triggered by commit:** When SoNash tags a significant skill update
  (via its own version history table), the operator checks SKILL_INDEX.md and
  notes the divergence. No script required.
- **Scripted, monthly:** A simple diff script compares `Document Version` /
  Version History table in JASON-OS vs SoNash and reports diverged skills.
  ~50 lines of Node.js. Not MVP but worth building when the stack is decided.
- **Cadence recommendation:** Monthly manual check for the first 3 months.
  If divergences accumulate faster, move to scripted diff.

**Migration cost for existing 9 skills:** Add `Synced Date` and `Source Path`
columns to each skill's frontmatter (or to a centralized SKILL_INDEX.md). This
is a ~30-minute one-time operation.

#### (d) "Forked/diverged" marking pattern

No such pattern exists in SoNash. Proposed for JASON-OS:

Add a `portability_status` frontmatter field to each ported skill:

```yaml
---
portability_status: synced | forked | local-only
source_version: 3.0
source_path: "sonash-v0/.claude/skills/deep-plan/SKILL.md"
last_synced: 2026-04-15
---
```

- `synced` = JASON-OS version is identical to SoNash source version
- `forked` = JASON-OS has intentionally diverged (with a note on why)
- `local-only` = skill authored in JASON-OS, not ported from SoNash

This field answers the operator's question "has this skill drifted?" in O(1)
time without grepping. It is also the trigger for periodic sync: run `/skill-audit`
on any skill where `portability_status: forked` to assess whether the divergence
is intentional.

**Cost to add:** 5 lines × 9 skills = 45 lines of frontmatter, 20 minutes.

---

### Item G15: Memory Portability Architecture

#### SoNash canonical-memory vs global memory — structure and sync

**SoNash canonical-memory** (`C:\...\sonash-v0\.claude\canonical-memory\`):
- 24 files: MEMORY.md + 23 topic files
- All in the standard auto-memory format (YAML frontmatter + markdown body)
- Committed to the sonash-v0 git repo — travels with the repo
- Content: 11 feedback files + 5 project files + 4 reference files + 3 user files
  + MEMORY.md (from filesystem inspection)

**SoNash global memory** (`<HOME>\.claude\projects\C--Users-<user>-...\memory\`):
- 77+ files (the full live set, per D2d Finding 8)
- Machine-local, NOT git-tracked
- Much richer than canonical (37 feedback + 28 project + 7 reference + 4 user)

**The divergence:** canonical-memory has 24 files; live memory has 77. The
canonical set is a curated 24-file subset of the 77-file live memory. It is NOT
a mirror. The D2d finding of "23-file divergence" was counting files present
in one but not the other — the canonical set is roughly the "golden cross-locale
baseline."

**How SoNash keeps them consistent:** The `project_cross_locale_config.md`
file (`.claude/canonical-memory/project_cross_locale_config.md:14`) is explicit:

```
Sync method: commit canonical memory set to repo, copy to locale memory dirs
```

This is **manual copy**. No script, no hook, no automation. The workflow is:
1. When important memory changes, update the file in canonical-memory/
2. Commit it to git
3. Manually copy to `~/.claude/projects/<path>/memory/` on each machine

There is no `post-memory-write.js` hook in SoNash's 24-hook inventory. No
`post-write-validator.js` special-cases memory files. The sync is entirely
operator-driven.

**The benign consequence:** The canonical-memory set is "intentional staleness"
— it contains only the 24 most portable/universal files, not the 77 live files.
The extra 53 live files (mostly SoNash-specific project files) are correctly
excluded. The "23-file divergence" cited in D2d is not rot — it is the correct
operating state for a curated subset.

#### JASON-OS canonical-memory vs global memory — current state

**JASON-OS canonical-memory** (commit 1d7fc0c, `C:\...\jason-os\.claude\canonical-memory\`):
- 11 files: MEMORY.md + 10 topic files
- Content matches the bootstrapped set: 7 feedback + 3 user + 0 project + 0 reference
- Committed to git — travels with the repo

**JASON-OS global memory** (`<HOME>\.claude\projects\C--Users-<user>-...-jason-os\memory\`):
- 11 files: MEMORY.md + 10 topic files
- **Identical content to canonical-memory** (verified by filesystem comparison)

**Finding: JASON-OS canonical-memory and global memory are currently in sync.**
The bootstrap session produced identical content in both locations. This is the
ideal state, achieved by copying from SoNash and creating both simultaneously.

**The portability gap (CH-C-010 investigated):** The 11-file JASON-OS global
memory is machine-local. On a new machine, the canonical-memory in git would
deploy 11 files, but the operator would need to manually copy them to the new
machine's global memory directory. The canonical-memory pattern solves this
exactly — it is the copy command's source. The gap is not architecture; it is
the absence of a documented onboarding step.

#### Proposed architecture for portable Claude Code OS

Three options analyzed:

**Option A: Current SoNash pattern (manual, one-way):**
- Canonical-memory = curated subset, committed to git
- Sync = manual `cp` from canonical to `~/.claude/projects/<path>/memory/`
- Trade-offs:
  - PRO: Simple, no infrastructure, no conflicts
  - PRO: Operator controls what becomes "golden"
  - CON: New machine requires manual step
  - CON: Drift undetected until operator notices
  - CON: No way to propagate live memory improvements back to canonical

**Option B: Bidirectional (canonical ↔ global, scripted):**
- A sync script reads canonical, reads global, merges by frontmatter `status`
  and `type`, writes both directions
- Trade-offs:
  - PRO: Live improvements flow back to canonical automatically
  - CON: Merge conflicts when same file updated in both locations
  - CON: Security risk — global memory may contain session-specific
    content not appropriate for git (e.g., secrets mentioned in session)
  - CON: Non-trivial to implement correctly; auto-memory file writes happen
    mid-session, making real-time sync dangerous
  - VERDICT: Over-engineered for current scale. Defer to when live memory
    diverges significantly from canonical.

**Option C: Canonical-first with explicit promotion (recommended):**
- Canonical-memory = the authoritative golden set (git-tracked)
- New memory goes to live global memory first (via AutoDream)
- Operator explicitly "promotes" a memory file to canonical via `/checkpoint --memory`
  or a dedicated promotion step
- No automated bidirectional sync
- Trade-offs:
  - PRO: Matches how valuable memory actually accrues (via sessions, not planning)
  - PRO: Operator controls canonical scope (prevents pollution of git history)
  - PRO: Onboarding story: `cp -r .claude/canonical-memory/* ~/.claude/projects/<slug>/memory/`
  - CON: Requires a manual "promote" step that operators may forget
  - CON: Canonical set stays small and stale unless actively curated

**Recommended architecture for JASON-OS v0:**
Adopt Option C at zero implementation cost:
1. Keep canonical-memory as the "bootstrap kit" — already done in commit 1d7fc0c
2. Document the `cp` onboarding step in `CROSS_PLATFORM_SETUP.md` (absent but
   needed per D4)
3. Add a "New machine setup" section to the JASON-OS README
4. Consider a future `/session-end` step: "Any new memory files to promote to
   canonical? (y/n)" — but defer this until session-end is ported

**Security note:** Auto-memory is a write path where a compromised repo could
inject content into MEMORY.md. Version-controlling canonical-memory does not
increase this risk (the files are already in git). However, the onboarding `cp`
command should overwrite, not merge — a poisoned canonical-memory file must not
silently merge with a clean live memory.

#### On the per-machine sync problem

Both SoNash and JASON-OS have the same fundamental limitation: memory slugs are
path-derived, so `<HOME>\...` and `/home/jason/...` produce different
slugs and different memory directories. The canonical-memory pattern sidesteps
this entirely — the operator copies files to the correct slug directory on each
machine. This is the correct architecture for a portable OS with multi-machine
use.

**For JASON-OS specifically:** The two-locale scenario (jbell work locale vs
jason home locale, documented in SoNash's `project_cross_locale_config.md`) is
already solved by the canonical-memory pattern. The canonical set copies to
either locale's memory directory with a single `cp -r` command.

---

## Gaps

1. **Convergence-loop version not confirmed.** The JASON-OS convergence-loop
   SKILL.md lacks `Document Version` frontmatter and has only a Version History
   table. The SoNash source version was not read to verify they're at the same
   version. Low urgency (session-begin and todo are higher priority) but the
   SKILL_INDEX.md entry should confirm this.

2. **Invocation tracking snippet portability.** The `write-invocation.ts` call in
   todo and several other skills is SoNash-specific. A full survey of which of
   the 9 ported skills contain this snippet would clarify total removal scope.
   Grep for `write-invocation` across all JASON-OS skill files was not performed.

3. **SoNash canonical-memory count cross-check.** This investigation confirmed
   24 files in SoNash canonical-memory, but D2d reported the count as 24 with
   "23-file divergence from live." Verified that the "divergence" = files in live
   not in canonical (the 53 SoNash-specific project/reference files). The 24-file
   canonical subset is intentional.

4. **No verification that `post-todos-render.js` hook would fire on the stub.**
   If the stub uses `.planning/TODOS.md` (not todos.jsonl), the hook (which
   triggers on Write to todos.jsonl) would never fire. This is correct behavior
   for the stub — but it should be noted if the hook is later ported to JASON-OS.

---

## Serendipity

**The full /todo port is 1.5h, not 3-4h.** The CH-O-008 estimate of "3-4h" for
full port assumed the hard dependencies (safe-fs, sanitize-error, parse-jsonl-line)
needed to be ported first. They are already present in JASON-OS. The actual
remaining work is 3 scripts + 1 SKILL.md edit. This changes the stub vs full-port
decision: at 1.5h total, the operator may prefer to do both in one sitting rather
than accumulate a migration debt.

**JASON-OS is already in a better memory state than SoNash at session 1.** SoNash's
canonical-memory had 24 files with 23-file divergence from live (suggesting the
canonical set was last curated well before the 280-session mark). JASON-OS at
session 1 has IDENTICAL canonical and live sets — perfect sync. The architecture
is sound; the only risk is forgetting to maintain it.

**SoNash has no skill version-sync mechanism** — this is a SoNash gap JASON-OS
can solve proactively. By adding `portability_status`, `source_version`, and
`last_synced` to SKILL_INDEX.md now (while all 9 skills are at-parity), JASON-OS
would have more robust skill tracking than its source. This is a 20-minute
investment with compounding returns.

**`write-invocation.ts` is the hidden coupling in every ported skill.** Every
skill that has an "Invocation Tracking" section calls `npx tsx write-invocation.ts`,
which requires `scripts/reviews/write-invocation.ts` — a SoNash analytics
pipeline script. This section should be removed from all 9 ported skills (or
replaced with a no-op stub) to prevent misleading error messages when the skill
runs without the dependency.

---

## Claims

- **[G2-C-001]** JASON-OS todo SKILL.md is byte-for-byte identical to SoNash
  v1.2. The skill's behavioral rules are not the problem; the missing 3-script
  runtime is. (confidence: HIGH)
- **[G2-C-002]** No programmatic caller of /todo exists in JASON-OS today. The
  session-start.js hook (which surfaces todo counts) has not been ported. The
  skill is manual-invocation only. (confidence: HIGH)
- **[G2-C-003]** The full /todo port requires 3 scripts: todos-cli.js, render-todos.js,
  todos-mutations.js. The hard dependencies (safe-fs.js, sanitize-error.js,
  parse-jsonl-line.js) are already present in JASON-OS. Full port effort:
  ~1.5h, not 3-4h. (confidence: HIGH)
- **[G2-C-004]** A markdown-only stub satisfies all current JASON-OS /todo
  callers (there are none) and the CLAUDE.md §7 advisory reference. Stub effort:
  30 min with a SKILL.md override declaration. (confidence: HIGH)
- **[G2-C-005]** 5 of 9 JASON-OS ported skills have `Document Version` +
  `Last Updated` frontmatter. 4 (convergence-loop, session-begin, todo,
  skill-creator) have only a Version History table. The inconsistency is
  inherited from SoNash, not introduced by JASON-OS. (confidence: HIGH)
- **[G2-C-006]** All 9 JASON-OS skills are at the same version as their SoNash
  source as of 2026-04-15 (the port date). Divergence clock starts now.
  (confidence: HIGH)
- **[G2-C-007]** SoNash has no skill version-sync mechanism. SKILL_INDEX.md v2.6
  lists skills with descriptions but no version columns, no last-synced dates,
  and no source paths. (confidence: HIGH)
- **[G2-C-008]** No pattern exists in SoNash for marking skills as
  "forked/diverged from original." This is a gap in SoNash that JASON-OS can
  solve by adding `portability_status` frontmatter to ported skills. (confidence: HIGH)
- **[G2-C-009]** SoNash's canonical-memory sync is manual `cp` — documented
  in `project_cross_locale_config.md:14`. No hook, no script, no automation.
  (confidence: HIGH, filesystem ground truth)
- **[G2-C-010]** JASON-OS canonical-memory (11 files, commit 1d7fc0c) and
  global memory (11 files, `~/.claude/projects/.../memory/`) are currently
  identical — perfect sync at session 1. (confidence: HIGH)
- **[G2-C-011]** The bidirectional sync option for memory portability is
  over-engineered and has security risks (live memory may contain session-
  specific content not appropriate for git). Option C (canonical-first with
  explicit promotion) is the correct architecture for JASON-OS v0. (confidence: MEDIUM)
- **[G2-C-012]** The `write-invocation.ts` invocation tracking snippet in
  ported skills calls a SoNash-specific analytics script and will produce errors
  when executed in JASON-OS. This section should be removed from all ported
  skills. (confidence: HIGH)
