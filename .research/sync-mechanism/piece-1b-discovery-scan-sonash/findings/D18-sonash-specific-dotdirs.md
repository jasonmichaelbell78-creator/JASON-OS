# D18 Findings: SoNash-Specific Dotdirs + Tool-Configs

**Agent:** D18
**Profile:** codebase
**Date:** 2026-04-18
**Directories covered:** `.agent/`, `.agents/`, `tool-configs/`

---

## File Counts

| Directory | Files | Subdirs | Date range |
|-----------|-------|---------|------------|
| `.agent/` | 1 | `workflows/` | Dec 2025 – Jan 2026 |
| `.agents/` | 1 | `skills/find-skills/` | Feb 2026 (single commit) |
| `tool-configs/` | 4 | — | Mar 2026 (Sessions #242-243) |
| **Total** | **6** | | |

---

## `.agent/` vs `.agents/` Relationship

### TL;DR: Both are deprecated staging directories, superseded by `.claude/skills/`.

### `.agent/workflows/deploy-prod.md`

**Status: DEPRECATED (implicitly — no active references)**

Created 2025-12-15 in a product feature commit (`feat: Night Review colors/share`), suggesting it was added incidentally by Claude alongside product work rather than as a deliberate infrastructure decision. The file uses a `description:` YAML frontmatter header identical to Claude Code slash command format — the same format later found in `.claude/commands/` before commands were migrated to skills.

The `// turbo` annotations on six of the seven steps are execution hints meaning "this step can run without waiting for user confirmation" — not a dependency on the Turborepo build system (the repo uses Next.js with Turbopack, not Turborepo).

The file was modified twice post-creation (Dec 21 and Jan 12) expanding from 4 steps to 7, then never touched again. No file in `.claude/`, `CLAUDE.md`, or any hook references `.agent/workflows/`.

**Classification:** Pre-`.claude/skills/` workflow experimentation. The `.agent/workflows/` path appears to be an older convention (possibly from skills.sh or an earlier Claude Code plugin format) that was briefly used before `.claude/commands/` and then `.claude/skills/` became the canonical locations. Effectively an orphaned artifact.

**Portability:** `sanitize-then-portable` — the deployment echo references `sonash-app.web.app` and `firebase deploy` which are SoNash-specific. Structure is fully portable.

### `.agents/skills/find-skills/SKILL.md`

**Status: DEPRECATED — superseded by `.claude/skills/find-skills/SKILL.md`**

Added 2026-02-08 in the same commit as the canonical `.claude/skills/find-skills/SKILL.md`. A diff between the two reveals the `.agents/` version is a truncated predecessor: it is missing the "When to Use", "When NOT to Use", and "Version History" sections that exist in the `.claude/` version.

The `.agents/skills/` path appears to be a transitional staging area from when Claude Code's agent configuration was stored at `.agents/` before migrating to `.claude/`. The concurrent creation of both files in one commit is unusual — likely the file was created at `.agents/` first (old convention) then immediately re-committed at `.claude/skills/` (new convention) with enhancements. The `.agents/` copy was never updated after that initial commit.

No hook, command, or CLAUDE.md section references `.agents/skills/find-skills/`. The `.claude/COMMAND_REFERENCE.md` and `SKILL_INDEX.md` both point to the `.claude/skills/find-skills/` version exclusively.

**`.agent/` vs `.agents/` relationship conclusion:**

| | `.agent/` | `.agents/` |
|---|---|---|
| Directory mtime | Dec 2025 | Feb 2026 |
| Contents | `workflows/` only | `skills/` only |
| Format | Slash-command workflow markdown | SKILL.md format |
| System | Pre-.claude/commands/ era | Pre-.claude/skills/ canonical era |
| Status | Deprecated, orphaned | Deprecated, superseded |
| Active references | None | None |

Neither directory is active. Both represent transitional Claude Code infrastructure formats that were superseded by the `.claude/` canonical layout. The naming evolution was: `.agent/` (Dec 2025) → `.agents/` (Feb 2026) → `.claude/agents/` + `.claude/skills/` (current). Neither directory should be ported — their live equivalents already exist in `.claude/skills/`.

---

## `tool-configs/` Purpose and Contents

**Status: ACTIVE** — added 2026-03-28 as part of the CLI tools ecosystem (Sessions #242-243).

The `tool-configs/` directory is a **developer environment configuration store** — it holds reference and deployable config files for the 14+1 CLI tools installed in the SoNash dev environment. The companion deployment script is `scripts/setup-cli-tools.sh`.

### File inventory

| File | Tool | Deploy mechanism | SoNash-specific values |
|------|------|-----------------|----------------------|
| `.gitconfig-delta` | `delta` | Reference only — setup-cli-tools.sh uses `git config --global` | None |
| `ntfy.conf` | `ntfy.sh` | Not deployed by setup script (manual) | `topic=sonash-claude` |
| `starship.toml` | `starship` | Copied to `~/.config/starship.toml` by setup-cli-tools.sh | None |
| `zoxide-init.sh` | `zoxide` | Reference only — setup-cli-tools.sh appends eval to ~/.bashrc | None |

**Deployment pattern:** `scripts/setup-cli-tools.sh` is the deployer. It reads from `tool-configs/` (via `CONFIG_DIR` env var) and writes to user-scoped destinations (`~/.gitconfig`, `~/.config/`, `~/.bashrc`). The script is idempotent — checks if already configured before deploying.

### `ntfy.conf` — key sanitization point

The `ntfy.conf` file contains `topic=sonash-claude`. This is the ntfy.sh push notification topic name used by the Claude Code `Notification` event hook to send real-time alerts to the developer's mobile device. When porting to JASON-OS or another project, this topic name must be renamed to match the new project (e.g., `topic=jason-os-claude`). The topic is not a secret but is project-specific.

### Companion documentation

`docs/CLI_USER_GUIDE.md` (Status: ACTIVE, v1.0, 2026-03-26) provides the full reference for the CLI tools ecosystem including what each tool does, how Claude uses it, and troubleshooting. It explicitly documents the `tool-configs/` deployment paths.

---

## Portable vs SoNash-Specific Classification

| File | Portability | Notes |
|------|-------------|-------|
| `.agent/workflows/deploy-prod.md` | `sanitize-then-portable` | Firebase/sonash-app URL must be replaced |
| `.agents/skills/find-skills/SKILL.md` | `sanitize-then-portable` | `scripts/search-capabilities.js` dep is SoNash-specific |
| `tool-configs/.gitconfig-delta` | `portable` | Pure tool config, no project refs |
| `tool-configs/ntfy.conf` | `sanitize-then-portable` | `topic=sonash-claude` must be renamed |
| `tool-configs/starship.toml` | `portable` | Generic prompt config, no project refs |
| `tool-configs/zoxide-init.sh` | `portable` | One-line generic eval, no project refs |

---

## Deprecated / Archived / Legacy Indicators

1. **`.agent/`** — No README, no active references, last modified Jan 2026. `.claude/commands/README.md` documents the commands → skills migration (2026-01-31) but does not explicitly reference `.agent/`. Orphaned by the same migration wave.

2. **`.agents/`** — Single file, never updated after Feb 2026 creation commit. The canonical skills live in `.claude/skills/`. No deprecation notice in the file itself, but the `superseded_by` relationship is clear from diff comparison.

3. **Neither directory appears in `.gitignore`** — they are git-tracked but functionally dead.

---

## Sync Recommendation for JASON-OS

| Item | Sync action |
|------|-------------|
| `.agent/workflows/deploy-prod.md` | Do NOT port — equivalent deploy docs should live in `.claude/skills/` or project-specific docs |
| `.agents/skills/find-skills/SKILL.md` | Do NOT port separately — the canonical `.claude/skills/find-skills/SKILL.md` (D1-series) is the correct source |
| `tool-configs/.gitconfig-delta` | Port as reference; setup script handles actual deployment |
| `tool-configs/ntfy.conf` | Port with sanitization: rename `topic=sonash-claude` to `topic=<project>-claude` |
| `tool-configs/starship.toml` | Port as-is |
| `tool-configs/zoxide-init.sh` | Port as-is |
| `scripts/setup-cli-tools.sh` | Port (covered by D6-series); dependent on tool-configs/ files being present |
| `docs/CLI_USER_GUIDE.md` | Port with sanitization (SoNash version references, tool version numbers) |

---

## Learnings for Methodology

1. **Dual-location files are a snapshot signal.** When a file appears in both `.agents/skills/X/SKILL.md` AND `.claude/skills/X/SKILL.md` with slight differences, the non-canonical path is almost always a transitional artifact from a naming convention migration. The diff pattern (canonical = superset) is the tell.

2. **`// turbo` annotations are not Turborepo.** This was a Claude Code workflow execution hint for step-level parallelism/auto-execution. Do not confuse with the Turborepo build tool. Future agents scanning workflow files should flag this pattern.

3. **`.agent/` vs `.agents/` naming.** The singular `.agent/` preceded the plural `.agents/`, which preceded `.claude/agents/`. This progression can help date other artifacts found in projects using older Claude Code conventions.

4. **tool-configs/ is a "dotfiles in a project" pattern.** It stores developer environment configs in the project repo so they can be version-controlled and deployed idempotently via a setup script. This is a portable pattern worth noting — JASON-OS could use the same pattern. The key insight: not all files in `tool-configs/` are deployed by the same mechanism (some are reference-only, some are copied, some drive `git config --global` calls).

5. **ntfy.conf topic is a sanitization point that's easy to miss.** It's a small file with no code, but it contains a project-specific string that would cause notifications to go to the wrong mobile topic if copied verbatim. Flag `*.conf` files in tool-configs-style dirs for sanitization review.

6. **Scope fit for D18 was appropriate.** 6 files across 3 dirs — well-sized. The research challenge was classification (deprecated vs active, format lineage), not volume.

---

## Gaps and Missing References

1. **`.agent/` origin context unclear.** The Dec 2025 commit that created `.agent/workflows/deploy-prod.md` was a product feature commit with no accompanying explanation for why a `.agent/` directory was created. The format matches Claude Code command format but no documentation explains the choice of `.agent/` over `.claude/commands/`. Could be a skills.sh influence from that era.

2. **`scripts/search-capabilities.js`** — referenced by `.agents/skills/find-skills/SKILL.md` as `node scripts/search-capabilities.js`. This file was not in scope for D18 (it lives in `scripts/`). D6-D12 agents should have captured it. If they did not, it represents a gap in the find-skills skill's dependency chain.

3. **ntfy.conf deployment path unknown.** `scripts/setup-cli-tools.sh` does NOT handle ntfy.conf deployment. The CLI_USER_GUIDE.md mentions ntfy but does not document a deploy step for ntfy.conf. It may be manually placed or used directly from the repo path by the ntfy Notification hook. This should be verified against the ntfy hook implementation (covered by D3-series).

4. **No JASON-OS equivalent of `tool-configs/`.** JASON-OS does not currently have a tool-configs directory or CLI tools setup script. The Session #242-243 work is entirely SoNash-native and would need to be a new creation if ported.
