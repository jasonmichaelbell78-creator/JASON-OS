# Findings: Profile Discovery for Unowned (Read-Only) Repos

**Searcher:** deep-research-searcher (B3)
**Profile:** web + codebase
**Date:** 2026-04-23
**Sub-Question IDs:** B3

---

## 1. Sub-Question

What changes about profile discovery when the target repo is unowned (read-only)?
Scoped to three parts: (a) sandbox semantics, (b) refusal-to-write enforcement,
(c) profile data shape differences for unowned-mode profiles.

---

## 2. Approach

- Read BRAINSTORM.md and PHASE_0_LANDSCAPE.md for design context.
- Read `scripts/lib/safe-fs.js` and `scripts/lib/security-helpers.js` in full
  to understand existing primitives.
- Web research: git read-only access patterns (git show, bare clone, sparse
  checkout), Node.js permission model for filesystem sandboxing, Windows ACL
  (icacls), and cache fingerprinting/stale-detection patterns for external repos.
- Combined codebase findings and external evidence to reach recommendations.

---

## 3. Findings — Sandbox Semantics

Three options exist for giving profile-discovery code read-only access to an
unowned repo. Each is evaluated on: what breaks, how verification works, and
how it composes with existing safe-fs primitives.

### Option A: Full working-tree clone into a known scratch directory

**Mechanism.** Run `git clone [--depth 1] <remote-or-local-path> <scratch-dir>`
before discovery begins. All reads happen against `<scratch-dir>`. Writes into
the scratch directory are technically allowed by the OS, but the unowned source
repo is never touched.

**What could break.**
- Scratch directory is writeable by the process. Nothing structurally prevents
  a bug (or future code) from writing into scratch and treating it as if it were
  inside the unowned repo. The boundary is policy, not enforcement at this layer.
- Full clone is expensive for large repos. `--depth 1` (shallow) helps but is
  not zero-cost and introduces its own complexity (limited history, dehydrated
  objects).
- On Windows, path length limits (MAX_PATH = 260 chars default) can cause clone
  failures if the unowned repo has deep directory trees and the scratch path is
  long.

**Verification.** Check that the canonical unowned repo root path never appears
in any write call. This is checkable by auditing write paths at discovery time.

**Composition with safe-fs.**
The scratch-dir root can be registered as the ONLY allowed write root (using
the `forbidden_roots` extension described in §4 below). Any write attempt whose
resolved path does NOT start with scratch root is rejected. This makes the
boundary structural rather than policy for the safe-fs layer.

**Verdict.** Viable. Easiest to implement; full filesystem-level tooling
(including `git ls-files`, `git log`, etc.) works naturally against the clone.
Principal risk: scratch-dir writes are not blocked — only unowned-source writes
are. An off-by-one in path comparison could silently allow writes into unowned
source if the scratch path happens to be a parent of the source path (edge case,
but real on Windows with symlinked user directories).

---

### Option B: Read via `git show <ref>:<path>` — no working tree at all

**Mechanism.** Keep only the bare git database of the unowned repo (either via
`git clone --bare`, or by pointing at an existing `.git/` directory). Read file
contents by running `git show <ref>:<path>` and piping stdout into memory.
Enumerate files using `git ls-tree -r <ref>`. Never materialise a working tree.

**What could break.**
- `git show` and `git ls-tree` require spawning child processes per file read.
  For discovery of a repo with tens of config files, this is acceptable; for
  bulk reads of hundreds of files, it adds latency.
- `git show` outputs the raw blob. Binary blobs (compiled binaries, images)
  must be detected and skipped; piping them into a text buffer is harmless but
  wasteful.
- Bare clone still writes to disk (the `.git/` pack objects). That write goes
  to the scratch/bare location, not the unowned source — the constraint is
  maintained.
- Windows shell subprocess overhead for `execFileSync("git", ["show", ...])` is
  non-trivial. On WSL2 or native Windows git, each invocation has ~20-50ms
  startup cost. For a profile-discovery pass reading ~15-30 files, total
  overhead is ~300-1500ms — acceptable for a one-time discovery run.
- `--no-local` flag is required when the source is a local path: without it,
  git uses hardlinks rather than copying, which means the "clone" shares pack
  files with the source — not truly isolated [1].

**Verification.** Since there is no working tree, there is literally no path
within the unowned repo's directory tree against which a write could be issued.
Write-safety is structural by construction for the source tree.

**Composition with safe-fs.**
`git show` piped through `execFileSync` uses `scripts/lib/security-helpers.js`'s
existing `safeGitAdd` pattern (same `execFileSync` idiom). A new helper
`gitShowFile(bareDir, ref, filePath)` follows the same pattern. No new
write-guard extension needed for this option — writes simply never target
unowned-repo paths because no such paths exist on disk.

**Verdict.** Structurally cleanest for write-safety. Working-tree absence makes
"write into unowned repo" physically impossible for the source tree. The
operational cost is child-process overhead per file, and the bare clone still
writes pack objects to scratch. Best for strict environments where even a
scratch clone is considered too permissive.

---

### Option C: Full clone + OS-level write-deny on the cloned tree

**Mechanism.** Clone into scratch, then apply OS write-permission removal to
the cloned tree. On Unix: `chmod -R a-w <scratch-dir>`. On Windows: `icacls
<scratch-dir> /deny %USERNAME%:(W)` (deny Write to current user on the
directory tree).

**What could break.**
- Windows icacls `/deny` rules take precedence over `/allow` rules but are
  complex to apply correctly to a directory tree. A bug in the icacls command
  (wrong path, wrong SID) silently succeeds but does not protect [2].
- `chmod -R a-w` on a clone makes the git internals read-only too, which breaks
  subsequent git operations against the clone (e.g., `git ls-files` or
  `git log` inside the clone directory may create lock files that the OS now
  rejects). In practice this means Option C requires either accepting that git
  commands against the clone will fail, or using the bare-clone variant where
  there is no working tree to protect.
- On Windows, the process running as Administrator ignores Deny ACLs it sets on
  its own files in some configurations.
- Reverting the permission change (cleanup) is error-prone. A crash during
  discovery leaves the scratch directory locked; the next run needs to either
  detect and repair the state or use a fresh clone.
- Cross-platform inconsistency: chmod is POSIX-only; icacls is Windows-only.
  A JASON-OS tool that runs on both must branch on platform.

**Verification.** Tested by attempting a write into the protected tree and
confirming EACCES. But verification is per-platform and the failure mode on
misconfiguration is silent permission (not a hard block at the code level).

**Composition with safe-fs.**
safe-fs.js is not designed for this model — it guards symlinks and path
traversal, not OS ACL state. Option C relies on the OS, not on safe-fs. If the
OS-level guard fails (bug in icacls invocation), safe-fs does not catch it.

**Verdict.** Highest complexity, lowest reliability on Windows, and introduces
cleanup responsibility. Rejected for JASON-OS's single-user CLI context.

---

### Recommended sandbox option

**Use Option B (bare clone + git show reads) as the primary mechanism for
profile discovery on unowned repos.** Rationale:
1. No unowned-source paths exist on disk — write impossibility is structural.
2. Bare clone writes only pack objects to scratch, which is appropriate (it is
   the tool's own workspace).
3. Composes cleanly with existing `execFileSync` patterns in security-helpers.js.
4. Option A (full clone + forbidden_roots guard) is acceptable as a fallback
   for cases where git-based access is unavailable (e.g., the unowned repo is
   a local directory tree, not a git repo). In that case, the forbidden_roots
   extension described in §4 is required.

---

## 4. Findings — Refusal-to-Write Enforcement

### Current safe-fs write-guard surface

`isSafeToWrite(filePath)` in `scripts/lib/safe-fs.js` (line 47-82) checks:
1. Path is absolute.
2. The file itself is not a symlink.
3. No ancestor directory is a symlink.

It does NOT check whether the path is inside a forbidden root. There is no
per-call or per-session concept of "this root is off-limits."

`validatePathInDir(baseDir, userPath)` in security-helpers.js (line 109-123)
enforces the INVERSE constraint — that a path IS within a given base — using
the canonical `path.relative` + `/^\.\.(?:[\\/]|$)/` pattern. It is designed
for positive allowlist enforcement, not negative blocklist enforcement.

### Option: Extend `isSafeToWrite` with a `forbiddenRoots` list

Add an optional second parameter to `isSafeToWrite`:

```js
// Proposed extension (not yet implemented)
isSafeToWrite(filePath, { forbiddenRoots = [] } = {})
```

Inside `isSafeToWrite`, after the symlink checks, add:

```js
for (const root of forbiddenRoots) {
  const rel = path.relative(root, absPath);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    return false; // path is inside a forbidden root
  }
}
```

This uses the same `path.relative` pattern already in `validatePathInDir`,
avoiding the `startsWith('..')` anti-pattern flagged in CLAUDE.md §5 (the
correct regex is `/^\.\.(?:[\\/]|$)/`). The correct guard:

```js
if (!/^\.\.(?:[\\/]|$)/.test(rel) && !path.isAbsolute(rel)) {
  return false; // inside forbidden root — refuse write
}
```

**Pros.** Composes with all existing `safeWriteFileSync`, `safeAppendFileSync`,
`safeAtomicWriteSync` callers automatically, since they all go through
`isSafeToWrite`. A single extension point covers all write paths.

**Cons.** Requires callers to pass `forbiddenRoots` at each call site, OR the
forbidden roots must be set in module-level state. Module-level state is
fragile in a singleton-require context. Preferred pattern: pass `forbiddenRoots`
as an option to each write call, and have a factory or session wrapper populate
it from config.

### Option: Closure-captured path freezing

Build a `createUnownedReader(repoRoot)` factory that returns only read
operations, with the write functions absent:

```js
function createUnownedReader(repoRoot) {
  // Returns read-only surface — no write functions exposed
  return {
    gitShow: (ref, filePath) => gitShowFile(repoRoot, ref, filePath),
    lsTree: (ref) => gitLsTree(repoRoot, ref),
    // safeWriteFileSync deliberately NOT included
  };
}
```

The closure captures `repoRoot` as the boundary. Code that receives the reader
object cannot call any write function — there are no write functions to call.

**Pros.** Zero-trust at the API level. Cannot accidentally write into the
unowned repo because no write API exists in the reader object. Does not require
modifying `isSafeToWrite`.

**Cons.** Only blocks writes through the reader API. If profile-discovery code
also has a direct require of `safe-fs.js`, it can still call
`safeWriteFileSync`. Needs discipline that discovery code ONLY uses the reader
object, not direct safe-fs calls.

### Option: OS-level mechanisms (chmod / icacls)

Already evaluated as Option C in §3 and rejected. Too fragile on Windows, too
complex to clean up, and creates cross-platform branching requirements.

### Node.js Permission Model (`--permission --allow-fs-read`)

Node.js v22+ (JASON-OS's pinned runtime per CLAUDE.md §1) includes a stable
Permission Model (stable as of v22.13.0 [3]). Running profile-discovery as a
subprocess with `node --permission --allow-fs-read=<scratch> --allow-fs-write=<state-dir>
discover-unowned.js` would enforce write-denial at the runtime level.

**Pros.** Enforced by the runtime, not by application code. Even bugs in
discovery code cannot write to paths outside the allowlist.

**Cons.** Requires spawning profile-discovery as a child process with different
flags than the parent. The parent hook or skill runner uses Node.js without
`--permission`. The child process cannot inherit the parent's module cache or
require context. Adds subprocess overhead and IPC complexity.

**Verdict for JASON-OS.** The Permission Model is worth knowing about but is
over-engineered for this use case. Its symlink bypass vulnerability (symbolic
links followed even outside granted paths [3]) means it cannot be the sole
enforcement layer anyway.

### Recommended enforcement mechanism

**Primary: Closure-captured reader object (Option B's natural API surface).**
Since Option B uses bare clone + git show, the reader surface is naturally
read-only (it only exposes `gitShow` and `gitLsTree`). No write API exists to
call accidentally.

**Secondary: `forbiddenRoots` extension to `isSafeToWrite`.** Implement the
extension as a lightweight addition to safe-fs.js so that any write call that
somehow targets the unowned repo root (e.g., if the caller falls back to direct
safe-fs usage) is rejected with a clear error message. This is defense-in-depth,
not the primary control.

**Do NOT use:** OS ACL manipulation (too fragile on Windows), Node.js Permission
Model subprocess (disproportionate complexity for single-user CLI).

The `forbiddenRoots` extension should use:
```js
// In isSafeToWrite, after symlink checks:
if (forbiddenRoots && forbiddenRoots.length > 0) {
  const absResolved = path.resolve(filePath);
  for (const root of forbiddenRoots) {
    const rel = path.relative(path.resolve(root), absResolved);
    if (!/^\.\.(?:[\\/]|$)/.test(rel) && !path.isAbsolute(rel)) {
      return false; // inside a forbidden root
    }
  }
}
```

This reuses the exact regex from CLAUDE.md §5 anti-patterns table.

---

## 5. Findings — Profile Data Shape Differences for Unowned Mode

B2 is designing the owned-mode profile shape. This section identifies what
changes for unowned-mode profiles; it does not duplicate the owned-mode shape.

### Cache write-back location

Owned-mode profiles live adjacent to the target repo (or in `.claude/state/`
of JASON-OS itself, per the shared internals design). Unowned-mode profiles
CANNOT write into the unowned repo. They CANNOT write into the JASON-OS state
directory as a canonical representation of a "target process profile" because
the unowned repo is not a target process — it is a read source.

Recommended location: `.claude/state/profiles/unowned/<repo-identifier>.json`
where `repo-identifier` is a stable, sanitized slug derived from:
- For remote repos: slugified remote URL (e.g., `github-com-org-repo`).
- For local unowned repos: slugified absolute path (after stripping the user
  home directory prefix and replacing separators), e.g., `local-sonash-main`.

The `slugify()` function already in `security-helpers.js` (line 523-528) can
produce this identifier. The slug must be validated against path traversal
before use as a filename (apply `sanitizeFilename()` from security-helpers.js).

### Confidence scoring for unowned signals

Owned-mode profile discovery can validate signals empirically: run the pre-commit
hook, observe whether CI passes, verify that files matching a pattern are
actually present and functional. Unowned signals are purely observational:

| Signal                        | Owned confidence | Unowned confidence | Reason for gap                               |
|-------------------------------|------------------|--------------------|----------------------------------------------|
| `.github/workflows/*.yml`     | HIGH             | MEDIUM             | Workflow may be aspirational/broken in fork   |
| `.husky/` hooks present       | HIGH             | LOW-MEDIUM         | Hooks may not be executable (chmod), no probe |
| `settings.json` / `claude.md` | HIGH             | MEDIUM             | May be local-only, may be stale              |
| CI badge in README            | MEDIUM           | LOW                | Badge URL is frequently stale                |
| `package.json` devDeps        | HIGH             | MEDIUM             | Deps installed? lockfile present?            |

Unowned profile MUST carry a `discovery_mode: "unowned-static"` field and a
per-signal `confidence_tier: "observed-only" | "verified"` field, where
`verified` is not achievable in unowned mode (reserved for owned-mode probing).

### Versioning and staleness / re-discovery

Unowned profiles become stale when the source repo updates. Since there is no
live git remote connection during normal tool use, the profile must record the
git SHA at which discovery was run:

```json
{
  "discovery_sha": "abc123...",
  "discovery_timestamp": "2026-04-23T...",
  "remote_url": "https://github.com/org/repo",
  "discovery_mode": "unowned-static"
}
```

Re-discovery trigger: before using the cached profile, compare `discovery_sha`
against the current HEAD of the unowned repo (via `git ls-remote` for remote
repos, or `git rev-parse HEAD` in the local bare clone). If SHA differs, the
profile is stale and should be re-discovered or flagged as potentially stale.

This is a standard content-addressed cache invalidation pattern used by CI/CD
caching tools [4]: the fingerprint (SHA) is the cache key; a changed key
invalidates the cache.

For JASON-OS, re-discovery can be lazy (prompt user: "Profile for X is based
on SHA abc123, repo has updated — re-discover?") rather than automatic (which
could introduce latency on every invocation).

### Signals available in unowned mode (restricted set)

Unowned mode is parse-and-heuristic only. No probing (running hooks, executing
scripts). Available signals:

- **Static file presence:** `.github/workflows/*.yml`, `.husky/`, `CLAUDE.md`,
  `.claude/settings.json`, `.eslintrc`, `.prettierrc`, `.semgrepignore`, etc.
  — enumerable via `git ls-tree -r HEAD`.
- **File content parsing:** YAML workflow definitions, `package.json` devDeps,
  hook scripts (read as text, parse shebang + command patterns).
- **Git metadata:** branch protection rules visible in remote response headers
  (limited), commit history patterns (from the bare clone's git log).

NOT available in unowned mode:
- **Probe execution:** running `.husky/pre-commit` to verify it passes.
- **CI result verification:** cannot check whether a workflow actually runs
  successfully.
- **Installed toolchain verification:** cannot confirm that `eslint`, `prettier`,
  or other tools are installed in the unowned repo's local context.

The profile shape should carry a `probe_eligible: false` field for unowned
profiles to signal to downstream consumers (the `/port` companion, etc.) that
all gate information is heuristic, not verified.

### Summary: owned vs. unowned profile shape differences

| Field / concern              | Owned mode                          | Unowned mode                                    |
|------------------------------|-------------------------------------|-------------------------------------------------|
| Cache location               | `.claude/state/profiles/<slug>.json`| `.claude/state/profiles/unowned/<slug>.json`    |
| `discovery_mode`             | `"owned-live"`                      | `"unowned-static"`                              |
| `probe_eligible`             | `true`                              | `false`                                         |
| `discovery_sha`              | Optional (live repo, always current)| Required (cache invalidation key)               |
| Signal confidence            | Up to `verified`                    | Capped at `observed-only`                       |
| Re-discovery trigger         | On demand                           | On SHA change (lazy prompt)                     |
| Write-back location          | Inside JASON-OS state               | Inside JASON-OS state under `unowned/` subdir   |

---

## 6. Recommendation Summary

What `/extract` should do for profile discovery (five bullets):

1. **Use bare clone + git show for source access.** Clone the unowned repo with
   `git clone --bare --no-local <source> <scratch-bare-dir>` (or point at an
   existing `.git/`). Read all file content via `execFileSync("git", ["show",
   "HEAD:<path>"])` and enumerate files via `git ls-tree -r HEAD`. This makes
   writes into the unowned source structurally impossible for the source tree.

2. **Add a `forbiddenRoots` extension to `safe-fs.isSafeToWrite` as defense-in-
   depth.** Even though Option B makes writes into the unowned source impossible
   via the reader API, add the extension so any stray write call (e.g., from a
   helper that directly imports safe-fs) is caught and rejected with a clear
   error. Use the `/^\.\.(?:[\\/]|$)/` regex pattern per CLAUDE.md §5.

3. **Write the profile cache to `.claude/state/profiles/unowned/<slug>.json`,
   never inside the unowned repo.** Derive `<slug>` using `slugify()` from
   `security-helpers.js`, then validate with `sanitizeFilename()`. Record
   `discovery_sha` in the profile as the cache invalidation key.

4. **Mark all unowned-mode signal confidence as `"observed-only"` and set
   `probe_eligible: false`.** Downstream consumers (the `/port` companion) must
   know that gate information from an unowned profile is heuristic. Never run
   hooks, workflows, or scripts from the unowned repo.

5. **Gate re-discovery on SHA change, lazily.** Before using a cached unowned
   profile, compare stored `discovery_sha` against current HEAD of the unowned
   repo. If different, prompt the user to re-run discovery rather than silently
   using stale data (consistent with the "all surfaced data forces acknowledgment"
   behavioral guardrail in CLAUDE.md §4 rule 6).

---

## 7. Claims

| # | Claim                                                                                                                | Confidence | Source(s)     |
|---|----------------------------------------------------------------------------------------------------------------------|------------|---------------|
| 1 | `git show <ref>:<path>` outputs file content to stdout without modifying the working tree                             | HIGH       | [1] git-show official docs |
| 2 | `git ls-tree -r <ref>` enumerates all files in a tree recursively without checkout                                   | HIGH       | [5] git-ls-tree official docs |
| 3 | `git clone --bare` produces a bare repository with no working tree; pack objects are written to the clone location    | HIGH       | [6] git-clone official docs |
| 4 | `--no-local` is required when cloning a local path to prevent hardlink sharing of pack files with source              | MEDIUM     | [6] git-clone docs + [7] graphite.com guide |
| 5 | Node.js v22.13.0+ Permission Model (`--permission --allow-fs-read/write`) is stable (Stability 2)                    | HIGH       | [3] nodejs.org/api/permissions |
| 6 | Node.js Permission Model has a known symlink bypass: symlinks are followed even outside granted paths                  | HIGH       | [3] nodejs.org/api/permissions (documented caveat) |
| 7 | Windows icacls can deny write permissions to a directory tree for the current user via `/deny %USERNAME%:(W)`         | MEDIUM     | [2] Microsoft Learn icacls docs |
| 8 | icacls Deny rules take precedence over Allow rules but require correct SID/path; misconfiguration silently fails       | MEDIUM     | [2] Microsoft Learn icacls |
| 9 | Content-addressed cache invalidation using a SHA fingerprint is an established pattern in CI/CD tooling                | HIGH       | [4] Datadog cache purge blog + industry practice |
| 10 | `validatePathInDir` in security-helpers.js uses `/^\.\.(?:[\\/]|$)/` regex for path traversal prevention             | HIGH       | Codebase: `scripts/lib/security-helpers.js` line 118 |
| 11 | `isSafeToWrite` in safe-fs.js has no concept of forbidden roots — only symlink ancestor checking                       | HIGH       | Codebase: `scripts/lib/safe-fs.js` lines 47-82 |
| 12 | `slugify()` and `sanitizeFilename()` are both available in security-helpers.js for repo identifier generation         | HIGH       | Codebase: `scripts/lib/security-helpers.js` lines 243-253, 523-528 |
| 13 | Windows MAX_PATH (260 chars default) can cause git clone failures on deeply nested repos if scratch path is long       | MEDIUM     | [UNVERIFIED — training data; enable Long Paths in Windows 10+ registry to mitigate] |

---

## 8. Sources

| # | URL                                                                           | Title                                          | Type          | Trust  | CRAAP (avg) | Date         |
|---|-------------------------------------------------------------------------------|------------------------------------------------|---------------|--------|-------------|--------------|
| 1 | https://git-scm.com/docs/git-show                                             | Git - git-show Documentation                   | Official docs | HIGH   | 4.8         | Current      |
| 2 | https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls | icacls - Microsoft Learn              | Official docs | HIGH   | 4.6         | Current      |
| 3 | https://nodejs.org/api/permissions.html                                        | Permissions - Node.js Documentation            | Official docs | HIGH   | 5.0         | v22+ current |
| 4 | https://www.datadoghq.com/blog/cache-purge-ci-cd/                             | Patterns for safe and efficient cache purging in CI/CD | Vendor blog | MEDIUM | 3.8 | 2024 |
| 5 | https://git-scm.com/docs/git-ls-tree                                           | Git - git-ls-tree Documentation                | Official docs | HIGH   | 4.8         | Current      |
| 6 | https://git-scm.com/docs/git-clone                                             | Git - git-clone Documentation                  | Official docs | HIGH   | 4.8         | Current      |
| 7 | https://graphite.com/guides/git-clone-bare-mirror                              | Git clone bare and git clone mirror - Graphite | Community     | MEDIUM | 3.5         | 2024         |
| 8 | Codebase: `scripts/lib/safe-fs.js`                                             | JASON-OS safe-fs source                        | Codebase      | HIGH   | 5.0         | 2026-04      |
| 9 | Codebase: `scripts/lib/security-helpers.js`                                    | JASON-OS security-helpers source               | Codebase      | HIGH   | 5.0         | 2026-04      |

---

## 9. Gaps and Uncertainties

- **B2 profile shape not yet available.** This document describes the delta from
  owned mode, but the exact owned-mode field set is TBD pending B2's output.
  The `discovery_mode`, `probe_eligible`, `discovery_sha` fields described here
  are proposed additions; B2 may define conflicting field names.

- **`--no-local` behavior on Windows.** Official docs describe hardlink sharing
  for local-path clones, but it is unclear whether Windows NTFS always uses
  hardlinks or falls back to copy when the source and destination are on the
  same drive. Needs verification on Windows before relying on `--no-local`.

- **git ls-remote for SHA staleness check on remote repos.** `git ls-remote`
  requires network access; for air-gapped or offline use, staleness detection
  is not possible without a re-clone. This gap should be documented in the
  unowned profile as `staleness_check: "requires-network"` so the tool can
  handle offline gracefully.

- **Unowned local directory (not a git repo).** If the unowned source is a
  plain directory (not git-tracked), Option B is unavailable. Option A (clone
  into scratch) also requires git. For plain-directory sources, the forbidden_roots
  extension (defense-in-depth) becomes the primary guard rather than secondary.
  This edge case needs explicit handling in `/extract`.

- **Profile re-discovery UX.** The lazy SHA-comparison re-discovery prompt is
  described but its exact conversational shape is not designed here (out of
  scope — belongs in `/deep-plan`).

- **Windows MAX_PATH.** Claim 13 is UNVERIFIED. If the JASON-OS scratch
  directory is at a long absolute path (common on Windows with deeply nested
  user directories), bare clone of repos with deep trees may fail. Mitigation:
  use a fixed short scratch path like `%TEMP%\jason-os-scratch\` rather than
  a subdirectory of the project.

---

## Confidence Assessment

- HIGH claims: 8
- MEDIUM claims: 4
- LOW claims: 0
- UNVERIFIED claims: 1
- Overall confidence: **MEDIUM-HIGH** (all critical structural claims are HIGH;
  the one UNVERIFIED claim is a Windows edge-case mitigation, not a design
  blocker)
