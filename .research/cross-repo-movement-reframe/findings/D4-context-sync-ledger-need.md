# Findings: D4 — Does `/context-sync` Need the Full Ledger?

**Searcher:** deep-research-searcher (A4)
**Profile:** codebase + reasoning (no outside survey)
**Date:** 2026-04-23
**Sub-Question IDs:** A4 (D4)

> **Orchestrator note:** This file was captured via the Windows 0-byte
> agent-output fallback (Critical Rule 4). Content below is the agent's
> verbatim return.

---

## Sub-question

Does the `/context-sync` companion need the full lineage ledger, or does a
lightweight drift record suffice? Three sub-parts: (1) what does
`/context-sync` need to remember between invocations per category? (2) What
is the minimum viable drift-record shape? (3) What does forcing the full
ledger cost? Plus a decision criterion.

---

## Approach

Surveyed the existing JASON-OS `.claude/state/*.jsonl` files for their
actual field shapes (these are the ground-truth precedents for what
"lightweight" means in this project). Read the canonical-memory file shape
(frontmatter + prose), settings.json and settings.local.json, husky `_/`
directory, and user-level `~/.claude/` layout. Applied the brainstorm's
anti-goal and bootstrap-scaffold role throughout.

---

## Finding 1 — What context-sync needs to remember per category

[CONFIDENCE: HIGH]

| Category | Last-sync timestamp | Hash of last-synced content | Source-of-truth pointer | Lineage | Per-machine override |
|---|---|---|---|---|---|
| **Canonical memories** (`~/.claude/projects/.../memory/*.md`) | REQUIRED | REQUIRED | REQUIRED — JASON-OS canonical-memory dir is source | UNNEEDED | NICE-TO-HAVE |
| **Tenets** (user + project) | REQUIRED | REQUIRED | REQUIRED — tenet authoring location is source | UNNEEDED | NICE-TO-HAVE |
| **CLAUDE.md local tweaks** (per-project, not git-tracked main body) | REQUIRED | REQUIRED | REQUIRED — JASON-OS is template; tweaks are per-project overrides | UNNEEDED | NICE-TO-HAVE |
| **`settings.local.json`** | REQUIRED | REQUIRED | REQUIRED — settings.local is machine-local layer | UNNEEDED | REQUIRED — machine-specific by definition |
| **Env variables** (from `settings.json` env block) | REQUIRED | REQUIRED | REQUIRED | UNNEEDED | REQUIRED — env vars can be locale-specific |
| **Slash-command aliases** (`~/.claude/commands/`) | REQUIRED | REQUIRED | REQUIRED — user-level commands dir is source | UNNEEDED | NICE-TO-HAVE |
| **Keybindings** (`~/.claude/keybindings.json` if present) | REQUIRED | REQUIRED | REQUIRED | UNNEEDED | NICE-TO-HAVE |
| **Git config overrides** (local `.git/config` additions) | REQUIRED | REQUIRED | REQUIRED — repo-level is target; user-level is source | UNNEEDED | REQUIRED — signing keys/credential helpers machine-specific |
| **Husky local** (`.husky/_/`) | NICE-TO-HAVE | NICE-TO-HAVE | NICE-TO-HAVE | UNNEEDED | NICE-TO-HAVE |
| **Status-line config** | REQUIRED | REQUIRED | REQUIRED — JASON-OS config is source | UNNEEDED | REQUIRED — binary path machine-specific |

**Summary:**
- Always REQUIRED: timestamp, hash, source-of-truth pointer
- Always UNNEEDED: lineage (none of these were ported FROM somewhere — all user-authored in place)
- Frequently REQUIRED or NICE-TO-HAVE: per-machine override

Three-field minimum (timestamp + hash + source-pointer) plus per-machine
exclusion as a fourth field needed by at least four categories.

---

## Finding 2 — Minimum viable drift-record shape

[CONFIDENCE: HIGH]

The existing JASON-OS state files (`commit-log.jsonl`,
`hook-warnings-log.jsonl`, `commit-failures.jsonl`,
`label-promote-audit.jsonl`) are all pure event logs: timestamp + a few
categorical fields + outcome. No hash, no source pointer, no lineage. This
is the project's own house style.

**Proposed drift-record shape:**

```jsonl
{
  "path": "relative/path/or/logical-key",
  "category": "memory|tenet|claude-md-tweak|settings-local|env-var|slash-cmd|keybinding|git-config|husky-local|statusline",
  "src_hash": "sha256-of-last-synced-source-content",
  "dst_hash": "sha256-of-last-synced-dest-content",
  "source_wins": true,
  "machine_exclude": false,
  "synced_at": "2026-04-23T00:00:00.000Z"
}
```

Seven fields. Append-only: when re-synced, a new record replaces the old
(or the file is rewritten on sync — either works). Tool reads the latest
record per `path` to determine current drift state.

**Where it lives:** `.claude/state/context-sync-state.jsonl` — consistent
with existing state-file convention.

**Is it a degenerate case of the full ledger?** No. They share only
`synced_at`. They should remain separate files even if `/context-sync`
later gains some ledger awareness.

- Ledger (per A1's scope): cross-repo lineage — origin, port time, transformation history. Powers `/sync-back`.
- Drift record: same-machine sync state between two known locations. No transformations, no multi-repo edges, no origin reference.

---

## Finding 3 — Cost of forcing the full ledger onto `/context-sync`

**Bootstrap-time cost: LARGE — tips the recommendation** [HIGH]

Brainstorm explicitly: "`/context-sync` ships first. Is the bootstrap
scaffold." The full ledger is what A1 is designing now as a pre-/deep-plan
deliverable. For `/context-sync` to use it, the ledger must be implemented
first. That inverts the dependency: instead of context-sync being the
simplest thing that proves the companion pattern, it becomes the thing
that waits for the heaviest shared infrastructure to be ready. The
bootstrap paradox the companion architecture was specifically designed to
avoid (BRAINSTORM Phase 2) re-emerges. **Sufficient reason alone to
reject the full ledger for `/context-sync`.**

**Schema-pressure cost: MEDIUM — confirms but doesn't independently tip**

The ledger schema is capped at 12 fields. Context-sync's actual needs:
`path`, `category`, `src_hash`, `dst_hash`, `source_wins`,
`machine_exclude`, `synced_at` — 7 fields, none lineage. If the ledger
must accommodate these, it adds fields that are meaningless for `/port`,
`/sync-back`, `/extract`. Either inflates schema past the cap, or wastes
cap space on context-sync-only fields that null-fill in records from
other companions.

**Maintenance cost: MEDIUM — real but not blocking**

Every context-sync run touches the ledger. If A1's design leads to
sharding (open question #7), context-sync inherits that complexity. The
context-sync verb is supposed to be the simplest companion; ledger locking
+ shard routing aren't zero-cost.

---

## Finding 4 — Recommendation

[CONFIDENCE: HIGH]

**Use a drift record. Not the full ledger.**

The three findings converge:
1. Lineage is UNNEEDED for every single context-sync source category
2. Minimum viable shape is 7 fields, fits one `.jsonl` file, no shared infra needed
3. Forcing the ledger defeats the bootstrap-scaffold role

The anti-goal "no over-engineering" applies directly: drift record is the
lightest structure satisfying all of context-sync's actual requirements.

**Hybrid option ("ledger-shaped drift record") rejected:**
- (a) still requires ledger infra first — preserves bootstrap cost
- (b) null lineage fields create noise for A1's schema cap
- (c) no actual benefit — drift record holds all the data context-sync needs

**One scenario where the full ledger becomes relevant:** If a future
`/port` operation needs to move a memory file that is also tracked by
context-sync, the port companion would want the sync history. At that
point, context-sync could write a thin summary entry to the ledger
alongside its own state file. Explicit future bridge, not a precondition.

---

## Finding 5 — Decision criterion (clean rule for the planner)

[CONFIDENCE: HIGH]

**Use the full ledger when:**
- Content was imported from another repo (origin not the current repo)
- Cross-companion queries need to reference movement history
- The companion is not the bootstrap scaffold (ledger infra already available)

**Use a drift record when:**
- Content was authored in place (no import lineage to preserve)
- Only question between invocations: "has this changed, which side wins?"
- Companion must ship before shared ledger infrastructure exists
- Per-file state fits in 5–10 fields with no null padding

**Applied to `/context-sync`:** All three drift-record conditions true.
None of the ledger conditions true. Drift record.

---

## Claims

1. **Lineage is universally unneeded for context-sync.** [HIGH] All brainstorm-listed source categories are user-authored in place; none ported from external repo.
2. **Timestamp + hash + source-pointer are REQUIRED for every category.** [HIGH] Logical necessity + brainstorm's "diff-and-copy with scope rules" verb.
3. **Per-machine exclusion is REQUIRED for at least four categories** — settings.local, env vars, git config, status-line. [HIGH]
4. **The 7-field drift record is sufficient and minimal.** [HIGH] No field redundant; no required case uncovered.
5. **The drift record is NOT a degenerate ledger.** [HIGH] Share only `synced_at`. Different artifact for a different purpose.
6. **Bootstrap-time cost of requiring the full ledger is LARGE.** [HIGH] Context-sync cannot ship as bootstrap if depending on ledger infra that doesn't yet exist. BRAINSTORM Phase 2 names the bootstrap paradox.
7. **Existing JASON-OS state files confirm house style is drift-record-shaped, not ledger-shaped.** [HIGH] Direct inspection of all four `.jsonl` files in `.claude/state/`.
8. **Husky local is the lowest-priority category.** [MEDIUM] `.husky/_/` is generated by `npm install`, not user-authored.
9. **`~/.claude/commands/` only contains subdirectories at user level** (observed: `gsd/`, `sc/`), suggesting tracking unit is directory-level, not file-level. [MEDIUM] Drift record `path` should accommodate directory entries.
10. **Hybrid "ledger-shaped drift record" solves nothing.** [HIGH] Preserves bootstrap cost, creates schema noise, no benefit.
11. **Future bridge: context-sync writing thin summary entry to ledger when a memory file is also being ported** — explicit future bridge, not a precondition. [MEDIUM]

---

## Sources

| # | Source | Type | Trust | Notes |
|---|---|---|---|---|
| 1 | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | Internal planning doc | HIGH | Primary authority on context-sync's role, anti-goals, open questions |
| 2 | `.research/cross-repo-movement-reframe/PHASE_0_LANDSCAPE.md` | Internal planning doc | HIGH | Background |
| 3 | `.claude/state/commit-log.jsonl` | Codebase ground truth | HIGH | House style for state files |
| 4 | `.claude/state/hook-warnings-log.jsonl` | Codebase ground truth | HIGH | Same |
| 5 | `.claude/state/commit-failures.jsonl` | Codebase ground truth | HIGH | Same |
| 6 | `.claude/state/label-promote-audit.jsonl` | Codebase ground truth | HIGH | Same |
| 7 | `.claude/canonical-memory/*.md` | Codebase ground truth | HIGH | Memory shape: frontmatter + prose |
| 8 | `.claude/settings.local.json` | Codebase ground truth | HIGH | Confirms machine-specific Bash allow rules with local paths |
| 9 | `.claude/settings.json` | Codebase ground truth | HIGH | Env-var block lives in settings.json |
| 10 | `.husky/_/` | Codebase ground truth | HIGH | Husky local generated, not user-authored |
| 11 | `~/.claude/commands/` | Codebase ground truth | HIGH | Slash-command aliases directory-structured |
| 12 | `~/.claude/projects/.../memory/` (69 files) | Codebase ground truth | HIGH | Memory file count + shape |

---

## Gaps and Uncertainties

1. **`~/.claude/keybindings.json` existence not confirmed.** Brainstorm lists it; no file found. May exist only when user has customized.
2. **Tenet file locations not resolved.** PHASE_0_LANDSCAPE points to `~/.claude/projects/.../memory/tenet_*.md` but no `tenet_*` files found in JASON-OS memory dir. The `user_communication_preferences.md` file has `type: user` frontmatter — suggests `type` field distinguishes tenets, not filename prefix.
3. **Env-var sync semantics unclear.** Env block in `settings.json` (git-tracked). Syncing across locales means either syncing settings.json sections (tracked) or maintaining a separate env override. Drift record can track hash of env block, but the sync action itself needs design (C1's scope).
4. **Per-machine exclusion mechanism not designed.** The `machine_exclude: boolean` field is a placeholder. Actual rule needs design (separate `machine_exclude_rules` config? tagging convention in files?).

---

## Confidence Assessment

- HIGH: 8 claims
- MEDIUM: 4 claims
- LOW: 0
- UNVERIFIED: 0
- Overall: HIGH

---

## Serendipity

The existing `.jsonl` state files are ALL pure event logs — no hash, no
source pointer, no lineage — confirming that the project's own house
style is "drift record, not ledger." This strengthens the recommendation
beyond reasoning alone: it's not just the right architectural call, it's
the call that matches the codebase's already-established pattern for
"simple state."
