# FINDINGS — D12-local-auth-perms

**Agent:** Phase 1 D-agent D12-local-auth-perms
**Skill:** `/migration` (deep-research, Q12)
**Scope:** Local filesystem write between two locally-cloned repos (per D29 — v1 local-only, no remote PR, no GitHub API, no cross-machine auth).
**Host:** Windows 11 Pro; source `<SONASH_ROOT>\`, dest `<JASON_OS_ROOT>\`. Both NTFS on same volume (C:).
**Date:** 2026-04-21

---

## Summary

For a local-filesystem-only `/migration` between two cloned repos on Windows, **no credential / network auth is needed at all** — direct-apply is pure `fs.writeFileSync` + optional `git add` inside the destination. The real safety work is not on the *permission* axis (NTFS inheritance handles that automatically for same-user copies) but on the *state* axis: detecting dirty destinations, worktree conflicts, open-file locks (VS Code EBUSY), path-length breakage, Windows Defender scan latency on bulk writes, and an accidentally-unscoped `git push` reaching the dest's origin. The minimum-viable stance is "**read-source + write-dest, never touch the network, refuse on 6 dirty-state categories, warn on 4 more, re-use `scripts/lib/safe-fs.js` and `security-helpers.js` verbatim**."

**Proposed permission model (one sentence):** `/migration` runs as the invoking user with read access to the source repo and write access to the destination repo tree, issues **zero network calls**, **zero `git push` / `git fetch` / `git pull`** invocations (only `git status`, `git worktree list`, `git rev-parse`, and `git add` on the dest), and reuses the existing single-user-CLI trust model already documented in `scripts/lib/safe-fs.js` (not a privilege-boundary primitive, TOCTOU acceptable).

**Dirty-state refuse-list count:** 6 refuse + 4 warn + 3 recoverable/auto-fix = **13 categories total** (see §Dirty-state decision table).

**Worktree matrix cells:** **3 source states × 4 dest states = 12 cells** documented (see §Worktree handling matrix).

---

## Permission model (proposed minimum)

### What `/migration` needs

| Capability | Why | How |
|---|---|---|
| Read source files | Phase 2 discovery + Phase 5 content source | `fs.readFileSync` on source paths |
| Enumerate source layout | Proactive-scan, file/workflow/concept targets | `fs.readdirSync`, `fs.statSync` |
| Run `git status --porcelain` in **both** repos | Detect dirty state pre-flight and post-write | `execFileSync("git", ["status", "--porcelain"], { cwd })` |
| Run `git worktree list --porcelain` in both repos | Detect worktree arrangement | `execFileSync("git", ["worktree", "list", "--porcelain"], { cwd })` |
| Write destination files | Direct-apply Phase 5 execution | `safe-fs.js` `safeWriteFileSync` / `safeAtomicWriteSync` |
| `git add` on destination (optional, plan-export can skip) | Stage migrated files if user opts in | `safeGitAdd` from `security-helpers.js` |

### What `/migration` must NOT do (v1)

- **No `git push`** — anywhere, ever. (CLAUDE.md guardrail #7 already blocks pushes to main via hook; `/migration` v1 does not invoke `git push` at all — not even to feature branches.)
- **No `git fetch` / `git pull` / `git clone`** — both endpoints are already locally cloned per D29; network syncs are the user's responsibility before invocation.
- **No `git remote add` / `git remote set-url`** — remotes exist or they don't; `/migration` does not edit them.
- **No `gh` CLI calls** — the `gh` binary is available per user memory but v1 never invokes it.
- **No credential-helper touch** — `credential.helper=manager` is configured on the dest (verified via `git config --list`) but all reads/writes stay local; the helper is never prompted.
- **No `git commit`** — staging is the ceiling. The user commits when they've reviewed. (`safeGitCommit` from `security-helpers.js` exists and is battle-tested, but `/migration` does not invoke it autonomously per D8 "nothing silent.")

### Trust model alignment

`safe-fs.js` top-of-file block (lines 14–33) already declares the exact trust posture `/migration` needs: "single-user CLI tool running as the invoking developer on their own workstation." `/migration` inherits this model and adds no new trust assumptions. TOCTOU gap between `isSafeToWrite` and subsequent write is acceptable per the same rationale.

### File permissions on write

`safeWriteFile` in `security-helpers.js` writes with `mode: 0o600`. On NTFS with `core.filemode=false` (verified in `C:/Users/jbell/.local/bin/JASON-OS/.git/config`), the POSIX mode bit is effectively ignored by git — NTFS uses ACL inheritance from the parent directory instead. New files inherit ACLs from `<JASON_OS_ROOT>\` which are the jbell user's default ACLs. No chmod / icacls calls needed.

---

## Worktree handling matrix

Source × dest × action. The SoNash repo has `.worktrees/planning/` present (verified: `C:/Users/jbell/.local/bin/sonash-v0/.worktrees/planning/` exists as a directory; `git worktree list` on that repo currently shows only the main checkout, so `.worktrees/planning/` is a historical artifact or a registered-but-missing worktree).

JASON-OS is currently on branch `piece-3-labeling-mechanism` in the main checkout (no secondary worktrees registered).

**Source states** (the repo being read from):
- **MC** = Main Checkout (the top-level clone directory is the worktree)
- **SW** = Secondary Worktree (`git worktree add`-created sibling)
- **BM** = Bare + Multi-worktree (no main checkout, just bare + worktrees — uncommon on Windows)

**Destination states** (the repo being written to):
- **MC** = Main Checkout, branch is NOT checked out in another worktree
- **MC+SW** = Main Checkout coexists with other worktrees on other branches (the common case — SoNash's `.worktrees/planning/` if it were active)
- **SW** = Secondary Worktree is the `/migration` target; main checkout is elsewhere
- **DIRTY-BRANCH** = Target branch is already checked out in ANOTHER worktree (conflict)

### Matrix (12 cells)

| # | Source | Dest | Action / Behavior |
|---|---|---|---|
| 1 | MC | MC | **Default path.** Normal reads + writes. No worktree handling needed. Both current user setups (sonash-v0 source, JASON-OS dest) fit here. |
| 2 | MC | MC+SW | Write only to the specific worktree path the user invoked against. Do NOT write into sibling worktrees' files. Use `git rev-parse --show-toplevel` in the CWD to identify the exact worktree root. |
| 3 | MC | SW | Write into the secondary worktree. Important: `.git` in a secondary worktree is a **file**, not a directory (contains `gitdir: <path>`). `safe-fs.js` `lstatSync` correctly distinguishes; `isSafeToWrite` does not misinterpret it as a symlink. |
| 4 | MC | DIRTY-BRANCH | **REFUSE.** The target branch is checked out in a sibling worktree. Writing to a branch-linked path without that worktree is fine for files, but if `/migration` would run `git add` on the dest, the index being modified will surprise the other worktree. Refuse with a clear "branch X is checked out at <path>, switch there or detach first." |
| 5 | SW | MC | Reading from a secondary worktree is fine — it's just a directory tree. Content reads do not need special handling; the branch the source worktree is on is irrelevant (we read working-tree state, not commits). |
| 6 | SW | MC+SW | Same as 5 + 2 combined: read from SW, write to the explicit dest worktree root. |
| 7 | SW | SW | Both sides are secondary worktrees. Supported. Watch for the case where they share the same `.git` common dir (if SoNash source and JASON-OS dest were ever artificially set up as worktrees of the same repo — they aren't, but guard against it with `git rev-parse --git-common-dir`; refuse if identical). |
| 8 | SW | DIRTY-BRANCH | Same refuse as #4. |
| 9 | BM | MC | Supported. Bare repos have no working tree, so `/migration` cannot read "working-tree state" from a bare source — only committed state. Not applicable to v1's current scope (SoNash is not bare). Document as "out of scope for v1, will error cleanly." |
| 10 | BM | MC+SW | Same as 9. |
| 11 | BM | SW | Same as 9. |
| 12 | BM | DIRTY-BRANCH | Same as 9 + 4. |

**Worktree lock-file interaction:** `git worktree lock` creates a `locked` marker inside `.git/worktrees/<name>/` to prevent pruning. `/migration` does NOT create, touch, or respect this lock for its own semantics — it is a git-internal GC mechanism and orthogonal to `/migration`'s state tracking. However, `/migration` MUST NOT `git worktree remove` or `git worktree prune` at any point.

**`.git` file vs directory detection:** In secondary worktrees, `.git` is a text file of the form `gitdir: /path/to/.git/worktrees/name`. When `/migration` needs to locate the repo root, use `git rev-parse --show-toplevel` (handles both forms), never `fs.existsSync(".git")` + assume-directory.

---

## Windows-specific gotchas

### 1. VS Code / editor file locks → EBUSY

Confirmed active issue: microsoft/vscode#35020, #81224, #128418, #142462, #231542. When VS Code has a file open (even unsaved), writes from git bash or node can fail with `EBUSY: resource busy or locked`. Node's `fs.writeFileSync` surfaces this as an exception.

**Mitigation for `/migration`:** `safe-fs.js`'s `safeAtomicWriteSync` writes to a tmp path then rename-swaps. The rename itself can still fail with EPERM/EACCES if the destination file is held by an editor — but `safeRenameSync` already has a fallback (`renameFallbackOverExisting` lines 135–144) that copy+unlinks. That fallback ALSO fails if the copy target is locked. Net: `/migration` should pre-flight a "destination files currently open?" heuristic — or, simpler, **surface any EBUSY/EPERM cleanly with the instruction "close <file> in your editor and re-run."** No automatic retry loop; one-shot with clear error.

### 2. Windows Defender real-time scanning latency on bulk writes

Every file write triggers a Defender scan. For bulk `/migration` runs (e.g., porting 50+ files in one Phase 5), this measurably slows writes — Microsoft docs explicitly recommend directory exclusions for "developer git repo folders." See community gist by nerzhulart for the canonical dev-exclusion list.

**Mitigation:** Not `/migration`'s problem to fix (no registry/Defender policy changes — user PATH memory confirms the user can't modify system settings). But Phase 5 should:
- Batch writes in a single pass rather than write-read-write oscillation (each write is a scan event).
- Display progress during large batches so perceived slowness isn't mistaken for a hang.
- Document in SKILL.md that users who see `>5s`/file write latency should add `<HOME>\.local\bin\` to Defender exclusions if they have admin rights.

### 3. MAX_PATH = 260 character limit

Windows 11 default. Git bash and git itself have `core.longpaths=true` support but `JASON-OS/.git/config` does NOT set it (verified via `git config --list`). Node's `fs` module respects Win32 API limits on paths > 260 chars unless the `\\?\` prefix is used, which node does not do by default. `ENAMETOOLONG` surfaces as `ENOENT` or `EPERM` with misleading messages.

**Mitigation:** `/migration` should pre-flight path-length check each destination path before writing. A destination path of `<JASON_OS_ROOT>\` is 39 chars, leaving 221 chars for the suffix — tight for deeply-nested `.planning/` or `node_modules/` paths. Abort early with "Path too long for NTFS default (>260); enable `core.longpaths` in dest repo or choose a shallower target."

### 4. CRLF / autocrlf=true on dest

`JASON-OS/.git/config` has `core.autocrlf=true` (verified). On git add, LF→CRLF conversion happens in the index; on checkout, CRLF comes back to the working tree. `/migration` writes files directly to the working tree — if the source (sonash-v0) has LF files and the dest has `autocrlf=true`, a subsequent `git add` will normalize them to LF in the index, which is fine. BUT if the user eyeballs a diff between source and newly-written dest files with `diff` or `cmp`, they'll see CRLF-vs-LF noise.

**Mitigation:** `/migration` normalizes line endings according to the **destination's** `.gitattributes` + `core.autocrlf`, not the source's. Simplest: let node `fs.writeFileSync` write the content as-is (source LF becomes dest LF) and let git's smudge handle normalization at add time. Warn if the written file is immediately flagged as modified-after-add due to an autocrlf mismatch.

### 5. Path normalization: Git Bash vs native Windows

Git bash presents `<HOME>\...` as `/c/Users/jbell/...`. Node in a bash-invoked process receives the Windows form via `process.cwd()`. `path.resolve()` + `path.isAbsolute()` handle both. `/migration` should use `path.resolve` on all input paths and never concatenate with `/` or `\` manually.

**Mitigation:** Already enforced by `security-helpers.js` `validatePathInDir` (uses `path.resolve` + `path.relative` + `path.isAbsolute`). Reuse verbatim.

### 6. File case sensitivity

NTFS is case-insensitive by default but case-preserving. A source `Foo.md` and an existing dest `foo.md` will collide silently — the write succeeds but overwrites the differently-cased file. Git tracks this via `core.ignorecase=true` (default on Windows).

**Mitigation:** Pre-flight check: for each destination path, `fs.readdirSync` the parent dir and case-insensitively compare. If a different-case file exists, refuse and prompt the user (rename source to match dest case, or rename dest file, or force-overwrite).

### 7. Symlinks on Windows

NTFS supports symlinks but creation requires SeCreateSymbolicLinkPrivilege (admin on most boxes, or developer mode). Git bash creates symlinks as regular files on Windows unless `core.symlinks=true` AND the user has the privilege. `safe-fs.js` and `security-helpers.js` already refuse to write through symlinks (`refuseSymlinkWithParents`, `isSafeToWrite`).

**Mitigation:** Already covered by existing helpers. No additional work.

---

## Credential-manager analysis

### Is there any network risk in v1?

**No — provided `/migration` holds the line on "no `git push`/`fetch`/`pull`/`clone`."**

Evidence:
- `JASON-OS/.git/config` has `remote.origin.url=https://github.com/jasonmichaelbell78-creator/JASON-OS.git` and `credential.helper=manager`. If any code path invokes `git push`, `git fetch`, or any networked git subcommand on this repo, git-credential-manager-core would be prompted and would silently use cached GitHub credentials.
- `gh` CLI is authenticated as `jasonmichaelbell78-creator` per user memory. Any stray `gh` invocation in `/migration` would make authenticated GitHub API calls without prompting.
- SSH keys: no evidence of SSH config in user memory, but user's gh-cloned repos use HTTPS (`remote.origin.url` confirms). SSH not a factor for this repo set.

### Accidental-network-reach inventory

Code paths that *could* accidentally reach the network, to explicitly avoid:

1. **`git status` with submodules.** If the dest has submodules configured, `git status` may attempt to contact submodule remotes. `JASON-OS` does NOT have `.gitmodules` (verified by absence in repo root listing). Low risk but refuse-on-submodule guard (see §Dirty-state) covers this.
2. **`git add` with LFS tracked files.** The LFS clean filter runs locally on `git add` — no network call. But if a `git commit` followed, `git push` would trigger LFS upload. `/migration` does not commit or push, so no network reach.
3. **`git diff` with textconv filters.** If a user has `diff.textconv` set to a network-backed tool, `/migration`'s diff calls would reach out. Uncommon. Not worth guarding against in v1; document as "not tested with exotic diff filters."
4. **gh CLI shell-outs.** Just: do not call `gh` from `/migration` v1. Lock-down rule.
5. **VS Code task runners / hooks.** A post-write VS Code hook could reach the network. Not `/migration`'s concern — it's the user's editor config.

**Conclusion:** Zero network reach by design for v1, enforced by the "no `git push/fetch/pull/clone`, no `gh`" rule at the top of the skill. Credential manager exists on the system but is never invoked. The `credential.helper=manager` config is a no-op for `/migration`.

---

## Dirty-state decision table

Status of the destination repo at Phase 5 execute time. Source dirtiness is less critical (we only read), but a parallel guard helps catch "user made changes to source mid-migration" cases.

### Legend

- **REFUSE** = Phase 5 aborts; user must resolve before re-invoking.
- **WARN** = Surface the condition + ask "proceed?" (per D8 "nothing silent").
- **RECOVERABLE** = Auto-rollback path exists; `/migration` can retry after user fix.
- **AUTO-FIX** = `/migration` can resolve without user input (but per D8, still confirms).

### Destination dirty-state table (13 categories)

| # | Condition | Detection | Action | Rationale |
|---|---|---|---|---|
| 1 | Uncommitted changes to file(s) `/migration` would overwrite | `git status --porcelain` + path match | **REFUSE** | Overwriting would destroy user work silently. |
| 2 | Uncommitted changes to other files in dest repo | `git status --porcelain` shows non-target mods | **WARN** | User may have WIP; proceeding is safe for target files but confuses the post-migration review diff. |
| 3 | Merge conflict markers in dest working tree | `git status` shows `UU`/`AA`/`DD` | **REFUSE** | Repo is mid-merge; writing would corrupt conflict state. |
| 4 | Active rebase/cherry-pick/bisect | `.git/REBASE_HEAD`, `.git/CHERRY_PICK_HEAD`, `.git/BISECT_LOG` exist | **REFUSE** | Git is mid-operation; adding new content would break it. |
| 5 | Stashed work on target branch | `git stash list` non-empty + stash ref matches HEAD | **WARN** | Stash application post-migration could conflict with migrated files. |
| 6 | Submodules present with uncommitted state | `.gitmodules` exists + `git submodule status` shows `+` or `-` | **REFUSE** | Submodule writes are a separate concern; v1 refuses rather than risks corruption. (JASON-OS has no submodules; SoNash status unknown — check at run time.) |
| 7 | Target branch checked out in another worktree | `git worktree list` + `git branch --show-current` cross-check | **REFUSE** | Matrix cell #4 / #8 / #12. Index conflicts if `git add` runs. |
| 8 | Destination file is open in editor (EBUSY) | First write attempt throws EBUSY/EPERM | **RECOVERABLE** | Abort mid-batch; roll back any partial writes via `safeAtomicWriteSync`'s tmp-file cleanup; prompt user to close editor and re-run. |
| 9 | Destination path exceeds MAX_PATH (260) | Pre-flight `path.resolve` length check | **REFUSE** | `core.longpaths` not set in dest; write will fail or silently truncate. |
| 10 | Case-collision: differently-cased file exists at dest path | `fs.readdirSync` + lowercase compare | **WARN** | NTFS is case-insensitive; user must consciously decide to overwrite vs. rename. |
| 11 | Destination is a symlink or has symlinked ancestor | `isSafeToWrite` returns false | **REFUSE** | Already enforced by `safe-fs.js`; refuse is hard. |
| 12 | Destination path is gitignored in dest | `git check-ignore <path>` returns 0 | **WARN** | Migration may be intentional (pulling in a pattern that's gitignored in the dest for different reasons) or a mistake. Ask. |
| 13 | Destination is under `.git/` directory | Path-prefix match against `git rev-parse --git-dir` | **REFUSE** | Never write to the git metadata dir. `/migration` migrates working-tree files, not git internals. |

### Source dirty-state table (parallel, lighter)

- Source uncommitted changes → **WARN** only. We read working-tree state; if the user has WIP, that's what they intend to migrate.
- Source in mid-rebase → **WARN**. Unusual state but reading is safe.
- Source submodule dirty → **WARN**. Read what's there.

### Recovery semantics

For RECOVERABLE (category #8): `safe-fs.js` `safeAtomicWriteSync` writes to a tmp file (`${absPath}.tmp.${pid}.${rand}`) first, then renames. If the final rename fails, the tmp is cleaned up by the catch block. No partial-dest-file state. Batch recovery: if file N of M fails, files 1..N-1 are already written and committed to the working tree. `/migration` cannot "undo" them — it surfaces a "wrote 1..N-1, failed on N, files 1..N-1 remain on disk; run `git checkout -- <files>` to revert or re-run after fixing." Per-batch transactionality is NOT provided in v1.

**Checkpoint hygiene:** Phase 5 should write a progress ledger (similar to `.claude/state/pre-commit-fixer-state.json`) recording which files have been written. On abort/crash, the ledger lets `/migration` resume from the failure point rather than re-migrate already-written files.

---

## Sources

### Codebase (read-only inspections)

- `<JASON_OS_ROOT>\scripts\lib\safe-fs.js` — trust model block (lines 14–33), `safeAtomicWriteSync` (206–245), `safeRenameSync` + EXDEV/EPERM fallback (146–176), lock primitives (370–621).
- `<JASON_OS_ROOT>\scripts\lib\security-helpers.js` — `validatePathInDir` (109–123), `safeWriteFile` (135–166), `safeGitAdd` (176–192), `refuseSymlinkWithParents` (83–98), 0o600 mode on new files.
- `<JASON_OS_ROOT>\.claude\skills\pre-commit-fixer\SKILL.md` — dirty-state patterns, confirmation gates, SKIP_REASON discipline (guardrail #14), state-file pattern at `.claude/state/pre-commit-fixer-state.json`.
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md` — §5 Q12 scope, §3 D29 (v1 local-only, no remote PR / GitHub API / cross-machine auth).
- `<JASON_OS_ROOT>\CLAUDE.md` — §2 security rules (helpers-at-boundaries), §4 guardrails #7 (no push without approval, gated by `block-push-to-main.js`), #9 (pre-commit-fixer routing), #14 (SKIP_REASON).
- `<SONASH_ROOT>\.worktrees\planning\` — directory exists on disk but `git worktree list --porcelain` on sonash-v0 shows only the main checkout, indicating a historical or pruned registration.
- `<JASON_OS_ROOT>\.git\config` (via `git config --list`) — `core.autocrlf=true`, `core.filemode=false`, `credential.helper=manager`, `remote.origin.url=…JASON-OS.git` (HTTPS, not SSH). No `core.longpaths` set.

### Web

- [git-worktree documentation (git-scm.com)](https://git-scm.com/docs/git-worktree) — locking semantics, "branch already checked out" refusal behavior, `--force` override.
- [ICACLS Command Guide (learnmandu.com)](https://learnmandu.com/blog/icacls) — NTFS ACL management on Windows.
- [Permissions when you copy and move files (Microsoft Learn)](https://learn.microsoft.com/en-us/troubleshoot/windows-client/windows-security/permissions-on-copying-moving-files) — ACL inheritance on copy (new parent) vs move-within-volume (original retained).
- [VS Code issue #35020: Don't lock the files while open (github.com/microsoft/vscode)](https://github.com/microsoft/vscode/issues/35020) — VS Code file-lock behavior.
- [VS Code issue #142462: File writes can hang when write locks are not cleared up](https://github.com/microsoft/vscode/issues/142462) — EBUSY manifestation.
- [VS Code issue #231542: EBUSY: resource busy or locked on save](https://github.com/microsoft/vscode/issues/231542) — recent confirmation EBUSY is still active on Dev Drive.
- [VS Code issue #987: Can't use Git command line when Visual Studio Code is open](https://github.com/Microsoft/vscode/issues/987) — git-bash-vs-editor lock conflict.
- [Microsoft Defender Antivirus scan best practices (learn.microsoft.com)](https://learn.microsoft.com/en-us/defender-endpoint/mdav-scan-best-practices) — real-time scan performance + exclusion guidance for dev folders.
- [Configure custom exclusions for Microsoft Defender Antivirus](https://learn.microsoft.com/en-us/defender-endpoint/configure-exclusions-microsoft-defender-antivirus) — directory / process exclusion patterns for git repos.
- [Windows Defender developer exclusion list (gist by nerzhulart)](https://gist.github.com/nerzhulart/89c6a376b521a6e7eb69a04277a9489a) — canonical community dev-tool exclusion list.
- [Maximum Path Length Limitation (Win32 / Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation) — MAX_PATH=260, `\\?\` prefix, `LongPathsEnabled` registry toggle.
- [Node.js issue #50753: Long node_modules paths cannot be found on Windows](https://github.com/nodejs/node/issues/50753) — node `fs` + long-paths interaction, ENAMETOOLONG vs ENOENT misreporting.
- [Filename Too Long in Git for Windows (w3tutorials.net)](https://www.w3tutorials.net/blog/filename-too-long-in-git-for-windows/) — `core.longpaths=true` and its limits.
- [Git stash / untracked files / merge-conflict loss (databasesandlife.com)](https://www.databasesandlife.com/git-stash-loses-untracked-files/) — untracked-file loss on stash pop with conflicts; backs the refuse-on-merge-conflict-markers rule.
- [gitmodules documentation (git-scm.com)](https://git-scm.com/docs/gitmodules) — submodule dirty detection via `ignore=dirty`/`untracked`.
- [Git LFS smudge/clean filter (mankier.com)](https://www.mankier.com/1/git-lfs-smudge) — LFS clean runs on `git add` (local), upload defers to `git push` (which `/migration` does not invoke).
- [FAQ | Git-Credential-Manager-for-Windows (microsoft.github.io)](http://microsoft.github.io/Git-Credential-Manager-for-Windows/Docs/Faq.html) — credential manager only prompts on networked operations.
- [Configuration Options | Git-Credential-Manager-for-Windows](https://microsoft.github.io/Git-Credential-Manager-for-Windows/Docs/Configuration.html) — `credential.useHttpPath` and per-host scope; confirms local-only invocations bypass it entirely.
