# Findings: D8 — Drift Detection for `/context-sync`

**Searcher:** deep-research-searcher (C1)
**Profile:** web + docs
**Date:** 2026-04-23
**Sub-Question IDs:** C1 (D8)

---

## 1. Sub-question

How does `/context-sync` walk user-scoped and machine-scoped surfaces, detect
drift, and avoid false positives?

Four sub-parts: (1) walk strategy per category, (2) compare mechanism and 5-state
classification, (3) false-positive avoidance, (4) decide loop with user
confirmation pattern.

Builds on A4's recommended 7-field drift record at
`.claude/state/context-sync-state.jsonl`:
`path | category | src_hash | dst_hash | source_wins | machine_exclude | synced_at`

---

## 2. Approach

- Fetched chezmoi architecture docs (developer guide, source-state-attributes,
  status command reference, diff tool reference, machine-to-machine guide).
- Fetched chezmoi_modify_manager algorithmic detail page.
- Surveyed Syncthing conflict detection documentation.
- Searched for: rsync --checksum behavior, JSON canonicalization (RFC 8785),
  CRLF/LF drift false positives, chezmoi SHA256 state bucket internals.
- Read A4's ledger-need findings for the 7-field record baseline.
- Inspected JASON-OS `.claude/canonical-memory/` file shape and
  `~/.claude/commands/` directory structure to confirm iteration units.

---

## 3. Findings — Walk Strategy per Category

[CONFIDENCE: HIGH for all "Where" fields — confirmed by A4 codebase survey;
MEDIUM for "Identifier" columns — inferred from shape + chezmoi prior art]

| Category | Source location | Destination location | Iteration unit | Identifier across invocations |
|---|---|---|---|---|
| **Canonical memories** | `.claude/canonical-memory/*.md` (JASON-OS repo) | `~/.claude/projects/<hash>/memory/*.md` (user-level) | File | `category + relative filename` (e.g., `memory/user_communication_preferences.md`) |
| **Tenets** | Same as memories — `type: tenet` in frontmatter distinguishes them | Same | File | Same — filename stable |
| **CLAUDE.md local tweaks** | JASON-OS repo `CLAUDE.md` (or per-project override section) | Consumer project's `CLAUDE.md` | Named section block within file | `category + project-path + section-slug` |
| **`settings.local.json`** | JASON-OS repo `.claude/settings.local.json` | Consumer project's `.claude/settings.local.json` | Whole file | `category + relative path` |
| **Env variables** | `settings.json` `env` block | Consumer project's `settings.json` `env` block | Key-value pairs within JSON | `category + env-key` per key |
| **Slash-command aliases** | `~/.claude/commands/gsd/`, `~/.claude/commands/sc/` (user-level) | Consumer project `.claude/commands/` OR another locale's `~/.claude/commands/` | Directory (one entry per command subdirectory) | `category + command-dir-name` |
| **Keybindings** | `~/.claude/keybindings.json` (user-level, may not exist) | Same file, other locale | Whole file | `category + path` |
| **Git config overrides** | User-level `~/.gitconfig` or repo `.git/config` additions | Other locale's `~/.gitconfig` | Named `[section]` blocks | `category + section-name` |
| **Husky local** | `.husky/_/` (JASON-OS repo) | Consumer project's `.husky/_/` | Whole directory / generated files | `category + relative path` — low priority, generated |
| **Status-line config** | JASON-OS `.claude/statusline-command.sh` + config | `~/.claude/statusline/` (binary + shim — machine-specific) | Config file only (binary is machine-local) | `category + path` |

### Walk implementation notes

- **Glob-then-filter pattern** (chezmoi: `SourceState.Read()` does a complete
  source directory traversal [1]). For context-sync, equivalent is: for each
  category, enumerate all units in source root via glob; filter out units where
  `machine_exclude = true` in the prior drift record; compare remainder.

- **`~/.claude/commands/` is directory-structured.** Observed layout:
  `~/.claude/commands/gsd/` and `~/.claude/commands/sc/`. Iteration unit is
  the subdirectory, not individual files within it. The drift record `path`
  should store the directory name as identifier.

- **Project-path scoping for memory destination.** The `~/.claude/projects/`
  directory uses a path-hash as the directory name per Claude Code's convention.
  The walk must resolve the hash for each consumer project before constructing
  the destination path. This is a one-time lookup per project, not per file.

- **CLAUDE.md tweaks are sub-file units.** A CLAUDE.md contains both
  upstream sections and local tweaks. The iteration unit is a named block
  (e.g., `## Local overrides`), not the whole file — otherwise a full-file
  hash would flag every time the upstream body changes. Block identification
  requires a sentinel comment or frontmatter header convention.

---

## 4. Findings — Compare Mechanism

[CONFIDENCE: HIGH — chezmoi's SHA256 bucket design is directly applicable;
5-state model is adapted from chezmoi's two-column status + Syncthing's
both-modified detection]

### 4.1 SHA256 as the comparison primitive

chezmoi stores SHA256 hashes rather than full file contents in its persistent
state bucket: "It stores a SHA256 of the entry's contents, rather than the
full contents, to avoid storing secrets in the persistent state." [1] For
`run_onchange_` scripts, it re-runs the script only when the SHA256 changes. [2]

For context-sync, the same primitive applies: hash the normalized content of
each unit (see Section 5 for normalization), store the hash in the drift record,
compare on next invocation.

### 4.2 5-state classification

chezmoi's `status` command uses a two-column output that encodes which side
changed [3]. First column = change since last sync; second column = what apply
will do. Context-sync needs a richer classification because it must also detect
conflicts (both sides changed independently).

```
For each drift record unit U:

  src_hash_current  = sha256(normalize(read(U.source_location)))
  dst_hash_current  = sha256(normalize(read(U.dest_location)))
  src_hash_prior    = record.src_hash      // from .jsonl, latest entry for U.path
  dst_hash_prior    = record.dst_hash

  state =
    if   record is absent:                       NEW
    elif src_hash_current == src_hash_prior
     and dst_hash_current == dst_hash_prior:     CLEAN
    elif src_hash_current != src_hash_prior
     and dst_hash_current == dst_hash_prior:     SOURCE-DRIFTED
    elif src_hash_current == src_hash_prior
     and dst_hash_current != dst_hash_prior:     DEST-DRIFTED
    else:                                        BOTH-DRIFTED   // conflict
```

### 4.3 Handling absent destinations

- Source present, dest absent: treat as NEW (same as no prior record for that path).
- Dest present, source absent: SOURCE-DRIFTED toward absence — flag for user; do not auto-delete.
- Both absent: record is stale — prune the drift record silently.

### 4.4 Record lookup

The drift record is append-only JSONL. On each run, build an in-memory map
keyed by `path` → latest record (highest `synced_at`). This matches the
pattern of existing JASON-OS state files (A4 Finding 2 [internal]).

---

## 5. Findings — False-Positive Avoidance

[CONFIDENCE: HIGH for CRLF and JSON normalization — backed by chezmoi
source-level evidence and RFC 8785; MEDIUM for frontmatter timestamp stripping
and comment-change policy — no direct prior art found, design decision required]

The core principle: **hash normalized content, not raw bytes.** Anything that
changes without semantic change must be normalized away before computing
`src_hash` or `dst_hash`.

### 5.1 CRLF / LF line endings

**Problem:** On Windows, files round-tripped through git gain CRLF endings.
`sha256("\r\nfoo")` != `sha256("\nfoo")`. Every Windows run would report
SOURCE-DRIFTED or DEST-DRIFTED for text files even with no semantic change.

**chezmoi's approach:** chezmoi has explicit line-ending awareness in its
template system via `chezmoi:template:line-ending=native` directives. Without
this directive, it normalizes to the platform default. It documented this
imprecisely (plural vs singular bug, PR #3818 corrected) [4]. The underlying
architecture normalizes paths to forward slashes internally on all platforms. [1]

**Context-sync approach:** Normalize all text files to LF before hashing.
`content.replace(/\r\n/g, "\n")`. Do this unconditionally for all `.md`,
`.json`, `.sh`, `.yaml` units before computing any hash. Git's
`core.autocrlf` setting makes this a Windows-routine problem, not a
corner case — the normalization must be default-on.

### 5.2 Frontmatter timestamp fields

**Problem:** Memory files have frontmatter fields like a `last-modified` or
`synced_at` date that Claude Code or the user updates automatically. A memory
file whose *prose body* is unchanged but whose frontmatter date updated would
produce a different SHA256 — false DEST-DRIFTED.

**Prior art:** No tool in the survey strips frontmatter fields before hashing.
chezmoi hashes the whole rendered file content after template evaluation; it
does not expose a "strip these YAML keys before hashing" primitive.

**Context-sync approach:** For `.md` files with YAML frontmatter, parse the
frontmatter block and exclude a named set of volatile fields before hashing:
`{last-modified, synced_at, last-touched, updated_at}`. Hash the remainder
of the frontmatter plus the full prose body. This requires a lightweight YAML
frontmatter extractor (not full YAML parse — just the `--- ... ---` delimited
block). The set of excluded keys must be a named constant, not a per-file
annotation, to avoid per-file configuration sprawl.

**Scope:** Apply only to files in `memory | tenet | claude-md-tweak` categories
where frontmatter is expected. Do not apply to `.json` or `.sh` files.

### 5.3 Comment-only changes

**Problem:** A CLAUDE.md tweak gains a comment line (`# This section added
2026-04-23`). The semantic content is unchanged but the hash changes.

**chezmoi_modify_manager approach:** For INI-formatted config files, it uses
a custom parser that preserves formatting on read so re-serialization does not
generate spurious diffs. [5] For comment changes specifically, it takes no
special action — comments are treated as content.

**Context-sync approach:** Treat comment-only changes as semantic changes and
report them as SOURCE-DRIFTED or DEST-DRIFTED. The user can choose to accept
or skip. This is the conservative choice — the alternative (stripping comments
before hashing) risks hiding meaningful comments in tenets/CLAUDE.md tweaks.
Do NOT strip comments from hash input.

### 5.4 Reordered keys in JSON

**Problem:** `settings.local.json` has keys reordered by an editor.
`sha256({"a":1,"b":2})` != `sha256({"b":2,"a":1})`.

**Standard:** RFC 8785 (JSON Canonicalization Scheme / JCS) defines a
deterministic JSON serialization: sort object keys by UTF-16 code unit order,
remove whitespace, normalize numbers. [6] This is specifically designed to
produce stable hashes for JSON regardless of key order.

**Context-sync approach:** Before hashing any `.json` file (settings.local,
keybindings, settings.json env block): parse the JSON, apply JCS-style
re-serialization (deep key sort + compact whitespace). Hash the canonical form,
not the raw bytes. Use `JSON.stringify(sortedObj)` with a recursive key-sort
helper — no external dependency needed for the JASON-OS Node.js stack.

### 5.5 Intentional machine-local content — the machine_exclude flag

**Problem:** `settings.local.json` on the work machine has `"allowedPaths"`
entries with Windows paths specific to that machine. Every run on the home
machine would see these as DEST-DRIFTED.

**chezmoi's approach:** `.chezmoiignore` supports template conditionals:
`ignore this file unless hostname == X`. Machine-specific files are excluded
from the managed set on machines where they don't apply. [7]

**Context-sync approach:** The `machine_exclude` field in A4's drift record
handles this at the record level. When `machine_exclude = true`, the walk
skips that unit entirely — it never reaches the compare step, so it can never
produce a false positive. The mechanism for *setting* `machine_exclude = true`
is:
  1. On first sync: user is asked "is this file machine-specific?" (per-unit,
     one-time question).
  2. User answers yes → record written with `machine_exclude = true` + a
     stable identifier → never re-asked.
  3. On subsequent runs: the walk pre-filters: load all drift records, build
     `machine_exclude_set`, skip any unit whose `path` is in that set.

This is the correct separation: false-positive avoidance happens *before* the
compare, not inside the hash function.

### 5.6 Summary table

| Failure mode | Normalize before hash? | Filter before compare? | Policy |
|---|---|---|---|
| CRLF/LF line endings | Yes — replace `\r\n` → `\n` on all text files | No | Default-on, always |
| Frontmatter timestamps | Yes — strip volatile YAML keys from hash input | No | md/tenet/claude-md only |
| Comment-only changes | No | No | Treated as semantic change |
| Reordered JSON keys | Yes — JCS-style deep key sort + compact JSON | No | All .json files |
| Machine-local content | No | Yes — `machine_exclude = true` skips unit | Set once, persisted |

---

## 6. Findings — Decide Loop

[CONFIDENCE: HIGH — directly derived from brainstorm anti-goals + chezmoi's
user-confirmation pattern + Syncthing's conflict rename approach]

### 6.1 Per-state behavior

| State | Tool action | User confirmation required? |
|---|---|---|
| CLEAN | Skip silently. No output unless `--verbose`. | No |
| NEW (no prior record) | Propose copy src → dst. Display: filename, category, diff preview. Wait for yes/no. | Yes — per unit |
| SOURCE-DRIFTED | Propose src → dst copy. Display: diff of normalized content. Present options: apply / skip / always-skip. | Yes — per unit |
| DEST-DRIFTED | If `source_wins = true`: propose dst override by src (with warning). If `source_wins = false`: propose dst → src copy (sync-back). Display diff. Wait. | Yes — per unit |
| BOTH-DRIFTED | Full stop. Display three-way diff (prior state vs src vs dst). User must choose: take-src / take-dst / open-in-editor / skip. Cannot auto-resolve. | Yes — mandatory escalation |

### 6.2 User confirmation pattern — honoring "no fire-and-forget"

The BRAINSTORM anti-goal states: "Operate silently. No fire-and-forget state
changes. All surfaced data requires acknowledgment." [internal, BRAINSTORM]

Design rules derived from this:
1. **Never write to disk without confirmation.** The decide loop is a *proposal*
   loop: each unit is proposed, then the user says yes or no. No batch-apply
   without a single "apply all" confirmation covering only the units the user
   has reviewed.
2. **Show diff before asking.** For SOURCE-DRIFTED and BOTH-DRIFTED states,
   display the diff (normalized content delta) *before* the confirmation prompt.
   Confirmation without diff is information-free.
3. **Offer "skip this category" at the category level.** If a user answers "no"
   to several consecutive units of the same category, offer: "Skip remaining
   [memory] units?" This prevents confirmation fatigue without bypassing the
   anti-goal.
4. **"Always-skip" writes machine_exclude = true.** If a user answers "always
   skip this file," record that answer in the drift record as `machine_exclude =
   true`. The question is never re-asked. This converts the anti-goal from
   "always ask" to "ask once for machine-local content."
5. **BOTH-DRIFTED cannot be bulk-resolved.** Even with "apply all," BOTH-DRIFTED
   units are held back and must be resolved individually. Syncthing's approach
   of renaming conflict files [8] is the fallback: if the user exits without
   resolving, leave both versions, do not corrupt either.
6. **Confirmation is conversational, not interactive-terminal-UI.** The tool is
   `/context-sync` — a Claude Code skill. Confirmation is Claude presenting a
   proposal and the user typing yes/no/skip. No ncurses, no TUI.

### 6.3 Post-confirmation write

After user confirms a unit:
1. Copy normalized content from source to destination.
2. Write new drift record entry:
   `{ path, category, src_hash: src_hash_current, dst_hash: src_hash_current,
      source_wins, machine_exclude, synced_at: now }`
   Note: `dst_hash` is set to the same value as `src_hash_current` because the
   destination now matches the source. This is the post-sync baseline for the
   next run.

---

## 7. Recommended Drift Detection Algorithm

```
function contextSyncWalk(categories, driftRecordPath):
  priorRecords = loadLatestRecordsMap(driftRecordPath)      // path → record
  machineExcludeSet = {r.path | r.machine_exclude == true}
  results = []

  for category in categories:
    for unit in enumerateUnits(category):                   // glob + filter
      if unit.path in machineExcludeSet: continue           // skip machine-local

      srcContent = readNormalized(unit.sourceLocation)      // CRLF→LF, JSON JCS,
      dstContent = readNormalized(unit.destLocation)        //   frontmatter strip
      srcHash = sha256(srcContent)
      dstHash = sha256(dstContent)
      prior = priorRecords.get(unit.path)

      state = classify(srcHash, dstHash, prior)             // 5-state enum
      results.push({ unit, state, srcHash, dstHash, srcContent, dstContent })

  for result in results (grouped by category):
    proposeToUser(result)                                   // show diff, await yes/no
    if confirmed:
      write(unit.destLocation, srcContent)
      appendDriftRecord(driftRecordPath, {
        path: result.unit.path,
        category: result.unit.category,
        src_hash: srcHash,
        dst_hash: srcHash,    // dst now matches src
        source_wins: result.unit.source_wins,
        machine_exclude: result.machineExclude,
        synced_at: now()
      })
```

---

## 8. Claims

1. **chezmoi uses SHA256 hashes stored in a persistent bucket, not raw content.**
   [HIGH] — chezmoi developer architecture docs [1]. "Stores a SHA256 of the
   entry's contents, rather than the full contents, to avoid storing secrets."
   Directly validates A4's `src_hash`/`dst_hash` field choice.

2. **chezmoi's status command uses a two-column format: first column = change
   since last write, second column = pending action.** [HIGH] — chezmoi status
   command reference [3]. The context-sync 5-state model extends this cleanly:
   first column tells which side drifted; BOTH-DRIFTED is the conflict state.

3. **chezmoi normalizes paths to forward slashes on Windows.** [HIGH] —
   chezmoi architecture docs [1]. Windows CRLF in file *contents* is a separate
   problem — requires explicit `\r\n → \n` normalization before hashing.

4. **CRLF-vs-LF is a documented real false-positive vector in chezmoi on
   Windows.** [HIGH] — chezmoi discussion #3816 [4]. Even chezmoi had a
   directive-name bug (singular vs plural) that caused line-ending normalization
   to silently fail. Context-sync must make CRLF normalization default-on.

5. **JSON key ordering produces different hashes for semantically identical
   documents.** [HIGH] — RFC 8785 JCS specification [6]. JCS specifically
   exists to make JSON hashing stable across key-order variation. Use deep key
   sort + compact serialization before hashing any `.json` unit.

6. **chezmoi handles machine differences via templates and .chezmoiignore
   conditionals, not a hash-bypass flag.** [HIGH] — chezmoi machine-to-machine
   guide [7]. Context-sync's `machine_exclude` boolean is a simpler and
   sufficient equivalent for the JASON-OS use case (no template rendering
   needed).

7. **Syncthing detects BOTH-DRIFTED by comparing version vectors (index
   database), not raw hashes or timestamps alone.** [MEDIUM] — Syncthing
   syncing docs [8]. Context-sync cannot use version vectors (no real-time
   sync). Instead it infers BOTH-DRIFTED from the prior drift record: if both
   `src_hash` AND `dst_hash` differ from prior, both sides changed independently.

8. **chezmoi_modify_manager avoids false positives for INI files by using a
   custom parser that preserves formatting on read/write.** [HIGH] —
   chezmoi_modify_manager algorithms page [5]. Analogous principle: parse
   before hash (JSON JCS for .json, frontmatter stripping for .md).

9. **chezmoi's `re-add` command propagates destination-side drift back to
   source.** [MEDIUM] — chezmoi re-add docs [search result]. This is the
   DEST-DRIFTED case in context-sync. When `source_wins = false`, the tool
   must offer the same reverse-copy option rather than always overriding with
   source.

10. **`~/.claude/commands/` is directory-structured with `gsd/` and `sc/`
    subdirectories.** [HIGH] — filesystem observation (this session). Iteration
    unit for slash-command aliases is the subdirectory, not individual files.

11. **Frontmatter timestamp stripping has no established prior art in dotfile
    managers.** [MEDIUM] — no evidence found in chezmoi, yadm, or home-manager
    for this pattern. Context-sync must design it from scratch. The set of
    volatile keys should be a named constant, not a per-file annotation.

---

## 9. Sources

| # | URL / Location | Title | Type | Trust | CRAAP avg | Date |
|---|---|---|---|---|---|---|
| 1 | https://www.chezmoi.io/developer-guide/architecture/ | chezmoi Architecture | Official docs | HIGH | 4.5 | 2024+ |
| 2 | https://deepwiki.com/twpayne/chezmoi/3.1-source-state-processing | chezmoi Source State Processing | Community wiki | MEDIUM-HIGH | 4.0 | 2024 |
| 3 | https://www.chezmoi.io/reference/commands/status/ | chezmoi status command reference | Official docs | HIGH | 4.5 | 2024+ |
| 4 | https://github.com/twpayne/chezmoi/discussions/3816 | chezmoi line endings directive bug | GitHub discussion | MEDIUM | 3.5 | 2024 |
| 5 | https://vorpalblade.github.io/chezmoi_modify_manager/algorithms.html | chezmoi_modify_manager Algorithms | Maintainer docs | MEDIUM-HIGH | 4.0 | 2024 |
| 6 | https://www.rfc-editor.org/rfc/rfc8785 | RFC 8785: JSON Canonicalization Scheme | IETF standard | HIGH | 5.0 | 2020 (stable) |
| 7 | https://www.chezmoi.io/user-guide/manage-machine-to-machine-differences/ | chezmoi machine-to-machine guide | Official docs | HIGH | 4.5 | 2024+ |
| 8 | https://docs.syncthing.net/users/syncing.html | Syncthing: Understanding Synchronization | Official docs | HIGH | 4.5 | 2024+ |
| 9 | `.research/cross-repo-movement-reframe/findings/D4-context-sync-ledger-need.md` | A4 findings: ledger need | Internal research | HIGH | — | 2026-04-23 |
| 10 | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | BRAINSTORM.md | Internal planning | HIGH | — | 2026-04-23 |

---

## 10. Gaps and Uncertainties

1. **CLAUDE.md tweak block identification.** The walk treats CLAUDE.md tweaks
   as sub-file iteration units (named sections). No convention for sentinel
   comments or section headers exists in JASON-OS yet. Planning must define
   one before implementation.

2. **Project-path hash resolution.** The `~/.claude/projects/<hash>/` directory
   name is derived from the project path. The algorithm for this hash is not
   documented publicly. The walk must either discover the hash empirically
   (find by walking `~/.claude/projects/` for a known file), or use Claude
   Code's internal directory resolution — which may not be scriptable. This is
   a C3 (cross-machine locale) concern but also affects the walk strategy.

3. **`keybindings.json` existence not confirmed.** A4 also noted this gap.
   The walk must handle the case where the source or destination does not yet
   exist (treat as NEW, not error).

4. **Frontmatter volatile key set.** The proposed set `{last-modified,
   synced_at, last-touched, updated_at}` is based on field names observed in
   existing memory files. No canonical list exists. Planning should define this
   list and make it a named constant in the implementation.

5. **`machine_exclude` assignment UX.** The "is this machine-specific?" onboarding
   question is a one-time prompt per unit. How this prompt is triggered on
   first discovery of a new unit (NEW state) vs. an existing unit that was
   previously synced is not fully designed. The decide loop above assumes NEW
   triggers it, but units that were synced without machine_exclude and later
   become machine-specific need a path to set it after the fact.

6. **Env-var sync granularity.** The walk proposes per-key iteration for env
   variables. This requires parsing the `settings.json` env block as a map and
   hashing each value. But the whole-file drift record approach (used for
   settings.local.json) may be simpler. The two approaches are in tension; the
   planning deliverable must pick one.

7. **yadm and home-manager were not deeply surveyed.** yadm uses git as its
   entire comparison mechanism (git diff). home-manager uses Nix evaluation
   and treats drift as undefined behavior. Neither offers a more instructive
   approach than chezmoi for context-sync's specific problem — but this was
   confirmed by overview search, not deep documentation dive.

---

## Confidence Assessment

- HIGH claims: 7
- MEDIUM claims: 4
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

The core algorithm (normalize → hash → 5-state classify → confirm → write) is
supported by strong prior art (chezmoi's SHA256 bucket design, RFC 8785 for
JSON, chezmoi's two-column status model). The false-positive mitigations for
CRLF and JSON key ordering have direct external backing. Frontmatter timestamp
stripping has no prior art and is a design decision that must be confirmed in
planning.
