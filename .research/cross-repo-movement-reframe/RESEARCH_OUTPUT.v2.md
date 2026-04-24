# Research Output: cross-repo-movement-reframe

**Version:** 2.0
**Date:** 2026-04-23
**Supersedes:** Version 1.0 (initial synthesis, 2026-04-23)
**Pipeline:** 11 D-agents → 2 V-agents → contrarian + OTB + disputes → 2 G-agents → this synthesis
**Depth:** L1
**Agents:** 11 searchers, 2 verifiers, 2 challengers, 1 dispute resolver, 2 gap pursuers
**Confidence:** HIGH (core architecture); MEDIUM (calibration parameters, ephemeral-machine handling)

---

## Executive Summary

This research answers four concrete architecture questions the upcoming `/deep-plan` needs resolved before it can produce an implementation plan. The questions span four design strands: what the lineage ledger looks like, how a target repo's gate-and-shape profile is discovered and cached, how `/context-sync` detects and resolves drift across machines, and when the tool can skip deep comprehension in favor of a fast recipe lookup.

The research produced definitive answers on all four strands with HIGH confidence on the core structural decisions. All four data structures (ledger, drift record, profile, comprehension cache) share a family resemblance — they use the existing JASON-OS JSONL conventions, apply per-record `schema_version` stamping, and live in `.claude/state/` (gitignored, machine-local) using the same `safeAppendFileSync` + `withLock` primitives already in `scripts/lib/safe-fs.js`.

Version 2.0 incorporates verification verdicts (4 refuted sub-claims, 5 disputes resolved), contrarian challenges (3 must-resolve planning musts), OTB alternatives (3 deserve planning-time look), and gap-pursuit findings (18 new claims covering tenet identification, project-directory encoding, MCP config, ephemeral machines, and sidecar-file pattern). The overall confidence in the core architecture remains HIGH; several calibration parameters (0.8 fast-path threshold, sharding threshold count) are explicitly downgraded to ESTIMATED pending post-implementation measurement.

---

## The Chosen Direction in One Diagram

```
JASON-OS shared state backbone
(.claude/state/ — gitignored, machine-local)
│
├── ledger.jsonl                    ← cross-repo lineage (port, sync-back, extract)
│   12 fields at v1, append-only, write-last per movement
│   Edge: forward pointer + on-demand hash comparison (content hash stored in value
│         when v1.1 adds source_content_hash; scan-based drift check at v1)
│   v1.1 candidates: source_status, source_content_hash (promotion criteria defined)
│   Versioning: per-record ledger_schema_version
│   Sharding threshold: ~2,600–4,000+ records (calibration parameter, not hard constant)
│
├── context-sync-state.jsonl        ← drift record for /context-sync only
│   7 fields (path, category, src_hash, dst_hash, source_wins,
│              machine_exclude, synced_at)
│   Separate from ledger — different artifact, different purpose
│   Ephemeral-machine guard: CI=true OR CODESPACES=true → exit 0 (two lines)
│
├── profiles/
│   └── <repo-name>.json            ← target-process-profile cache (per owned repo)
│       8 top-level fields
│       gates[] — ordered 6-field gate records
│       shapes{} — 3-field block per unit type
│           companion_files population: heuristic scan + discovery_gap fallback
│
│   └── unowned/
│       └── <slug>.json             ← unowned-mode profiles (read-only repos)
│           Same structure + discovery_mode: "unowned-static"
│
└── comprehension-cache.jsonl       ← recipe fast-path cache
    Key: unit_type:source_repo:target_repo:profile_slice_hash
         (v1: profile_slice_hash hashes FULL profile — optimize after recipe library exists)
    Value: verdict + content_hash_at_last_verdict + confidence (0.8 threshold = ESTIMATED)

Orchestrator + 4 companion verbs:
  /port         → reads profile + cache → writes ledger record LAST
  /sync-back    → reads ledger → queries source_version → writes ledger record LAST
  /extract      → bare-clone unowned repo → reads only → writes ledger record LAST
  /context-sync → reads drift record → normalize/hash/classify → writes drift record LAST

Context-sync inventory: 18 sync-unit classifications across ~12 distinct implementations
  + ledger.jsonl as a required 19th entry (planning decision — add explicitly)
  + ~/.claude.json as a new machine-scoped entry (gap-pursuit finding)
```

---

## Per-Strand Findings

### Strand A — Ledger

#### The 12-field minimum (v1)

Every ledger record carries exactly these fields, serving all four movement verbs [C-001]:

| Field | Type | Note |
|---|---|---|
| `record_id` | string (UUID or slug) | Stable identifier for dedup and reference |
| `verb` | enum: port, sync-back, extract, context-sync | Orchestrator routes dashboard queries on this |
| `source_project` | string | Source repo name |
| `source_path` | string | Repo-root-relative path at time of movement |
| `dest_project` | string | Destination repo name |
| `dest_path` | string | Repo-root-relative path after movement |
| `source_version` | string (free-form) | Commit SHA or version tag at time of movement; anchor for sync-back's three-way diff |
| `moved_at` | ISO-8601 string | Written once, never updated; primary sort key |
| `unit_type` | enum: file, family, memory, context-artifact, concept | Universal routing signal |
| `scope_tag` | enum: universal, user, project, machine, ephemeral | Existing enum, applied without modification |
| `verdict` | enum: copy-as-is, sanitize, reshape, rewrite, greenfield-clone, skip, blocked, observe-only | Future ports of the same unit type use this as a fast-path signal |
| `ledger_schema_version` | string | Per-record stamp |

Three fields were rejected from an initial 15-candidate set: `parent_record_id` (ordering in an append-only log provides the back-reference without a dedicated field), `status` (redundant with event ordering in an append-only log), and `notes` (free-text catch-all creates null-fill anti-pattern per G.1 lesson) [C-003, C-004, C-005].

**V1.1 candidates (not in v1, but tracked explicitly):** `source_status` (active | source_deleted | source_renamed | standalone) and `source_content_hash`. Both are promoted to v1 only when implementation demonstrates the v1 scan-based fallback is insufficient [see Dispute 1 resolution]. Without `source_status` in the record, orphan detection requires a full ledger scan whenever a pointer resolution fails — acceptable at JASON-OS scale (hundreds of records), but worth a named review gate post-launch.

**Path normalization (planning gap surfaced by V1):** Ledger path fields (`source_path`, `dest_path`) on Windows store backslash-separated paths. Planning must decide: normalize to forward slashes at write time (cross-platform safe) or store as-received (machine-specific). This was not addressed in any D-agent finding.

#### Append-only event log, not mutable records

The ledger is an append-only event log [C-002]. Mutable single-record designs destroy the history that `/sync-back`'s three-way diff requires — the original port record must remain intact. "Current state" for a given (source_project, source_path, dest_project) triple is derivable as the most-recent record for that tuple. git-subrepo (negative example) and Nix derivations (positive example of immutability) both confirm this choice [C-006, C-007]. All 4 existing `.claude/state/*.jsonl` files are append-only event logs — confirmed by direct filesystem inspection (V1 verified: `commit-log.jsonl`, `commit-failures.jsonl`, `hook-warnings-log.jsonl`, `label-promote-audit.jsonl`).

#### Edge model: forward pointer + on-demand drift check

Each destination-side ledger record holds a pointer to the source (repo + path at time of port) [C-008]. At v1, "has the source changed?" is answered by recomputing the source file's hash on demand — one file read per drift check, acceptable at JASON-OS's scale. The stored `source_content_hash` field that would avoid this re-read is a v1.1 candidate [see Dispute 1]. No writes are made into source repos. No bidirectional pointers (consistency hazard). The forward-pointer model supports "what has been derived from this source?" queries by scanning all destination records for a given source repo+path [C-009, C-067].

For repo-evolution events (rename, file split, file merge, delete): the ledger records a snapshot relationship, not a live reference. Most evolution events do not invalidate the ledger record — they mean the record describes a past state. The `source_status` field is the resolution mechanism when it is promoted to v1 [C-010, C-011].

For transitive edges (X from JASON-OS ported from Y in SoNash ported from Z in third-repo): one record per hop. Full ancestry is the chain of ledger records, not a field in any single record. At JASON-OS's realistic depth (2-3 hops maximum), the recursive lookup cost is trivial [C-012].

#### Persistence, locking, and rollback

Physical location: `.claude/state/ledger.jsonl` — the existing gitignored state directory, consistent with the 4 existing `.claude/state/*.jsonl` files [C-013]. (Note: earlier drafts of this report cited "six existing .jsonl files" — the verified count is 4. The `.json` state files for brainstorm/deep-plan/deep-research/task-pr-review are not `.jsonl`. The convention and recommendation are unchanged; only the count was corrected.) The ledger must NOT be git-tracked — JSONL produces real merge conflicts on independent appends [C-014].

Locking: `safe-fs.withLock` (coarse whole-file) wrapping every read+write operation — confirmed at `scripts/lib/safe-fs.js:614-621`. `LOCK_TIMEOUT_MS = 5_000` confirmed at line 372. Stale locks auto-broken via PID liveness check at lines 442-456 [C-015]. Note: the 5-second timeout was calibrated for small state files; ledger reads at scale may warrant review (see Challenges section).

The rollback rule: the ledger record is always the LAST write in a movement operation [C-016]. Files first, then ledger append. If file writes fail, the ledger is untouched. If the ledger append fails after all files are written, the result is an unregistered movement (orphan), detectable on the next scan.

Cross-machine sync of the ledger: this was rated UNVERIFIABLE by V1 and surfaced as a gap by Dispute 4 [C-017]. The confirmed 18-category context-sync inventory (D9) does not include `ledger.jsonl`. Planning must explicitly add it as category 19 (user-scoped, `source_wins: true`, `machine_exclude: false`). This is a one-line fix to the inventory but must not be silently assumed.

Sharding: not needed at launch. The threshold is a calibration parameter, not a hard constant — approximately 2,600 records at the 800 bytes/record upper-bound estimate, more likely 3,500–4,000+ records at realistic ledger record sizes (V1 measured commit-log records at ~586 bytes/record; ledger records with shorter paths are likely smaller). The "3-5 years" estimate from D3 is explicitly dropped — it was ungrounded in any usage-rate measurement [C-018]. Year-based sharding (`ledger.2026.jsonl`, etc.) is the right strategy if reached; `streamLinesSync` bypasses the 2 MiB ceiling for streaming readers anyway.

#### Schema versioning

Mirror the existing JASON-OS `EVOLUTION.md` schema-versioning approach: per-record `ledger_schema_version` stamp, addition with a default is a minor bump, addition that requires re-reading existing records is a major bump [C-019]. The `EVOLUTION.md` §8 mirror rule does NOT apply to the ledger — the ledger lives in one canonical location [C-020].

#### The `/context-sync` distinction (Strand A4)

`/context-sync` does NOT use the full lineage ledger [C-021]. It uses a separate 7-field drift record (see Strand C). The bootstrap paradox is the definitive argument: `/context-sync` must ship first as the bootstrap scaffold, and forcing a dependency on a ledger designed in parallel inverts the ordering [C-059]. The separation is architecturally verified.

---

### Strand B — Profile Discovery

#### Owned target repos: what signal files carry and how to extract them

For a repo like JASON-OS, the signal-carrying files that the profile discovery companion must read are [C-022]:

- `.github/workflows/*.yml` — parse YAML statically; extract trigger events, tool-use steps, action identifiers, and `paths-ignore` lists
- `.husky/pre-commit` and `.husky/pre-push` — heuristic-grep on shell scripts: scan for `exit 1` paths (blocking conditions), `command -v <tool>` (tool dependencies), `is_skipped "<name>"` (skippable check names), and environment variable reads (CI bypass patterns)
- `.claude/settings.json` — parse JSON; extract `permissions.allow`, `permissions.deny`, `hooks.*`, `env`
- `.claude/hooks/*.js` — read the top 30 lines (JSDoc header) per file; gate vs. observer classification from exit code 2 vs. exit code 0
- `.github/CODEOWNERS` — parse line-by-line, format `<glob-pattern> <@owner>`
- `.github/pull_request_template.md` — heuristic extraction of title format and checklist items
- `.gitignore` — parse line-by-line to build write-exclusion zones

The `.husky/_/` subdirectory is auto-generated by Husky v9 and carries no user-authored gate signal — skip it [C-023]. `settings.local.json` is gitignored and therefore not discoverable when analyzing a repo without a local checkout; the profile must document this gap explicitly [C-024].

For JASON-OS specifically: `large-file-gate.js` PreToolUse hook (blocks Read on files >5MB), `settings-guardian.js` PreToolUse hook (validates writes to settings.json), and the four-item deny list in settings.json (`git push --force *`, `git push origin main`, `git reset --hard *`, `rm -rf *`) [C-025].

#### Profile data shape (8 top-level fields)

A target-process-profile is an 8-field JSON object [C-026]:

| Field | Type | Purpose |
|---|---|---|
| `schema_version` | string | Profile format version; reader can detect mismatch and re-discover |
| `repo_name` | string | Human-readable target repo name; primary identity key |
| `repo_remote_url` | string or null | Git remote URL if detectable; disambiguates renamed repos |
| `discovered_at` | ISO 8601 string | Timestamp of last discovery run |
| `discovered_at_sha` | string | Git HEAD SHA at discovery; SHA mismatch triggers staleness |
| `discovery_source_map` | object | Which files were read to build this profile (by section) |
| `gates` | array | Ordered list of gate objects (see below) |
| `shapes` | object | Map of unit-type name to 3-field shape block |

Each gate record carries 6 fields: `gate_id` (stable kebab-case slug), `trigger` (pre-commit, pre-push, ci-pr, ci-merge, ci-push, or manual), `required_by` (relative path of declaring file), `action_description` (plain English: what the gate does), `companion_directive` (plain English: what the companion must do to satisfy this gate — the operationally critical field), and `confidence` (HIGH/MEDIUM/LOW reflecting reliability of detection) [C-027].

The shapes section uses exactly 3 fields per unit type: `directory` (where this type lives in the target), `companion_files` (required/optional accompanying files, with path patterns), and `naming_scheme` (plain-English naming rule). The five unit types are: `file`, `family`, `memory`, `context-artifact`, `concept` [C-028].

**`companion_files` population algorithm (gap surfaced by Dispute 5):** The 3-field schema is correct and verified. However, D6 does not specify how `companion_files` is populated from static file scanning. The recommended approach: heuristic scan (observe what files co-exist with known unit-type files in the target), then default-empty with a `discovery_gap` flag when heuristic cannot determine companions with confidence. A future `unit-types.json` convention file is the upgrade path. Planning must specify this algorithm before profile discovery implementation begins.

**Profile location:** `.claude/state/profiles/<repo-name>.json` inside JASON-OS [C-029]. The directory does not yet exist — this is a proposed location. The profile must be gitignored (SHA and timestamp fields are machine-specific state). Re-discovery is triggered by SHA mismatch, not time.

#### Unowned (read-only) target repos

When the source repo is unowned (for `/extract`), profile discovery uses a bare clone plus `git show` reads [C-030]. The mechanism:

1. `git clone --bare --no-local <source> <scratch-bare-dir>` — no working tree; structurally impossible to write into the unowned source
2. File reads via `execFileSync("git", ["show", "HEAD:<path>"])`
3. Defense-in-depth: extend `safe-fs.isSafeToWrite` with a `forbiddenRoots` parameter using the `/^\.\.(?:[\\/]|$)/` regex per CLAUDE.md §5 [C-031]

Unowned-mode profiles differ from owned-mode profiles in four ways [C-032]: they live at `.claude/state/profiles/unowned/<slug>.json`; they carry `discovery_mode: "unowned-static"` and `probe_eligible: false`; all signal confidence is capped at `"observed-only"`; and re-discovery is triggered lazily on SHA change via `git ls-remote` comparison.

---

### Strand C — Context-Sync Mechanism

#### Source inventory (confirmed and extended)

The confirmed context-sync source inventory has 18 sync-unit classifications across approximately 12 distinct category implementations [C-033]. (V2 and Dispute 2 clarified: "18 categories" was imprecise — rows 1-3 are memory sub-types sharing one directory glob. The 18 count is correct as sync-unit count; three of those rows share one implementation.)

Core categories by scope-tag:

**user-scoped** (travel across all this user's machines): canonical memories (`type: user/feedback/reference` in frontmatter), tenets (identified by `t[N]_` filename prefix — NOT by `type: tenet` frontmatter, which is currently unused [C-G1, C-G2]), slash-command aliases, Claude Code keybindings (`~/.claude/keybindings.json`), user-level agents (`~/.claude/agents/`), statusline `config.toml`, git config identity/prefs sections.

**project-scoped** (travel with their project): CLAUDE.md override sections, Husky `_shared.sh`, project-level agents (`.claude/agents/`), canonical memories with `type: project` frontmatter.

**machine-scoped** (never cross locale boundaries without explicit confirmation): `settings.local.json` (confirmed to contain absolute Windows paths), env vars matching secrets patterns, git config credential/signing/safe sections, statusline `config.local.toml` (CONFIRMED to contain a live API key — must be `machine_exclude: true` at registration, not first-run) [C-056].

**Gap-pursuit additions not in original D9 inventory:**
- `~/.claude.json` (home directory root, NOT `~/.claude/mcp.json`) — the current canonical MCP config file. Must be its own sync-unit row. Scope-tag: `machine` (contains project-path keys that differ per machine) [C-G6, C-G8].
- `ledger.jsonl` should be added as a 19th sync unit (user-scoped, `source_wins: true`) — see Dispute 4.

**Excluded from inventory:** `.husky/_/` (generated by `npm install`, ephemeral), `~/.npmrc`/`~/.yarnrc` (not present), statusline binary (machine-specific compiled artifact), Claude Code internal `security_warnings_state_*.json` files (ephemeral), `~/.claude/mcp.json` (old format, now superseded by `~/.claude.json`) [C-G6].

One finding deserves special emphasis: `~/.claude/statusline/config.local.toml` contains a confirmed live API key. This is the canonical example for why `machine_exclude: true` must be set at category registration, not discovered at first-run.

#### Drift detection: the walk/compare/decide loop

The `/context-sync` drift algorithm [C-034]:

1. Load all drift records from `.claude/state/context-sync-state.jsonl` into an in-memory map (keyed by `path`, latest record wins per path)
2. Build `machineExcludeSet` from records where `machine_exclude = true`
3. For each category, enumerate source units via glob; skip any unit in `machineExcludeSet`
4. For each remaining unit, read and normalize both source and destination content
5. Compute SHA256 of normalized content; compare against stored `src_hash` and `dst_hash`
6. Classify into one of 5 states: NEW (no prior record), CLEAN (both sides match prior), SOURCE-DRIFTED (source changed, dest unchanged), DEST-DRIFTED (dest changed, source unchanged), BOTH-DRIFTED (both changed — conflict)
7. Propose each non-CLEAN unit to the user with a diff preview; wait for confirmation
8. On confirmation: write normalized source content to destination, append new drift record

#### False-positive avoidance

Hash normalized content, not raw bytes [C-035]. Four normalization rules:

- **CRLF/LF** — replace `\r\n` with `\n` unconditionally for all text files. Windows git round-tripping makes this a routine problem, not a corner case (confirmed via chezmoi discussion #3816).
- **JSON key ordering** — apply RFC 8785 JCS-style deep key sort + compact serialization before hashing any `.json` file. Prevents key-reordering from triggering false drift.
- **Frontmatter timestamp fields** — for `.md` files with YAML frontmatter, strip a named set of volatile fields (`last-modified`, `synced_at`, `last-touched`, `updated_at`) before hashing. Apply only to `memory | tenet | claude-md-tweak` categories.
- **Comment-only changes** — treated as semantic changes and reported. The conservative choice: stripping comments risks hiding meaningful content in tenets and CLAUDE.md tweaks.

#### Ephemeral-machine handling (gap-pursuit finding)

The original design does not define what happens when `/context-sync` is invoked from a CI runner, GitHub Codespace, or ephemeral container. No dotfiles manager surveyed (chezmoi, yadm, home-manager, GNU Stow) provides automated built-in ephemeral-host detection [C-055, C-G201 through C-G205].

The cheapest v1 guard — two lines of code — covers ~95% of ephemeral cases:

```js
const isEphemeral = process.env.CI === 'true' || process.env.CODESPACES === 'true';
if (isEphemeral) { process.exit(0); } // skip sync silently
```

`CI=true` is set universally by GitHub Actions, GitLab CI, CircleCI, and most CI platforms. `CODESPACES=true` is set automatically by GitHub Codespaces. Neither requires any per-machine config [C-G202, C-G203]. A fuller user-configurable `machine_class: ephemeral` flag (following chezmoi's `$ephemeral` template pattern [C-G201]) is the v2 upgrade path.

The design should explicitly document that it assumes the invoking machine is a long-lived personal machine. CI runners that invoke `/context-sync` without this guard will write orphan drift records on ephemeral machines — a real failure mode but recoverable.

#### Cross-machine locale handling

The recommended approach is a hybrid of two mechanisms [C-036]:

**Layer 1 (per-record flag):** The `machine_exclude` boolean in the 7-field drift record. Set by user at first-sync time for known-risky categories (`settings-local`, `env-var`, `git-config`, `statusline`, `slash-cmd`). Non-risky categories (`memory`, `tenet`, `claude-md-tweak`, `keybinding`, `husky-local`) default to `machine_exclude: false` without asking.

**Layer 2 (content-time pattern detection):** After normalization, before 5-state classification, scan source content against the existing pattern battery in `sanitize-error.cjs` (lines 23-25: `/\/home\/[^/\s]+/gi`, `/\/Users\/[^/\s]+/gi`, `/C:\\Users\\[^\\]+/gi`). If a pattern matches and `machine_exclude` is currently false, emit state `MACHINE-BOUND-DETECTED` — a warning that surfaces to the user with options (sync-anyway / skip / always-skip-this-unit).

The `~/.claude/projects/<hash>/` directory naming problem: this is NOT a cryptographic hash — it is a deterministic, reversible path-encoding (`path.replace(':', '--').replace(/[\\/]/g, '-')`) [C-G3, C-G9]. Multi-machine sync cannot use the encoded directory name as a stable cross-machine identifier because different absolute paths produce different encoded names [C-G4]. No `project.json` manifest file exists inside the directory to recover the original path [C-G5]. The sync tool should use the git remote URL or repo name as the stable cross-machine identifier, not the encoded path. Resolution at sync time: walk `~/.claude/projects/` empirically for a subdirectory whose `memory/` folder contains a known filename [C-038].

#### Settings.local.json sub-file granularity (gap-pursuit finding)

`settings.local.json` contains both portable entries (generic Bash allow rules) and machine-bound entries (absolute Windows paths) in the same JSON array [C-057]. The current `machine_exclude: true` flag is whole-file granularity — safe but loses portability for portable entries.

No ecosystem has a clean per-key JSON portability primitive. VS Code's `settingsSync.ignoredSettings` is a global denylist (not per-machine), with open issue #89627 unfixed since 2020 [C-G206]. chezmoi's `modify_` templates work but require chezmoi as a dependency [C-G207].

The cheapest v1 recommendation: adopt a `settings.local.machine.json` sidecar file (gitignored). Machine-bound entries move to the sidecar; `/context-sync` only touches `settings.local.json`. Runtime merges both files with sidecar winning on conflict. Zero schema changes, approximately 10 lines of Node.js merge logic [C-G208]. A gitignored JSON Pointer denylist file is the second-cheapest option for true per-key granularity at approximately 25 lines [C-G209].

Approach Q (adding a sixth scope-tag value) was evaluated and rejected: the existing `machine` scope tag already covers purely machine-bound items [C-037].

#### Decide loop and user confirmation

The decide loop is a proposal loop — no writes happen without confirmation [C-039]:

| State | Action |
|---|---|
| CLEAN | Skip silently |
| NEW | Propose copy, show content, await yes/no |
| SOURCE-DRIFTED | Show diff, offer apply / skip / always-skip |
| DEST-DRIFTED | Show diff, offer src-wins override or dst-wins sync-back depending on `source_wins` field |
| BOTH-DRIFTED | Full stop; mandatory individual resolution; never auto-resolve |
| MACHINE-BOUND-DETECTED | Surface matched pattern (redacted), offer sync-anyway / skip / always-skip |

BOTH-DRIFTED cannot be bulk-resolved even with "apply all." This satisfies the "no fire-and-forget state changes" anti-goal.

---

### Strand D — Understanding-vs-Mechanical Cache Key

#### Key composition

The cache key is a colon-delimited string of four fields [C-040]:

```
unit_type:source_repo_id:target_repo_id:profile_slice_hash
```

The `unit_content_hash` is explicitly EXCLUDED from the key — it is stored in the cache value as a staleness check. Including content hash in the key would cause the fast path to miss on every file edit [C-041]. This mirrors ccache's direct-mode manifest structure and Bazel's two-level action-cache + content-addressable-store design.

**`profile_slice_hash` at v1:** The challenge pipeline surfaced a circular dependency — which profile fields recipes consult cannot be known before the recipe library exists, but the cache schema must be finalized before implementation [see Challenges section]. Resolution: at v1, `profile_slice_hash` hashes the FULL profile object. This accepts more frequent misses than optimal. The slice optimization (hashing only recipe-relevant fields per C-042) is a post-recipe-library calibration, not a pre-launch requirement.

The `profile_slice_hash` approach (hashing only recipe-relevant fields) remains the right long-term design once the recipe library exists [C-042].

#### Cache entry schema

```json
// header record (first line)
{ "record_type": "header", "recipe_library_version": "0.1.0", ... }

// entry record
{ "record_type": "entry",
  "key": "skill-family:jason-os:sonash:a3f7b1c2",
  "key_fields": { "unit_type": "...", "source_repo_id": "...", "target_repo_id": "...", "profile_slice_hash": "..." },
  "value": {
    "verdict": "sanitize",
    "recipe_ids": ["skill-family.strip-absolute-paths"],
    "content_hash_at_last_verdict": "sha256:4a8f...",
    "recipe_library_version_at_verdict": "0.1.0",
    "confidence": 0.92,
    "verdict_source": "understanding-layer",
    "last_updated_at": "..."
  }
}
```

#### Invalidation triggers

Four triggers invalidate cache entries [C-043]:

1. **Source unit content changes** — detected lazily at lookup time by comparing current content hash against `content_hash_at_last_verdict`. Stale = re-run understanding layer, update entry.
2. **Target profile re-discovered with different fingerprint** — invalidates all entries for that `target_repo_id`.
3. **Recipe library version bump** — global invalidation. Dashboard surfaces the bump; cache rebuilds as new ports run.
4. **Manual user override** — `force_recomprehend` flag skips cache lookup entirely.

#### Cache file location and fast-path visibility

`.claude/state/comprehension-cache.jsonl` — separate from the ledger [C-044]. The cache is gitignored and rebuilt from movements as they happen.

Fast-path hits surface in the dashboard before any action is taken [C-045]. Confidence below 0.8 suppresses the fast path — but this 0.8 threshold is an ESTIMATED parameter with no empirical basis. It should be implemented as a named calibration constant, not a magic number, and reviewed after the first 50-port corpus.

---

## Cross-Cutting Findings

These are patterns that no single agent could see in isolation — they emerge only when all 11 findings are read together.

### The "always-last-step" rule applies to all four verbs

Every companion, regardless of verb, writes its state record as the final action in a movement [C-046]. If file writes fail, the state record is untouched. If the state record append fails after all files are written, the result is an orphan (detectable on next scan), not torn state. The planning spec should name this rule explicitly and apply it uniformly across all four companions.

### The drift-record pattern is the JASON-OS house style for lightweight state

Every existing `.claude/state/*.jsonl` file is a pure event log (timestamp + categorical fields + outcome), not a relational record with lineage. All 4 confirmed JSONL files (`commit-log.jsonl`, `commit-failures.jsonl`, `hook-warnings-log.jsonl`, `label-promote-audit.jsonl`) follow this pattern. The drift-record shape is not a compromise — it is what the JASON-OS codebase already looks like [C-047]. (Note: earlier drafts cited "six existing .jsonl files" — the verified count is 4.)

### Schema versioning mirrors across all four data structures

D1, D6, and D11 all independently converged on per-record `schema_version` stamping using the existing JASON-OS EVOLUTION.md approach [C-048]. The planner should adopt a single naming convention (`schema_version`) across all four files and write one shared schema-versioning policy document rather than four separate ones.

### The fast-path is a mode of the dashboard, not a bypass

Fast-path cache hits surface in the dashboard before any action is taken [C-049]. This applies to the comprehension cache and generalizes: the drift record's CLEAN state (context-sync), the ledger's existing verdict field (port), and the cache's hit state (understanding layer) are all modes of the same dashboard view. Nothing executes silently.

### The security pattern battery already exists and applies to three strands

`sanitize-error.cjs` already contains the right regex battery for detecting machine-bound content [C-050]. D9 (context-sync inventory), D10 (cross-machine locale), and D7 (unowned discovery) all independently identified this as directly reusable without new design. PR #10 R2 (60 files changed with approximately 776 substitutions — not 782 as cited in D10; the 60-file count is confirmed) is accidental prior art for the content-time detection approach [C-058].

### Mixed-scope splitting is required at the item level, not the category level

Several nominal categories are internally mixed-scope. Canonical memories have files with different `type:` values in the same directory. `settings.local.json` mixes portable and machine-bound entries in the same JSON array. The global git config mixes identity (user-scoped) with credential helpers (machine-scoped) in the same file [C-051].

### No dotfiles manager has solved ephemeral-host detection natively

This is a cross-cutting finding with broad implications. chezmoi, yadm, home-manager, and GNU Stow all require explicit user-authored configuration for ephemeral-host handling [C-G201 through C-G205]. JASON-OS needs approximately two lines of code for v1 (`CI=true || CODESPACES=true` guard) — cheaper than any alternative found in the ecosystem.

---

## Corrections from Verification

These are factual errors in the original research that V1 and V2 identified. All corrections are applied inline above.

### Refuted sub-claims (applied and corrected)

**1. "Six existing .claude/state/*.jsonl files" (affects C-013, C-047)**
The verified count is 4, not 6: `commit-log.jsonl`, `commit-failures.jsonl`, `hook-warnings-log.jsonl`, `label-promote-audit.jsonl`. The other files in `.claude/state/` are `.json` and `.state.json` files for skill state management, not `.jsonl`. The house-style argument and the ledger location recommendation are unchanged; only the count is corrected.

**2. `.gitignore:47` citation (affects C-013, C-014 evidence)**
The actual line is `.gitignore:46` — off by one. Minor evidence citation error, no effect on verdicts.

**3. PR #10 R2 substitution count (affects C-058)**
D10 cited "782 absolute path references." The verified git stat for commit 088a077 shows "60 files changed, 776 insertions(+), 776 deletions(-)." The 60-file count is confirmed; 776 is the verified substitution count.

### Downgraded to UNVERIFIABLE (with qualification)

The following claims were verified in principle but cannot be confirmed empirically before implementation. They are retained in the report with explicit qualifications:

| Claim | What cannot be verified | Qualification |
|---|---|---|
| C-001 (12-field set serves all four verbs) | No ledger implementation exists to validate against; D2/D1 field-cap tension unresolved | Treat as v1 design baseline; v1.1 candidates documented with promotion criteria |
| C-005 (G.1 lesson) | The specific G.1 incident cannot be confirmed from available files | The principle (free-text fields get null-filled) is architecturally sound regardless |
| C-010 (source_status as resolution mechanism) | source_status is not in the 12-field v1 set; field-cap conflict resolved by Dispute 1 | Promoted to v1.1 candidate with explicit promotion criteria |
| C-017 (ledger synced by context-sync) | /context-sync does not exist; ledger omitted from D9 inventory | Resolved by Dispute 4: add ledger.jsonl as explicit category 19 |
| C-045 (0.8 fast-path threshold) | No empirical basis | Implement as named calibration constant; review after 50-port corpus |
| C-065 (Turborepo global hash, 10+ recipe threshold) | Turborepo detail not directly confirmed; threshold is speculation | Use as design principle; the specific number is not grounded |
| C-070 (>60% hit rate) | No empirical basis pre-implementation | Aspirational target only; not a measurable pre-implementation threshold |
| C-078 (SHA staleness pattern prior art) | GitHub Actions caching / Terraform state analogies are imprecise | Design claim (SHA mismatch triggers re-discovery) is sound; cited analogies are approximate |

---

## Dispute Resolutions Applied

Five disputes between conflicting claims were resolved by the dispute resolver. Each surfaces a planning-time decision.

### Dispute 1 — Ledger field budget

**Conflict:** D1's 12-field cap (C-001) vs D2's edge model requiring `source_content_hash` and `source_status` (C-008, C-010) vs V1 cross-claim Issue 4 ("source_status introduces 13th field").

**Verdict:** The 12-field cap holds at v1. `source_status` and `source_content_hash` are explicitly demoted to v1.1 candidates with named promotion criteria. Promotion gates: `source_status` promotes when /sync-back implementation demonstrates that scan-based pointer resolution is insufficient; `source_content_hash` promotes when drift detection requires stored hash for performance.

**Planning action required:** Schema doc should list 12 fields for v1 with a dedicated "v1.1 candidates" subsection documenting both fields and their promotion criteria. The 12-field cap exists to prevent gold-plating; the specific number 12 should not become a dogma.

### Dispute 2 — Context-sync inventory granularity

**Conflict:** C-033 calls the inventory "18 categories" — but V2 noted rows 1-3 are sub-types of one brainstorm category (canonical memories) sharing one directory glob.

**Verdict:** 18 is correct as the sync-unit count. The precise framing: "18 sync-unit classifications across approximately 12 distinct category implementations." Three memory rows share one directory glob and one walk algorithm with three filtering branches.

**Planning action required:** Replace "18 categories" with "18 sync-unit classifications across ~12 category implementations" in all planning artifacts.

### Dispute 3 — Ledger sharding threshold

**Conflict:** C-018 cited "approximately 2,000 records / 3-5 years" based on an inflated 800 bytes/record estimate. V1 measured actual commit-log records at ~586 bytes/record, giving a higher safe record count.

**Verdict:** The specific number "2,000" is replaced by a range: ~2,600 at the 800 bytes/record upper-bound estimate, likely 3,500–4,000+ at realistic ledger record sizes. The "3-5 years" estimate is dropped (ungrounded). Single file at launch is still correct.

**Planning action required:** State the sharding threshold as a range and tag it as a CALIBRATION PARAMETER (ESTIMATED, not MEASURED). Do not embed 2,000 as a hard constant.

### Dispute 4 — Context-sync ledger inclusion

**Conflict:** C-017 asserts the ledger is synced by /context-sync (MEDIUM confidence, UNVERIFIABLE). C-033's confirmed 18-category inventory does not list `ledger.jsonl` as a category. These directly contradict each other.

**Verdict:** C-033 wins on evidence. The inventory does not currently include `ledger.jsonl`. The ledger must be explicitly added as category 19, with properties: source path `.claude/state/ledger.jsonl`, scope-tag `user`, `source_wins: true`, `machine_exclude: false`.

**Planning action required:** Explicit planning decision: "Should ledger.jsonl cross machines via /context-sync?" The default recommendation is YES (user-scoped lineage should travel with the user). But this is a legitimate user decision about multi-machine lineage semantics — surface it explicitly rather than assuming.

### Dispute 5 — Profile shape "3 fields per unit type"

**Conflict:** C-026/C-028 lock in 3 fields per unit type. Contrarian Challenge 4 identified that the `companion_files` population algorithm is unspecified — without a population algorithm, `companion_files` is empty in practice.

**Verdict:** The 3-field schema is correct (derived from BRAINSTORM Challenge 6 resolution, T1 authority). The `companion_files` population algorithm is a genuine implementation gap, not a count error. The schema stays at 3 fields; the algorithm must be specified before implementation.

**Planning action required:** Add as a required planning deliverable: "Specify the companion_files population algorithm, including the heuristic scan approach, confidence threshold for inclusion, default-empty fallback with `discovery_gap` flag, and future convention-file upgrade path."

---

## Contrarian-Surfaced Planning Musts

These three risks from the contrarian challenge require explicit resolution before the planning document can be considered complete.

### Must-resolve 1: D1/D2 field budget conflict (addressed by Dispute 1)

The 12-field ledger cap was confirmed as the v1 baseline by the dispute resolver. However, the contrarian correctly emphasizes that the cap's value is in preventing gold-plating, not in the specific number 12. Planning must explicitly document what `/sync-back`'s three-way diff needs at runtime and confirm whether 12 fields are sufficient — rather than inheriting 12 from research without validation. The v1.1 candidate documentation (with promotion criteria) is the mechanism for handling this.

### Must-resolve 2: profile_slice_hash circular dependency (resolved with concession)

The comprehension cache key references a hash of recipe-relevant profile fields, but no recipe library exists to determine which fields are relevant. The resolution: at v1, `profile_slice_hash` hashes the full profile object. The slice optimization happens post-recipe-library. The 0.8 fast-path suppression threshold is a named calibration constant, not a hard-coded magic number. The first post-implementation calibration review is triggered at the 50-port corpus point.

### Must-resolve 3: `ledger.jsonl` missing from context-sync inventory (addressed by Dispute 4)

The 18-category inventory explicitly omits `ledger.jsonl`. Without adding it as category 19, the multi-machine lineage use case silently fails on first adoption of a third machine. Planning must make this a visible explicit decision — default recommendation is to add it, but the user should decide.

---

## OTB Alternatives for Planning Review

The OTB challenger surfaced 8 alternatives. Three deserve planning-time attention.

### Alternative 1: Per-file frontmatter lineage markers (hybrid form)

Not as a ledger replacement — as a complement. A moved file with `lineage_source: SoNash@abc123/...` in its YAML frontmatter is self-describing without a ledger read. The planner should decide whether this redundancy earns its weight. Cost is near-zero; it makes the ledger less load-bearing for the most common "where did this file come from?" question. Downside: frontmatter dies when the file is deleted; the ledger survives. Upside: the file is self-describing in any tool that reads frontmatter.

### Alternative 2: GitHub API as optional discovery fast-path

For unowned repos, the bare-clone approach (C-030) is correct as the default — it works for any git-accessible repo without authentication. For GitHub-hosted repos where a token is available, the GitHub API avoids scratch-directory management entirely. The planner should note whether this optimization (conditional branch in profile discovery) earns its implementation complexity, or whether bare-clone-always is cleaner.

### Alternative 3: `port_recipe.md` as understanding-layer short-circuit

Each portable unit could carry its own `port_recipe.md` adjacent to it. When the `/port` companion finds this file, it uses the recipe directly without a model comprehension pass. The comprehension cache serves units without adjacent recipes. The planner should decide the priority order: (1) adjacent `port_recipe.md`, (2) comprehension cache hit, (3) full understanding-layer dispatch.

---

## Gap-Pursuit Findings

Eighteen new claims from the G1 (codebase) and G2 (web) gap pursuers, organized by topic. These are additive findings that did not change existing claims but revealed gaps in the original synthesis.

### Tenet identification (C-G1, C-G2)

The `type: tenet` frontmatter value exists in `enums.json` but is completely unused in practice. Every tenet-like file uses `type: reference`. The only currently-working tenet identification mechanism is the `t[N]_` filename prefix pattern — for example, `t3_convergence_loops.md` [C-G1]. Planning must choose one mechanism and commit to it before implementing the context-sync walk [C-G2]. The binary choice: (a) use `/^t\d+_/` filename pattern (works today, no backfill needed), or (b) adopt `type: tenet` frontmatter and backfill existing files (cleaner long-term, requires a one-time migration). There is no middle ground — the implementation needs one authoritative signal.

**Recommendation:** Default to filename-pattern detection for v1. Backfilling frontmatter is low-risk and high-value but should not block implementation.

### Project-directory encoding (C-G3, C-G4, C-G5, C-G9)

`~/.claude/projects/` directory names are NOT cryptographic hashes — they are deterministic, reversible path-encodings [C-G3]. The algorithm: `path.replace(':', '--').replace(/[\\/]/g, '-')`. Verified against 4+ observed directory names (e.g., `C:\Users\jason\Workspace\dev-projects\JASON-OS` → `C--Users-jason-Workspace-dev-projects-jason-os`).

This matters for multi-machine sync because different absolute paths on different machines produce different directory names [C-G4]. The sync tool cannot use the encoded path as a stable cross-machine identifier. No `project.json` manifest file exists inside the directory to recover the original path [C-G5]. The stable cross-machine identifier should be the git remote URL or repo name — not the encoded path.

**Recommendation:** Document the encoding algorithm in planning artifacts so the project-directory walk logic is implemented correctly. Use git remote URL as the stable cross-machine project identifier.

### MCP configuration (C-G6, C-G7, C-G8)

The current canonical MCP config file for user-level and local-scoped servers is `~/.claude.json` — at the home directory root, NOT `~/.claude/mcp.json` [C-G6]. The `~/.claude/mcp.json.bak` file on this machine is a migration artifact from the old format. Project-scoped MCP servers live in `.mcp.json` at the project root (version-controlled); JASON-OS currently has no such file [C-G7].

`~/.claude.json` needs its own sync-unit row in the D9 context-sync inventory. It is missing from D9's confirmed 18-row table. Scope-tag: `machine` (contains project-path keys that differ per machine, potential credentials) [C-G8].

**Recommendation:** Add `~/.claude.json` as a named machine-scoped entry in the context-sync inventory. Document `~/.claude/mcp.json` as the deprecated old format so any sync logic targeting it finds nothing on current installations.

### Ephemeral-machine handling (C-G201 through C-G205)

No dotfiles manager surveyed has a native ephemeral-host concept [C-G201 through C-G205]. chezmoi's user-authored `$ephemeral` boolean (detecting `CODESPACES` and `REMOTE_CONTAINERS_IPC` env-vars plus username heuristics) is the canonical prior art — but it is user-authored, not a chezmoi built-in. home-manager produces evaluation errors on unknown hostnames. GNU Stow has no concept at all.

`CI=true` is set universally across CI platforms but no tool natively reads it as an ephemeral signal [C-G202]. JASON-OS v1 needs two lines of code: `process.env.CI === 'true' || process.env.CODESPACES === 'true'` → exit 0 [C-G203].

**Recommendation:** Add the two-line ephemeral guard to the `/context-sync` implementation spec as a v1 requirement, not a v2 enhancement.

### Settings.local.json sub-file granularity — sidecar pattern (C-G206 through C-G209)

VS Code's approach to this problem (`settingsSync.ignoredSettings`) is a global denylist — not per-machine, not solving the problem [C-G206]. chezmoi's `modify_` templates work but require chezmoi as a dependency [C-G207]. No ecosystem has a clean, lightweight per-key JSON portability primitive.

The cheapest v1 mechanism is the sidecar file pattern: `settings.local.machine.json` (gitignored). Machine-bound entries move to the sidecar; sync only touches `settings.local.json`; runtime merges both files [C-G208]. The JSON Pointer denylist is the second-cheapest option for true per-key granularity [C-G209].

**Recommendation:** Adopt the sidecar file pattern as the v1 answer to the sub-file granularity question (open question 2). Define the merge logic (sidecar wins on key conflict) in the implementation spec.

---

## Open Questions for Planning

These are questions that the full pipeline (research + verification + challenges + gap pursuit) has NOT resolved — they require planning decisions.

1. **`unit_type` and `verdict` enum final values.** The exact enum is not locked. Planning must confirm whether `memory`, `config`, `keybindings` should be separate unit types vs. collapsed into `context-artifact`, and whether `scope-filtered-copy` should replace `copy-as-is` for context-sync records.

2. **`settings.local.json` sub-file sync granularity.** The sidecar file pattern (C-G208) is the research recommendation. Planning must confirm this choice and define the merge logic before implementation begins. *(Partially resolved by gap pursuit: sidecar recommended; planning must ratify.)*

3. **CLAUDE.md tweak block identification convention.** Treating CLAUDE.md tweaks as sub-file iteration units requires a sentinel comment or section-header naming convention. No convention exists yet in JASON-OS. Planning must define one before implementation.

4. **Tenet identification mechanism.** Gap pursuit confirmed the binary choice: filename prefix `/^t\d+_/` (works today) vs adopting `type: tenet` frontmatter with backfill. Planning must decide which is authoritative. *(Gap pursuit recommends filename prefix for v1.)*

5. **The `memory_type → scope-tag` mapping table.** The memory `type` frontmatter field provides a natural scope-classification mechanism. The mapping is not yet formally defined. Planning should define it once; the walk uses it automatically.

6. **`profile_slice_hash` — which profile fields are recipe-relevant.** Resolved for v1 with a concession: hash the full profile object, optimize post-recipe-library. Planning must implement this as a named constant in the code (not a magic number) so the optimization is a one-line change when the time comes.

7. **Orphan detection mechanism for failed ledger appends.** D3 names "orphan detection on next scan" as the recovery mechanism but does not define the scan mechanics. Planning must define what makes a movement "matchable" as an orphan vs. an independent creation.

8. **Cache compaction trigger.** The append-log design requires periodic compaction (last-wins semantics). Compaction trigger (size threshold, time-based, on-startup) is not specified.

9. **Whether `shapes` in the profile is always fully populated or only for observed unit types.** Planning must decide between always-populate-with-defaults and populate-only-for-observed-types. The `companion_files` population algorithm (Dispute 5 action item) must be specified regardless of which choice is made.

10. **Pre-commit gate for absolute path leaks into committed files.** The gap is confirmed: no pre-commit hook exists to prevent future PII leaks of the type fixed by commit 088a077. Context-sync's Layer 2 detection catches the same patterns at sync time but not at commit time. Planning should decide whether to add a pre-commit hook or rely on sync-time detection.

11. **Ledger path normalization (Windows/Unix).** V1 surfaced that ledger path fields on Windows may contain backslashes. Planning must define whether paths are normalized to forward slashes at write time.

12. **Ledger.jsonl as context-sync category 19.** Explicit planning decision required: should the ledger travel across machines? Default recommendation from Dispute 4 is YES (add as category 19, user-scoped, `source_wins: true`). But this is a legitimate user decision about whether multi-machine lineage should be unified.

13. **Ephemeral-machine guard implementation.** Should the `CI=true || CODESPACES=true` guard live in the context-sync skill itself or in a shared utility? Planning must specify.

---

## Pre-/deep-plan Deliverables Status

The four pre-plan deliverables from the brainstorm were:

**1. Ledger record schema (field set, edge model, persistence strategy)**
Status: COMPLETE. 12-field v1 minimum defined [C-001], v1.1 candidates documented with promotion criteria (Dispute 1), append-only event log confirmed [C-002], forward-pointer edge model confirmed [C-008], JSONL at `.claude/state/ledger.jsonl` confirmed [C-013], locking via `withLock` confirmed [C-015], rollback via ledger-last ordering confirmed [C-016]. Open items: path normalization [open question 11], ledger as context-sync category 19 [open question 12].

**2. Target-process-profile data shape**
Status: COMPLETE. 8-field top-level [C-026], 6-field gate records [C-027], 3-field-per-unit-type shapes block [C-028], location at `.claude/state/profiles/<repo-name>.json` [C-029]. Open items: `companion_files` population algorithm [open question 9, Dispute 5], tenet identification mechanism [open question 4].

**3. Context-sync drift record and mechanism**
Status: COMPLETE. 7-field drift record shape confirmed [C-034], 5-state walk/compare/decide loop defined [C-034], false-positive mitigations defined [C-035], cross-machine handling via P+R hybrid defined [C-036], 18-category source inventory confirmed with framing corrected [C-033]. Gap-pursuit additions: ephemeral-machine guard [C-G203], sidecar file pattern for sub-file granularity [C-G208], `~/.claude.json` as new machine-scoped inventory entry [C-G8]. Open items: CLAUDE.md block identification [open question 3], tenet identification [open question 4], memory_type → scope-tag mapping [open question 5], settings.local.json sidecar ratification [open question 2].

**4. Understanding-vs-mechanical cache key**
Status: COMPLETE with known concession. 4-field key composition confirmed [C-040], content hash excluded from key [C-041], v1 concession: profile_slice_hash hashes full profile (optimize post-recipe-library) [challenge 3 resolution], 4 invalidation triggers defined [C-043], separate cache file at `.claude/state/comprehension-cache.jsonl` confirmed [C-044], dashboard visibility requirement confirmed [C-045]. Open items: 0.8 confidence threshold is a named calibration constant not a hard constant, compaction trigger [open question 8].

---

## Challenges and Limitations

### Contrarian challenges not fully resolved

**Challenges 5 and 6 (MAJOR):** The cross-machine design was grounded in a two-machine personal setup. The ephemeral-machine gap (CI runners, Codespaces) is addressed by the two-line guard found in gap pursuit [C-G203] but the broader "machine_type" classification system (Challenge 5 mitigation) is deferred to v2. The metric calibration concerns (Challenge 6 — 5-second lock timeout for ledger-scale reads, 0.8 fast-path threshold, 60% cache hit rate) remain open as post-implementation calibration items. The lock timeout concern specifically deserves mention: 5 seconds was calibrated for small state files, but a growing ledger on a cold Windows disk could exceed this at scale.

**Challenge 8 (MINOR):** The bootstrap ordering concern is partially resolved. Contrarian correctly identified that the shared schema-versioning policy (C-048) requires all four schemas to be stable before it can be written. The recommended sequencing: (1) context-sync drift record first, (2) ledger schema second, (3) profile discovery third, (4) comprehension cache last. The shared policy should be written after step 2.

### UNVERIFIABLE claims that require post-implementation calibration

Three metric claims cannot be validated before implementation: the 0.8 fast-path suppression threshold [C-045], the ">60% hit rate" aspirational target [C-070], and the sharding threshold range [C-018]. All should be implemented as named constants in the codebase rather than magic numbers, with explicit review points.

### Absence claims that may not hold

C-055 (no dotfile manager provides automated machine-bound detection without user opt-in) is rated MEDIUM confidence — it is an absence claim across 4 tools that was not comprehensively verified. Gap pursuit confirmed this for the specific ephemeral-host question, but the Layer 2 novelty claim (content-time detection is novel) carries inherent uncertainty.

---

## Confidence Summary

**Overall confidence: HIGH**

The core structural decisions in all four strands have HIGH confidence, grounded in direct codebase reads of JASON-OS infrastructure and confirmed against multiple independent external systems. Version 2.0 downgrades several calibration parameters from HIGH to ESTIMATED based on verification findings.

| Strand | Overall | Post-verification notes |
|---|---|---|
| Ledger (A1+A2+A3+A4) | HIGH | All persistence/locking decisions grounded in existing safe-fs.js primitives and verified at exact line numbers. A4's rejection of the full ledger for context-sync is definitive. Count correction: 4 JSONL files, not 6. |
| Profile discovery (B1+B2+B3) | HIGH | B1 read all signal files directly. B2 confirmed profile shape from BRAINSTORM constraints. Companion_files population algorithm is a planning gap, not a confidence issue. |
| Context-sync mechanism (C1+C2+C3) | HIGH | C1's algorithm is chezmoi-validated. C2 read filesystem directly (18 sync-unit classifications confirmed). C3's P+R hybrid supported by codebase evidence. Gap pursuit added ephemeral-machine guard + sidecar pattern. |
| Understanding-mechanical cache (D1) | HIGH (structure); ESTIMATED (calibration) | Cache key design validated against 4 production build systems. profile_slice_hash v1 concession: hash full profile. Confidence threshold (0.8) and hit-rate target (>60%) are ESTIMATED parameters. |

---

## Claim Registry

All 98 claims (C-001 through C-080 original, C-G001 through C-G018 gap-pursuit additions).

| ID | Strand | Confidence | Verification | Summary |
|---|---|---|---|---|
| C-001 | ledger | HIGH | UNVERIFIABLE (design baseline) | 12-field v1 minimum ledger record |
| C-002 | ledger | HIGH | VERIFIED | Append-only event log |
| C-003 | ledger | HIGH | VERIFIED | parent_record_id unnecessary |
| C-004 | ledger | HIGH | VERIFIED | status field redundant |
| C-005 | ledger | HIGH | UNVERIFIABLE (principle sound) | notes field rejected |
| C-006 | ledger | HIGH | VERIFIED | git-subrepo negative example |
| C-007 | ledger | HIGH | VERIFIED | Nix derivation positive analogue |
| C-008 | ledger | HIGH | VERIFIED | Forward pointer + content hash edge model |
| C-009 | ledger | MEDIUM | VERIFIED | No bidirectional pointers |
| C-010 | ledger | HIGH | UNVERIFIABLE (demoted to v1.1) | source_status for repo-evolution |
| C-011 | ledger | HIGH | VERIFIED | Bulk update for repo-rename events |
| C-012 | ledger | HIGH | VERIFIED | One record per hop for transitive edges |
| C-013 | ledger | HIGH | CONFLICTED-RESOLVED | Location: .claude/state/ledger.jsonl; count corrected to 4 JSONL files |
| C-014 | ledger | HIGH | VERIFIED | Ledger must not be git-tracked |
| C-015 | ledger | HIGH | VERIFIED | withLock at safe-fs.js:614-621 |
| C-016 | ledger | HIGH | VERIFIED | Ledger record is last write in movement |
| C-017 | ledger | MEDIUM | UNVERIFIABLE → PLANNING DECISION | Ledger synced by context-sync — must be explicit category 19 |
| C-018 | ledger | HIGH | CONFLICTED-RESOLVED | Sharding threshold: 2,600–4,000+ (range, not hard constant) |
| C-019 | ledger | HIGH | VERIFIED | Schema versioning mirrors EVOLUTION.md |
| C-020 | ledger | MEDIUM | VERIFIED | EVOLUTION.md §8 mirror rule does not apply to ledger |
| C-021 | ledger | HIGH | VERIFIED | /context-sync does not use full ledger |
| C-022 | profile | HIGH | VERIFIED | 7 signal-carrying file types for owned repo discovery |
| C-023 | profile | HIGH | VERIFIED | .husky/_/ skipped (auto-generated) |
| C-024 | profile | HIGH | VERIFIED | settings.local.json not remotely discoverable |
| C-025 | profile | HIGH | VERIFIED | JASON-OS deny list: 4 patterns confirmed |
| C-026 | profile | HIGH | VERIFIED | 8 top-level profile fields |
| C-027 | profile | HIGH | VERIFIED | 6-field gate records |
| C-028 | profile | HIGH | VERIFIED | 3-field shapes block; companion_files population = planning gap |
| C-029 | profile | MEDIUM | VERIFIED with caveat | Profile location proposed, not yet implemented |
| C-030 | profile | HIGH | VERIFIED | Bare clone for unowned repo discovery |
| C-031 | profile | HIGH | VERIFIED | isSafeToWrite extension with forbiddenRoots |
| C-032 | profile | HIGH | VERIFIED | 4 unowned-mode profile differences |
| C-033 | context-sync | HIGH | CONFLICTED-RESOLVED | 18 sync-unit classifications across ~12 distinct implementations |
| C-034 | context-sync | HIGH | VERIFIED | 8-step drift detection algorithm |
| C-035 | context-sync | HIGH | VERIFIED | 4 normalization rules for hash stability |
| C-036 | context-sync | HIGH | VERIFIED | Layer 1 (machine_exclude) + Layer 2 (content-time detection) hybrid |
| C-037 | context-sync | HIGH | VERIFIED | Scope-tag enum stays at 5 values |
| C-038 | context-sync | HIGH | VERIFIED | Empirical walk to find ~/.claude/projects/<encoded>/ |
| C-039 | context-sync | HIGH | VERIFIED | Proposal loop; BOTH-DRIFTED cannot be bulk-resolved |
| C-040 | understanding | HIGH | VERIFIED | Cache key: unit_type:source_repo:target_repo:profile_slice_hash |
| C-041 | understanding | HIGH | VERIFIED | content_hash excluded from key; in value as staleness check |
| C-042 | understanding | HIGH | VERIFIED | profile_slice_hash hashes only recipe-relevant fields (v1 concession: full profile) |
| C-043 | understanding | HIGH | VERIFIED | 4 cache invalidation triggers |
| C-044 | understanding | HIGH | VERIFIED | Cache at .claude/state/comprehension-cache.jsonl |
| C-045 | understanding | HIGH | UNVERIFIABLE (partial) | Dashboard visibility: VERIFIED; 0.8 threshold: ESTIMATED |
| C-046 | cross-cutting | HIGH | VERIFIED | Always-last-step rule applies to all four verbs |
| C-047 | cross-cutting | HIGH | REFUTED (partial) | Count corrected: 4 JSONL files, not 6; house-style claim correct |
| C-048 | cross-cutting | HIGH | VERIFIED | Schema versioning mirrors across all four data structures |
| C-049 | cross-cutting | HIGH | VERIFIED | No-fire-and-forget principle applies across all strands |
| C-050 | cross-cutting | HIGH | VERIFIED | Security pattern battery reusable across three strands |
| C-051 | cross-cutting | HIGH | VERIFIED | Mixed-scope splitting at item level, not category level |
| C-052 | context-sync | HIGH | VERIFIED | chezmoi uses SHA256 hashes in persistent state |
| C-053 | context-sync | HIGH | VERIFIED | CRLF normalization must be default-on |
| C-054 | context-sync | HIGH | VERIFIED | RFC 8785 JCS for JSON hashing stability |
| C-055 | context-sync | MEDIUM | UNVERIFIABLE | No dotfile manager has automated machine-bound detection (absence claim) |
| C-056 | context-sync | HIGH | VERIFIED | config.local.toml contains confirmed live API key |
| C-057 | context-sync | HIGH | VERIFIED | settings.local.json mixes portable and machine-bound entries |
| C-058 | cross-cutting | HIGH | CONFLICTED-RESOLVED | 60 files confirmed; 776 substitutions (not 782) |
| C-059 | ledger | HIGH | VERIFIED | Bootstrap paradox: context-sync ships first |
| C-060 | context-sync | HIGH | VERIFIED | User-level and project-level agents are distinct directories |
| C-061 | context-sync | HIGH | VERIFIED | Project skills belong to /port, not /context-sync |
| C-062 | context-sync | HIGH | VERIFIED | memory_type frontmatter provides natural scope-classification |
| C-063 | context-sync | HIGH | VERIFIED | type:tenet unused; identification by t[N]_ prefix only |
| C-064 | understanding | HIGH | VERIFIED | Two-level cache design mirrors ccache and Bazel |
| C-065 | understanding | MEDIUM | UNVERIFIABLE | Global cache invalidator at v1; 10+ recipe threshold is speculation |
| C-066 | ledger | HIGH | VERIFIED | SPDX 3.0.1 relationship records as external reference |
| C-067 | ledger | HIGH | VERIFIED | Content hash alone cannot represent lineage |
| C-068 | ledger | HIGH | VERIFIED | git log --follow fails on heavy modification during rename |
| C-069 | profile | HIGH | UNVERIFIABLE | Node.js v22 symlink bypass caveat (scope limitation) |
| C-070 | understanding | MEDIUM | UNVERIFIABLE | >60% cache hit rate is aspirational target, not measurable pre-implementation |
| C-071 | ledger | HIGH | VERIFIED | Scope-tag enum applies without modification |
| C-072 | ledger | HIGH | VERIFIED | safeAppendFileSync + withLock (not safeAtomicWriteSync) for ledger |
| C-073 | ledger | HIGH | VERIFIED | Torn lines non-fatal via safeParseLine + readJsonl skip |
| C-074 | profile | HIGH | VERIFIED | No ESLint/Prettier in JASON-OS; SonarCloud enforces style |
| C-075 | profile | HIGH | VERIFIED | run-node.sh enforces HOOKS_DIR confinement |
| C-076 | profile | HIGH | VERIFIED | JASON-OS workflows use SHA-pinned actions throughout |
| C-077 | profile | HIGH | VERIFIED | Branch protection not at GitHub API level; Husky hook enforces it |
| C-078 | profile | HIGH | UNVERIFIABLE (prior art imprecise) | SHA staleness design is sound; cited analogies are approximate |
| C-079 | context-sync | HIGH | VERIFIED | Husky _shared.sh vs .husky/_/ — distinct sync treatments |
| C-080 | context-sync | HIGH | VERIFIED | Per-repo .git/config is NOT a context-sync target |
| C-G001 | context-sync | HIGH | CODEBASE (G1) | No file uses type:tenet frontmatter; t3_convergence_loops.md uses type:reference |
| C-G002 | context-sync | HIGH | CODEBASE (G1) | Tenet identification by t[N]_ filename prefix only; type:tenet is schema-valid but uninstantiated |
| C-G003 | context-sync | HIGH | CODEBASE (G1) | ~/.claude/projects/ names are reversible path-encodings, not hashes |
| C-G004 | context-sync | HIGH | CODEBASE (G1) | Encoded project dir is machine-local; different paths on different machines |
| C-G005 | context-sync | HIGH | CODEBASE (G1) | No project.json manifest inside encoded project dir |
| C-G006 | context-sync | HIGH | CODEBASE (G1) | Canonical MCP config is ~/.claude.json (home root), not ~/.claude/mcp.json |
| C-G007 | context-sync | HIGH | CODEBASE (G1) | Project-scoped MCP in .mcp.json (project root); JASON-OS has none |
| C-G008 | context-sync | HIGH | CODEBASE (G1) | ~/.claude.json needs its own sync-unit row; scope-tag: machine |
| C-G009 | context-sync | HIGH | CODEBASE (G1) | Path-encoding algorithm: replace ':' with '--', '\' or '/' with '-' |
| C-G010 | context-sync | HIGH | WEB (G2) | chezmoi has no built-in ephemeral-host concept; user-authored $ephemeral pattern |
| C-G011 | context-sync | HIGH | WEB (G2) | CI=true is universal across CI platforms; no dotfile manager natively reads it |
| C-G012 | context-sync | HIGH | WEB (G2) | Cheapest v1 ephemeral guard: CI=true OR CODESPACES=true → exit 0 |
| C-G013 | context-sync | HIGH | WEB (G2) | home-manager has no "bail on unknown hostname" feature; evaluation error on unknown hostname |
| C-G014 | context-sync | HIGH | WEB (G2) | GNU Stow has no ephemeral detection; all CI logic must live in caller shell script |
| C-G015 | context-sync | HIGH | WEB (G2) | VS Code settingsSync.ignoredSettings is global denylist; issue #89627 open since 2020 |
| C-G016 | context-sync | HIGH | WEB (G2) | chezmoi modify_ templates provide per-key JSON patching but require chezmoi as dependency |
| C-G017 | context-sync | HIGH | WEB (G2) | Cheapest v1 per-key mechanism: sidecar file settings.local.machine.json (gitignored) |
| C-G018 | context-sync | MEDIUM | WEB (G2) | Second-cheapest: gitignored JSON Pointer denylist (~25 lines Node.js) |

---

## Sources (Selected Tier 1)

All research was primarily codebase-grounded (direct reads of JASON-OS files) with external surveys for validation. Key external sources:

- chezmoi architecture docs and status command reference (HIGH, official) — validated drift detection approach
- chezmoi Containers and VMs guide (HIGH, official) — confirmed ephemeral-machine handling patterns
- RFC 8785 JSON Canonicalization Scheme (HIGH, IETF standard) — JSON key-order normalization
- Bazel remote caching docs (HIGH, official) — validated cache key design
- ccache manual (HIGH, official) — validated content-hash-in-value pattern
- git-show, git-ls-tree, git-clone official docs (HIGH) — validated unowned-mode mechanism
- SPDX 3.0.1 RelationshipType vocabulary (HIGH, official) — validated edge representation options
- VS Code Settings Sync documentation (HIGH, official) — confirmed sub-file granularity limitation
- VS Code issue #89627 (HIGH, confirmed open) — confirmed per-machine ignore not supported
- Claude Code MCP documentation (HIGH, official) — confirmed ~/.claude.json as canonical MCP config

All codebase sources carry HIGH trust (direct ground-truth reads).

---

## Methodology

Phase 1: 11 parallel searcher agents (D1–D11) covering four strands (A: ledger, B: profile, C: context-sync, D: understanding-mechanical). Each agent read the BRAINSTORM.md and PHASE_0_LANDSCAPE.md as context, then surveyed external sources and codebase files for their sub-question.

Phase 2: Initial synthesis (version 1.0).

Phase 2.5 (verification): 2 verifiers (V1: ledger + understanding, 37 claims; V2: profile + context-sync + cross-cutting, 43 claims). Combined verdict: 62 VERIFIED, 4 REFUTED sub-claims, 10 UNVERIFIABLE, 5 CONFLICTED.

Phase 3 (challenges): Contrarian (8 challenges, 2 Critical 4 Major 2 Minor) + OTB (8 alternatives, 3 planning-time look). Dispute resolver resolved 5 disputes.

Phase 3.5 (gap pursuit): G1 (codebase gaps, 9 claims: tenet identification, project-hash encoding, MCP config) + G2 (web gaps, 9 claims: ephemeral-machine, sub-file granularity). Total new claims: 18 (C-G001 through C-G018).

Phase 3.97 (final synthesis): This document (version 2.0).

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-23 | Initial synthesis — 80 claims, 4 strands, 11 D-agents |
| 2.0 | 2026-04-23 | Post-gap-pursuit final synthesis: 4 refuted sub-claims corrected (6→4 JSONL files, .gitignore line 46 not 47, 776 not 782 substitutions); 5 disputes resolved (field budget, inventory granularity, sharding threshold, ledger inclusion, companion_files algorithm); 3 contrarian planning-musts incorporated; 3 OTB alternatives documented; 18 gap-pursuit claims added (C-G001–C-G018: tenet pattern, project-path encoding, MCP config, ephemeral-machine guard, sidecar file pattern); profile_slice_hash v1 concession documented; total claims 98 |
