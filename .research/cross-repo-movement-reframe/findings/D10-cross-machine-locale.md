# Findings: D10 — Cross-Machine Locale Boundaries (Home vs. Work)

**Searcher:** deep-research-searcher (C3)
**Profile:** web + codebase + reasoning
**Date:** 2026-04-23
**Sub-Question IDs:** C3 (D10)

---

## 1. Sub-question

How does the tool handle cross-machine locale boundaries (home vs. work) when
user-scoped content has machine-specific elements?

Four sub-parts: (1) symptom inventory — what actual items get tagged "user"
but are functionally machine-specific; (2) three distinguishing mechanisms —
per-record flag (P), scope-tag refinement (Q), content-time pattern detection
(R); (3) pre-existing patterns in JASON-OS; (4) recommendation + integration
with C1's walk/compare loop and C2's drift record.

---

## 2. Approach

- **Codebase reads:** `scripts/lib/sanitize-error.cjs`, `scripts/lib/security-helpers.js`,
  `.claude/settings.local.json`, `.claude/settings.json`, `.claude/canonical-memory/`
  contents and frontmatter shapes.
- **Git log:** Inspected commit `088a077` (PR #10 R2 CRITICAL — "scrub absolute user
  paths") for the transformer's scope and resolution.
- **Web — chezmoi docs:** `manage-machine-to-machine-differences/`, template
  variables reference, `--autotemplate` behavior, `.chezmoiignore` conditionals.
- **Web — yadm docs:** Alternate files system, class assignment mechanism.
- **Web — general search:** Heuristic detection of machine-bound content; no prior
  art found for automated detection without explicit opt-in.
- **Sibling findings read:** D4 (A4's drift record shape including `machine_exclude`
  field), D8 (C1's walk/compare/decide loop and `machine_exclude` integration).

---

## 3. Findings — Symptom Inventory

[CONFIDENCE: HIGH for items directly observed in JASON-OS codebase; MEDIUM for
items inferred from structure + cross-machine patterns]

The items below are all currently tagged or naturally implied as scope `user`
(they belong to a person, not a specific project). But each has a machine-bound
dimension that causes breakage if synced blindly.

| Item type | Concrete example from JASON-OS | How often it crosses machines | Breakage mode if it crosses unintentionally |
|---|---|---|---|
| **`settings.local.json` allowedPaths entries** | `"Bash(mkdir -p C:/Users/<user>/.claude/projects/C--Users-<user>-Workspace-dev-projects-jason-os/memory)"` — observed directly in `.claude/settings.local.json` line 8 | Every sync of settings.local.json | Work machine applies a home-machine absolute path to its Bash allow-rule; rule silently fails (path doesn't exist) or worse, allows unintended path on work machine |
| **`settings.local.json` copy command** | `"Bash(cp 'C:/Users/<user>/Workspace/dev-projects/jason-os/.claude/canonical-memory/*.md' C:/Users/<user>/..."` — observed in settings.local.json line 22 | Every sync | Work machine's Claude attempts a cp from a path that doesn't exist; command errors at runtime |
| **Canonical memory prose referencing locale** | `user_communication_preferences.md`: "Two-locale: work (jbell, restricted Windows) and home (jason, unrestricted)" — the prose itself is correct and should travel, but the username difference (jbell vs jason) in the text is locale-specific | Low — prose is read by humans, not parsed by tools | No runtime breakage, but prose accuracy degrades on the work machine if it refers only to "jason" paths |
| **Slash-command aliases that hard-code project paths** | A command alias that invokes `C:/Users/<user>/Workspace/dev-projects/JASON-OS/scripts/foo.js` | Medium — any alias created on home machine that runs a project script | Alias fails silently or errors on work machine where the path is `C:/Users/jbell/...` |
| **Keybindings referencing machine-installed tools** | A chord assigned to open a specific binary at an absolute path (e.g., a local editor install) | Low — Claude Code keybindings rarely reference local binaries | Tool invocation fails; keybinding silently does nothing |
| **Status-line binary path** | `~/.claude/statusline/jason-statusline-v2.exe` — machine-specific binary per CLAUDE.md §1 (gitignored); the `.claude/statusline-command.sh` references it | Every sync of statusline config | Work machine tries to invoke binary that doesn't exist or has wrong version |
| **Git config signing key / credential helper** | `~/.gitconfig [credential]` helper = a path to a platform-specific binary (e.g., Windows Credential Manager vs. macOS Keychain) | Every sync of git config overrides | Git operations on the receiving machine use wrong credential helper; auth fails |
| **Env variables that reference local paths** | `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` (generic) travels fine; but a hypothetical `EDITOR=/home/jbell/.local/bin/hx` does not | Depends on value | Env var set to non-existent path; tools fail to launch |
| **`~/.claude/projects/<hash>/` directory naming** | The hash is derived from the project's absolute path (e.g., `C--Users-<user>-Workspace-dev-projects-JASON-OS` vs. `C--Users-jbell-...`); user-level memory files live under different hash directories on each machine | Every attempt to read project memory cross-machine | Memory files are "orphaned" — tools look for them under a hash that differs per machine; memories not loaded |
| **Husky local hooks referencing project root** | `.husky/_/husky.sh` itself is generated and references `$PATH` etc., but any user-added pre-push hook that contains an absolute path would be machine-bound | Low — husky local is generated, not authored | Hook errors at pre-commit time on receiving machine |

### Frequency summary

High crossing frequency (every sync if not blocked): `settings.local.json` allowedPaths
+ copy commands, status-line config, `~/.claude/projects/` hash mismatch.

Medium crossing frequency: slash-command aliases, git credential helpers, env vars.

Low crossing frequency: keybindings, prose references to usernames, husky local.

---

## 4. Findings — Three Distinguishing Mechanisms

### Approach P — Per-record flag (`machine_exclude: boolean`)

A4 already named this field in the drift record. Each drift record has one
`machine_exclude` boolean. C1 (D8) implements it: when `machine_exclude = true`,
the walk pre-filters the unit and never reaches the compare step.

**Strength:**
- Zero false positives once set: excluded units are invisible to the compare loop.
- Integrates with C1's walk at the correct level — a pre-filter before hashing,
  not a post-hoc override.
- Consistent with house style: the drift record is the authority for context-sync
  state; adding one more boolean field costs nothing.
- One-time per unit: the user answers the machine-bound question once; the flag
  persists in the drift record so it is never re-asked.
- Works for any content type, any category — no assumptions about content shape.

**Weakness:**
- Requires user to answer the question at first-sync time for every potentially
  machine-bound unit. On a machine with 20+ `settings.local.json` entries, this
  is tedious if done per-entry.
- Boolean is coarse: a unit that is "mostly travels except for one path-containing
  line" cannot be expressed as `machine_exclude = true` (blocks the whole unit)
  or `machine_exclude = false` (lets the whole unit through, including the bad line).
- No automatic safety net: a user who forgets to set `machine_exclude = true` on
  `settings.local.json` on first sync will copy machine-bound paths to the work
  machine before the tool has a chance to ask.

**What it forces on the user:**
One-time opt-in decision per unit at first sync. Manageable for files (10–20
decisions total). Potentially tedious if paths expand to env-var-level granularity.

**Integration cost:**
LOW. The field already exists in A4's schema. C1's walk already reads it. The
only new work: the "is this machine-specific?" prompt must fire at NEW state
(first discovery) for categories that are known-to-be-risky (see recommendation).

---

### Approach Q — Scope-tag refinement (`user-machine-overlay` or `user-bound`)

Extend the five-value scope-tag enum (universal / user / project / machine /
ephemeral) with a sixth value that means "nominally user-scoped but machine-bound
on this installation."

**Strength:**
- Expresses the semantic distinction at the data model level, not the record level.
- The scope-tag is already the shared vocabulary for the entire tool ecosystem.
  A new value here makes the distinction visible to all companions, not just
  context-sync.

**Weakness:**
- The existing `machine` scope tag already covers the machine-bound case. The
  problem being addressed is items that are *mislabeled* as `user` when they
  should be `machine` — not a gap in the tag vocabulary.
- Binary: a CLAUDE.md tweak that is 95% portable and 5% machine-bound gets
  labeled `user-machine-overlay` in full, blocking the whole item even though
  only one line is the problem.
- Enum extension is a schema change with downstream impact. PHASE_0_LANDSCAPE.md
  calls the five-value enum "well-validated across five independent systems"
  and explicitly survivors it unchanged [1]. Adding a sixth value requires
  justification stronger than "would be convenient here."
- Doesn't help context-sync at runtime: the scope-tag is a static label on the
  source file. At sync time the tool still needs a runtime check for whether this
  instance of this unit is machine-bound. The scope-tag alone cannot answer that
  because the same file can be machine-bound on one machine and portable on another.

**What it forces on the user:**
Requires tagging source files with the new scope value — a manual curation step
that must happen before context-sync can honor the distinction.

**Integration cost:**
HIGH relative to its benefit. Requires updating the enum definition
(`.claude/sync/schema/enums.json`), updating schema documentation, updating
any derive/validate logic that reads the enum, and training the user on the
new value. None of this is needed to solve the actual problem.

**Verdict for this sub-question:** Approach Q is not recommended. The existing
`machine` scope tag is the right home for truly machine-bound items. The problem
is one of *runtime detection* for items that have mixed portability — and a
scope-tag enum value cannot encode that.

---

### Approach R — Content-time pattern detection

At sync time, scan unit content for machine-bound markers: absolute paths
(matching `C:\\Users\\<name>\\` or `/home/<name>/`), hostname references, and
locale-specific tokens. Refuse to sync units whose content matches the patterns.

**Prior art in JASON-OS:**

`sanitize-error.cjs` already has exactly this regex battery:
```js
/\/home\/[^/\s]+/gi,
/\/Users\/[^/\s]+/gi,
/C:\\Users\\[^\\]+/gi,
```
These match the user's home directory path regardless of username. [2]

`security-helpers.js::sanitizeDisplayString()` has:
```js
.replaceAll(/C:\\Users\\[^\s]+/gi, "[PATH]")
.replaceAll(/\/home\/[^\s]+/gi, "[PATH]")
.replaceAll(/\/Users\/[^\s]+/gi, "[PATH]")
```
Same patterns, applied to display strings. [3]

The PR #10 R2 CRITICAL fix (commit `088a077`) used the same pattern battery
to scan 362 files and replace 782 occurrences of absolute user paths with
portable placeholders across all committed `.md`, `.jsonl`, and `.json` files. [4]
This was after-the-fact remediation — the tool did not catch these at write time.

**Strength:**
- No explicit user decision required for items whose machine-bound nature is
  detectable from their content. The pattern runs automatically.
- Catches *future* entries that the user forgets to flag — provides a safety
  net that Approach P alone does not.
- The detection patterns are already coded and tested in the project's own
  security library. Zero new pattern design needed.
- Runs per-sync, not per-record setup: a unit that becomes machine-bound after
  first sync (because the user added a path entry) is caught the next time
  context-sync runs.

**Weakness:**
- False positives: a CLAUDE.md tweak that mentions absolute paths *in documentation*
  ("the source lives at `C:\Users\<user>\...`") would be flagged even though the
  prose is informational, not operative. Example: the PR #10 R2 fix itself shows
  that 782 occurrences across 60 research files were replaced — most of these were
  harmless documentation references, not operative paths.
- Cannot distinguish between "this absolute path is an operative shell command that
  must run on this machine" and "this absolute path appears in a prose sentence."
  The regex doesn't understand context.
- Approach R alone is insufficient for the `~/.claude/projects/<hash>/` mismatch
  case — the breakage is not in the content of a file but in the directory naming
  convention used to locate the file on each machine. Pattern scanning the content
  of memory files would not catch this.
- "Refuse to sync" is blunt: a user who has a legitimate need to sync a file that
  contains a documented path reference is blocked with no escape hatch unless the
  tool offers an override.

**What it forces on the user:**
Review prompts for any unit that contains absolute paths — even informational ones.
If implemented as "refuse to sync" (hard block), it forces content editing before
sync. If implemented as "warn but let through with confirmation," it degrades to a
variation of Approach P.

**Integration cost:**
MEDIUM. The pattern battery exists. Integration point: add a path-pattern check
inside the compare step (after normalization, before the 5-state classifier), or
as a pre-filter layer above the compare step. For units flagged by pattern detection,
add an additional state: `MACHINE-BOUND-DETECTED` (distinct from BOTH-DRIFTED,
since the content arrived from source and hasn't diverged — it just shouldn't travel).

---

## 5. Findings — Pre-existing Patterns in JASON-OS

### 5.1 `sanitize-error.cjs` — the detection battery already exists

File: `scripts/lib/sanitize-error.cjs` [2]

```js
const SENSITIVE_PATTERNS = [
  /\/home\/[^/\s]+/gi,
  /\/Users\/[^/\s]+/gi,
  /C:\\Users\\[^\\]+/gi,
  // ... plus credential patterns, connection strings, IPs
];
```

These patterns match any user home directory path, regardless of username. They
redact to `[REDACTED]`. For Approach R, the same patterns (or a derivative) can
be used for detection at sync time. The pattern design is already validated and
in production use.

**Relevant difference:** sanitize-error uses these for *output sanitization* (logs,
error messages). Approach R would use them for *input gate-keeping* (blocking sync
of content matching the patterns). The patterns themselves transfer directly; the
semantics of the action are different.

### 5.2 `security-helpers.js::sanitizeDisplayString()` — path redaction in display strings

File: `scripts/lib/security-helpers.js` [3]

The `sanitizeDisplayString` function redacts `C:\\Users\\[^\s]+` from strings before
they are displayed. This is the same pattern as sanitize-error, applied earlier in
the pipeline (at display time rather than at log-write time).

**Implication for Approach R:** The project already has a three-layer path-redaction
culture (sanitize-error for logs, security-helpers for display strings, PR #10 R2
for committed content). Content-time detection at sync would be a fourth application
of the same pattern, consistent with project culture.

### 5.3 PR #10 R2 CRITICAL — the path leak was an after-the-fact fix

Commit `088a077` [4]:

> "research findings and other committed files disclosed absolute Windows paths to
> internal user directories, revealing usernames (jbell, jason) and machine-specific
> directory structure: C:\Users\jbell\.local\bin\JASON-OS\...,
> C:\Users\<user>\Workspace\dev-projects\JASON-OS\..., etc."
>
> Fix: one-shot transformer replaced all 7 known repo-root prefixes with portable
> placeholders (`<JASON_OS_ROOT>`, `<SONASH_ROOT>`, etc.) across all tracked
> .md/.jsonl/.json files. 362 files scanned, 60 files modified, 782 substitutions.

**Key finding:** This fix addressed research/documentation files, not executable
config files. The `settings.local.json` was NOT in the list of modified files
(it was not committed). The absolute paths in `settings.local.json` were the
correct implementation — they must reference the actual machine path. This
confirms the distinction: absolute paths in *documentation* are a PII/portability
problem; absolute paths in *machine-local config* (settings.local.json) are
correct and must stay machine-local.

**Resolution approach:** The PR #10 R2 fix chose *portable placeholders in docs*
over *detection-and-block at write time*. This was a one-shot repair, not a
ongoing gate. No pre-commit hook was added to detect future absolute path leaks
into committed files (gap flagged in research, no gate exists as of 2026-04-23).

### 5.4 `settings.local.json` — machine-specific by design, not by accident

File: `.claude/settings.local.json` [5]

Contains both portable entries (e.g., `"Bash(chmod +x *)"`) and
machine-specific entries (e.g., `"Bash(mkdir -p C:/Users/<user>/...")`). This is
the primary real-world example of a file that is nominally user-scoped but
contains machine-specific content. The file is gitignored (`.gitignore` lists
`settings.local.json`), which means git itself treats it as machine-local.
Context-sync is the only tool that would need to move it cross-machine.

**Implication:** `settings.local.json` as a whole probably should not travel
cross-machine as a single unit. The correct sync unit is the *subset* of entries
that are portable. This is a granularity problem that neither `machine_exclude:
true` on the whole file nor content-time path detection on the whole file fully
solves — what's needed is per-entry analysis within the file.

### 5.5 `~/.claude/projects/<hash>/` — structurally machine-specific, not labeled so

The `<hash>` component of `~/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/`
is derived from the project's absolute path. On the work machine, where the username
is `jbell` and the path is different, the hash differs. Memory files written on the
home machine are therefore located at a different path on the work machine.

**No existing mechanism handles this.** No artifact in JASON-OS references the
path-derivation algorithm, and the Claude Code documentation does not document
the hash function publicly (confirmed gap in C1's D8 findings [6]). The walk
strategy must resolve the correct project hash empirically on each machine.

---

## 6. Recommendation

**Chosen approach: Approach P (per-record flag) as primary, Approach R (content-time
detection) as an automatic safety net for known-risky categories.**

Neither P nor R alone is sufficient. P needs a safety net for entries a user
forgets to flag. R alone produces false positives and cannot handle the hash-mismatch
problem. Together, they are complementary and their weaknesses don't overlap.

### Why not Q?

The scope-tag enum is well-validated across five systems and PHASE_0_LANDSCAPE.md
explicitly survivors it unchanged. The `machine` scope value already exists — items
that are purely machine-bound should carry that tag, not a new hybrid tag. The
runtime detection problem (items that are *partially* machine-bound) is not solved
by a static enum value. Approach Q is not recommended; the enum stays at five values.

### Hybrid design: P + R

**Layer 1 (Approach P) — per-record `machine_exclude` flag:**

The `machine_exclude` field already exists in A4's 7-field drift record. [7] C1's
walk already pre-filters on it. [6] No new data model work needed.

Trigger for the "is this machine-specific?" prompt:
- **At NEW state** (first discovery of a unit): always ask for categories in the
  known-risky list (see below). For non-risky categories (canonical memories,
  tenets), skip the question and default `machine_exclude: false`.
- **At SOURCE-DRIFTED state** (unit has changed since last sync): re-examine
  *only if the drift introduced new path-like content* (caught by Layer 2).

Known-risky categories where the prompt fires automatically at NEW state:
`settings-local`, `env-var`, `git-config`, `statusline`, `slash-cmd`.

Categories where `machine_exclude: false` is the safe default and the question
is skipped: `memory`, `tenet`, `claude-md-tweak`, `keybinding`, `husky-local`.

**Layer 2 (Approach R) — content-time path detection as warning flag:**

At the compare step (after normalization, before 5-state classification), run the
existing pattern battery from `sanitize-error.cjs` against the source content:
```
/\/home\/[^/\s]+/gi
/\/Users\/[^/\s]+/gi
/C:\\Users\\[^\\]+/gi
```

If a pattern matches AND `machine_exclude` is currently false for this unit:
- Do not hard-block. Downgrade to a WARNING state: `MACHINE-BOUND-DETECTED`.
- Surface as: "This unit contains what looks like an absolute user path. Sync
  anyway? (yes / no / always-skip-this-unit)"
- If the user says "always-skip-this-unit": write `machine_exclude: true` to the
  drift record. Same as the explicit opt-in in Layer 1.
- If the user says "yes, sync anyway": sync with a logged warning; do NOT write
  `machine_exclude: true`. This handles the legitimate "portable placeholder"
  case where the path reference is informational.

**Why this is not a hard block:**

PR #10 R2 showed that 782 path references in 60 files were documentation references,
not operative paths. A hard block at sync time would create the same false-positive
volume. The pattern detects, the user decides, the flag persists.

### Integration with C1's walk/compare loop

C1's algorithm (D8 §7) [6]:
```
for unit in enumerateUnits(category):
  if unit.path in machineExcludeSet: continue           // Layer 1: pre-filter
  srcContent = readNormalized(...)
  ...
  state = classify(srcHash, dstHash, prior)             // 5-state enum
  results.push(...)
```

Add Layer 2 as a post-normalize, pre-classify check:
```
for unit in enumerateUnits(category):
  if unit.path in machineExcludeSet: continue           // Layer 1 unchanged
  srcContent = readNormalized(...)
  dstContent = readNormalized(...)
  
  // Layer 2: content-time detection
  if containsMachineBoundPattern(srcContent) and not unit.machineExclude:
    state = MACHINE-BOUND-DETECTED                       // new warning state
  else:
    srcHash = sha256(srcContent)
    dstHash = sha256(dstContent)
    state = classify(srcHash, dstHash, prior)
  
  results.push({ unit, state, srcContent, dstContent })
```

`MACHINE-BOUND-DETECTED` is handled in the decide loop:
- Displayed with: file name, matched pattern snippet (not the full path — redacted
  per sanitize-error.cjs conventions), options: sync-anyway / skip / always-skip.
- Always requires explicit user confirmation (cannot be bulk-applied).

### Integration with C2's drift record (A4 shape)

No new fields needed. The 7-field record already has `machine_exclude`. [7]

Layer 2 detection writes to the same field when the user confirms "always-skip."
The record shape is unchanged:
```jsonl
{
  "path": "settings-local",
  "category": "settings-local",
  "src_hash": "...",
  "dst_hash": "...",
  "source_wins": true,
  "machine_exclude": true,     ← set by either Layer 1 or Layer 2
  "synced_at": "2026-04-23T..."
}
```

---

## 7. First-Time Clone Scenario Walkthrough

**Scenario:** User clones JASON-OS to a new work machine (username: jbell,
path: `C:\Users\jbell\Workspace\dev-projects\JASON-OS`). No prior drift record
exists. User runs `/context-sync` for the first time.

**Step 1 — Walk initializes.**

No prior drift records. All units are NEW state. `machineExcludeSet` is empty.
All units reach the compare step.

**Step 2 — Layer 2 scans `settings.local.json` content.**

The source file (home machine's settings.local.json, being synced to work) contains:
`"Bash(mkdir -p C:/Users/<user>/.claude/projects/..."`.

Pattern `C:\\Users\\[^\\]+` matches. State becomes `MACHINE-BOUND-DETECTED`.

Tool surfaces:
> "settings-local contains what looks like machine-specific paths
> (pattern: `C:\Users\[name]\...`). This file was created on a different
> machine. Sync anyway? [yes / no / always-skip-this-file]"

User answers "no" (or "always-skip-this-file").

If "always-skip": drift record written with `machine_exclude: true`. File is
never proposed again on this machine. User creates a fresh settings.local.json
on the work machine with work-appropriate paths.

If "no": unit skipped this run, no drift record written. Next run proposes again.

**Step 3 — Slash-command aliases are proposed.**

An alias at `~/.claude/commands/gsd/` is NEW. Layer 2 scans its content.
If no machine-bound patterns detected, it flows to the standard NEW decision:
tool shows diff, asks "sync this command? [yes / no]". User answers yes. Content
copied; drift record written `machine_exclude: false`.

**Step 4 — Canonical memories are proposed.**

`user_communication_preferences.md` is NEW. Category `memory` — skip the
machine-bound prompt by default. Layer 2 scans: the prose mentions "work (jbell,
restricted Windows) and home (jason, unrestricted)" but no `C:\Users\...` path
match fires. Standard NEW decision: tool shows diff, user confirms. Memory copied;
drift record written.

**Step 5 — `~/.claude/projects/<hash>/` path.**

The home machine's memory files are at:
`~/.claude/projects/C--Users-<user>-Workspace-dev-projects-JASON-OS/memory/`

On the work machine, the correct destination is:
`~/.claude/projects/C--Users-jbell-Workspace-dev-projects-JASON-OS/memory/`

The walk must resolve the correct hash for the current machine before constructing
the destination path. This is a one-time lookup: walk `~/.claude/projects/` looking
for a directory containing a `memory/` subdirectory with a known file (e.g., a
canonical memory file's filename). The first match gives the correct hash for this
machine.

**If no match found** (work machine has never had this project opened in Claude Code):
the destination directory does not yet exist. The walk creates it (with confirmation)
before writing. This is the "bootstrap the memory directory" case.

**Step 6 — Status-line config.**

Source file references `~/.claude/statusline/jason-statusline-v2.exe`. Pattern
matches (`/Users/<user>/` or `C:\Users\<user>\`). State: `MACHINE-BOUND-DETECTED`.
Tool warns. User answers "no" — they will rebuild the binary on the work machine
separately (per CLAUDE.md §1: "Operators who don't rebuild it don't need Go
installed"). Drift record not written; unit remains un-synced.

**Step 7 — Git config overrides.**

`~/.gitconfig [credential]` helper entry. If it contains a path to a Windows
Credential Manager binary or a platform-specific keychain entry, Layer 2 fires.
User answers "no" — they configure the work machine's git credential helper
separately.

**Outcome after first run:**

- Canonical memories: synced (portable, no machine patterns).
- Tenets: synced.
- Slash-command aliases: synced (if content is clean).
- settings.local.json: NOT synced (machine_exclude: true written on first detection).
- Status-line config: NOT synced (machine-bound path detected).
- Git config overrides: partially synced (portable sections yes, credential helper no).
- Drift record written for all decided units.

On second run: only changed units surface. Machine-excluded units are invisible.
The user's work machine diverges from home only intentionally.

---

## 8. Claims

1. **`settings.local.json` in JASON-OS contains both portable and machine-bound
   entries in the same file.** [HIGH — directly observed: lines 8 and 22 contain
   `C:/Users/<user>/` absolute paths alongside generic `Bash(chmod +x *)` entries.] [5]

2. **The `~/.claude/projects/<hash>/` directory name encodes the project's absolute
   path, making it structurally different per machine.** [HIGH — inferred from observed
   directory name `C--Users-<user>-Workspace-dev-projects-JASON-OS` which is a
   path-derived hash, confirmed by C1's D8 gap note and canonical-memory location
   observation.] [6]

3. **`sanitize-error.cjs` and `security-helpers.js` already contain the exact regex
   battery needed for content-time machine-bound path detection.** [HIGH — directly
   read from source: `/C:\\Users\\[^\\]+/gi`, `/\/home\/[^/\s]+/gi`, `/\/Users\/[^/\s]+/gi`
   patterns present in both files.] [2, 3]

4. **PR #10 R2 (commit `088a077`) fixed 782 absolute path references in committed
   files via after-the-fact transformer; no pre-commit gate exists for future leaks.**
   [HIGH — directly read from commit message and diff stats.] [4]

5. **The PR #10 R2 fix targeted documentation files, NOT `settings.local.json`,
   confirming that machine-bound paths in settings.local.json are correct and should
   stay machine-local.** [HIGH — settings.local.json not listed in the 60 modified
   files; commit message explicitly describes research/planning files as the target.] [4]

6. **chezmoi's approach to machine-specific content is explicit opt-in: templates with
   `{{ if eq .chezmoi.hostname "machine-name" }}` conditionals and `.chezmoiignore`
   per-machine rules. chezmoi has no heuristic auto-detection of machine-bound content.**
   [HIGH — chezmoi official docs confirm template-based, user-authored conditionals; no
   `--autotemplate` feature exists for machine-bound detection specifically (autotemplate
   substitutes known data variables, not detects unknown machine paths).] [8, 9, 10]

7. **yadm's approach is also explicit opt-in: class labels manually assigned per machine
   (`yadm config local.class Work`), used in filename-based alternate selection.**
   [HIGH — yadm official alternates docs.] [11]

8. **No dotfile manager surveyed provides automated heuristic detection of machine-bound
   content without explicit user opt-in.** [MEDIUM — surveyed chezmoi, yadm, Syncthing,
   home-manager (overview); none documented such a feature. Absence-of-evidence finding,
   not confirmed negative.] [8, 9, 10, 11]

9. **The scope-tag enum should NOT be extended to accommodate the machine-bound-but-labeled-user
   case.** [HIGH — `machine` scope tag already covers purely machine-bound items;
   the runtime detection problem cannot be solved by a static tag; enum extension
   costs are not justified.] [1, internal reasoning]

10. **The 7-field drift record from A4 (`machine_exclude` field) is the correct integration
    point for the per-record flag. No new fields are required.** [HIGH — A4's Finding 2
    explicitly includes `machine_exclude: boolean` and explains its purpose; C1's walk
    algorithm already reads it as a pre-filter.] [7, 6]

11. **For `settings.local.json` specifically, the correct sync unit is the subset of
    portable entries, not the whole file.** [MEDIUM — reasoned from observation that the
    file contains both portable and machine-bound entries; no prior art in JASON-OS or
    sibling findings for sub-file sync of JSON entries.] [5, 7]

12. **The `~/.claude/projects/<hash>/` hash resolution can be done empirically by walking
    the `~/.claude/projects/` directory for a subdirectory whose `memory/` folder contains
    a known filename.** [MEDIUM — inferred approach; Claude Code does not document the
    hash function publicly per C1's D8 gap note.] [6]

---

## 9. Sources

| # | URL / Location | Title | Type | Trust | CRAAP avg | Date |
|---|---|---|---|---|---|---|
| 1 | `.research/cross-repo-movement-reframe/PHASE_0_LANDSCAPE.md` | Phase 0 Landscape | Internal planning | HIGH | — | 2026-04-23 |
| 2 | `scripts/lib/sanitize-error.cjs` (JASON-OS) | Error Sanitization Utility | Codebase ground truth | HIGH | — | 2026-04 (active) |
| 3 | `scripts/lib/security-helpers.js` (JASON-OS) | Security Helpers Library | Codebase ground truth | HIGH | — | 2026-04 (active) |
| 4 | git commit `088a077` — PR #10 R2 CRITICAL | "Scrub absolute user paths (PII leak)" | Codebase git log | HIGH | — | 2026-04-21 |
| 5 | `.claude/settings.local.json` (JASON-OS) | Machine-local permissions config | Codebase ground truth | HIGH | — | 2026-04 (active) |
| 6 | `.research/cross-repo-movement-reframe/findings/D8-drift-detection.md` | C1 findings: drift detection | Sibling findings | HIGH | — | 2026-04-23 |
| 7 | `.research/cross-repo-movement-reframe/findings/D4-context-sync-ledger-need.md` | A4 findings: ledger need + drift record shape | Sibling findings | HIGH | — | 2026-04-23 |
| 8 | https://www.chezmoi.io/user-guide/manage-machine-to-machine-differences/ | chezmoi: Manage Machine-to-Machine Differences | Official docs | HIGH | 4.5 | 2024+ |
| 9 | https://www.chezmoi.io/reference/templates/variables/ | chezmoi Template Variables | Official docs | HIGH | 4.5 | 2024+ |
| 10 | https://www.chezmoi.io/user-guide/templating/ | chezmoi Templating Guide | Official docs | HIGH | 4.5 | 2024+ |
| 11 | https://yadm.io/docs/alternates | yadm Alternate Files | Official docs | HIGH | 4.5 | 2024+ |
| 12 | `.research/cross-repo-movement-reframe/BRAINSTORM.md` | Brainstorm Phase 1–4 | Internal planning | HIGH | — | 2026-04-23 |
| 13 | `.claude/canonical-memory/user_communication_preferences.md` | Canonical memory: communication prefs | Codebase ground truth | HIGH | — | 2026-04 (active) |

---

## 10. Gaps and Uncertainties

1. **`~/.claude/projects/<hash>/` hash derivation algorithm.** Claude Code does not
   document how the project path is hashed to produce the directory name. The empirical
   lookup approach (walk `~/.claude/projects/` for a known filename) is a workaround
   that adds a runtime dependency on the memory files already existing. If the work
   machine has never opened this project in Claude Code, the directory doesn't exist
   yet, and the walk finds nothing. The tool must handle this case (create the directory,
   with confirmation).

2. **`settings.local.json` sub-file sync granularity.** The recommendation above
   identifies that the correct sync unit for settings.local.json is the subset of
   portable entries, not the whole file. This requires per-entry analysis within
   a JSON allowedPaths array — a level of granularity the current drift record's
   `path` field (one record per file) cannot express. Planning must decide: treat
   settings.local.json as a single `machine_exclude: true` unit (safe, loses
   portability for the portable entries), or introduce sub-file iteration for
   JSON arrays (adds implementation complexity).

3. **No pre-commit gate for future absolute path leaks into committed files.**
   Commit `088a077` was a one-shot repair. The `sanitize-error.cjs` patterns are
   used for log sanitization, not for blocking writes. A pre-commit hook scanning
   staged `.md` and research files for `C:\\Users\\<name>\\` patterns would
   prevent recurrence. This is a gap in the security pipeline, not a context-sync
   concern, but context-sync's content-time detection (Approach R) would catch the
   same patterns if the files were being synced.

4. **Canonical memory `user_communication_preferences.md` prose accuracy on work
   machine.** The file mentions "Two-locale: work (jbell, restricted Windows) and
   home (jason, unrestricted)." This is correct and should travel — the description
   of the locale distinction is itself universal. No sync problem. Noted here because
   it was a candidate symptom that turns out to be safe.

5. **Content-time detection false positive rate in practice.** The PR #10 R2 fix
   showed 782 matches across 60 documentation files — most were harmless references.
   If Approach R is applied to context-sync source content (user-facing files like
   memories, tenets, CLAUDE.md tweaks), the false positive rate should be much lower
   because those files are prose-oriented and less likely to contain operative absolute
   paths. But the rate has not been measured empirically on the actual sync source set.

6. **C2's source inventory (D9) was not yet available at time of writing.** C2 is
   researching the full item inventory and secrets handling. If D9 surfaces additional
   categories not covered in the symptom table above (§3), the Layer 2 pattern detection
   should be reviewed for coverage on those categories.

---

## Confidence Assessment

- HIGH claims: 9 (claims 1–6, 9, 10, direct codebase evidence)
- MEDIUM claims: 3 (claims 7, 8, 11, 12 — inference or absence-of-evidence)
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH

The core design (P + R hybrid, no enum extension, no ledger needed) is strongly
supported by codebase evidence (the patterns exist, the `machine_exclude` field
exists, the PR #10 R2 history shows what the failure mode looks like in practice)
and by external prior art confirmation (chezmoi and yadm both require explicit
opt-in, confirming there is no automated approach that avoids user decisions).

---

## Serendipity

**`settings.local.json` reveals the sub-file sync problem is real and immediate.**
Observing the actual file content showed that a single file contains both portable
and machine-bound entries interspersed in the same JSON array. This is not a
theoretical edge case — it is the primary real-world example the tool must handle.
The planning deliverable should explicitly decide the sub-file granularity question
for `settings.local.json` before implementation begins, not defer it.

**The PR #10 R2 fix is an accidental research finding.** The after-the-fact nature
of that fix (one-shot transformer, no ongoing gate, 782 substitutions) confirms that
the project has already experienced the machine-bound path leak problem in a different
domain (committed documentation). The lesson the project learned — "replace with
portable placeholders rather than suppress" — is directly applicable to context-sync's
design: don't hard-block machine-bound content, replace or label and let the user decide.
