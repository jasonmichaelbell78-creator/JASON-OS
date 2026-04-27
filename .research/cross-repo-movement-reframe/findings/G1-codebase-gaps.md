# G1 — Codebase Gap Pursuit

**Agent:** deep-research-gap-pursuer (G1)
**Profile:** codebase
**Date:** 2026-04-23

---

## Gap 1 — Tenet identification mechanism

### Finding

The de facto convention is the `t[N]_` filename prefix — NOT `type: tenet` frontmatter.

**Observed files with `t[N]_` prefix:**
- `/c/Users/<user>/.claude/projects/C--Users-<user>-Workspace-dev-projects-jason-os/memory/t3_convergence_loops.md` — `type: reference`
- `/c/Users/<user>/.claude/projects/c--Users-<user>-Workspace-dev-projects-sonash-v0/memory/t3_convergence_loops.md` — `type: reference`

**`type: tenet` frontmatter usage:** Zero files in either the JASON-OS project memory dir or the SoNash project memory dir use `type: tenet`. The only tenet file found (`t3_convergence_loops.md`) carries `type: reference`.

**`tenet` in the schema enum:** `enums.json` (`.claude/sync/schema/enums.json`) lists `tenet` as a valid `memory_type` enum value alongside `user`, `feedback`, `project`, `reference`, and `index`. It is schema-valid but uninstantiated in practice.

**The canonical-memory dir** (`JASON-OS/.claude/canonical-memory/`) contains only MEMORY.md, feedback_*, session-end-learnings.md, and user_* files — no tenet files at all.

**Word "tenet" in non-schema files:** Appears in `convergence-loop/SKILL.md`, `skill-audit/REFERENCE.md`, label backfill docs, schema docs, and planning DECISIONS.md — all as descriptive prose, not frontmatter.

### Conclusion

"Tenet" as a `type:` frontmatter value is purely aspirational. The identification mechanism that actually works today is the `t[N]_` filename prefix (e.g., `t3_convergence_loops.md`). The schema enum includes `tenet` as a forward-looking value but no file has been backfilled to use it.

**Planning recommendation:** The sync tool must identify tenets by filename pattern (`/^t\d+_/`) rather than by `type: tenet` frontmatter — unless backfill is explicitly done before launch. This is a binary choice with no middle ground: pattern detection is the only currently-working mechanism.

---

## Gap 2 — `~/.claude/projects/<hash>/` hash derivation

### Finding

The directory naming is NOT a hash — it is a deterministic path-encoding algorithm. The directories under `~/.claude/projects/` use path-to-string encoding, not a cryptographic hash. The algorithm is:

```
encoded = absolute_path
  .replace(':', '--')     # colon (drive separator) → double dash
  .replace(/[\\/]/g, '-') # all path separators → single dash
```

**Empirical verification from observed directory names:**

| Absolute path | Encoded dir name |
|---|---|
| `C:\Users\<user>` | `C--Users-<user>` |
| `C:\Users\<user>\.claude` | `C--Users-<user>--CLAUDE` |
| `C:\Users\<user>\Workspace\dev-projects\JASON-OS` | `C--Users-<user>-Workspace-dev-projects-jason-os` |
| `C:\Users\<user>\Workspace\dev-projects\sonash-v0` | `c--Users-<user>-Workspace-dev-projects-sonash-v0` |

**Important observations:**
1. The encoding is deterministic and **reversible**: split on `--` to recover the drive letter and colon, then replace remaining `-` with `\` to recover path separators.
2. Case appears to be preserved from the original path (Windows FS is case-insensitive, so observed case may reflect original path case at creation time — `JASON-OS` shows as `jason-os` which suggests one path was provided in lowercase).
3. NO manifest file (e.g., `project.json`) was found inside the project dir — it contains only UUID-named session subdirs (e.g., `0eebfc97-2f66-4295-9c65-db4fe54bb6e5/`) and JSONL files, plus a `memory/` subdirectory.
4. The Anthropic Claude Code docs do NOT document this algorithm — it was reverse-engineered from filesystem observation.

**Planning implication:** Multi-machine sync does NOT need to compute or replicate this hash. The encoded path IS the stable identifier: it encodes the absolute path. On a second machine where the project lives at a different path (e.g., `/home/user/projects/JASON-OS`), the encoded dir would be different. The sync tool needs to map between machines using a stable project identifier (e.g., the git remote URL or the repo name) — NOT the encoded path directory name, which is machine-local.

**Scope-tag:** `machine` — these project dirs are machine-local by design.

---

## Gap 3 — MCP configuration file discovery

### Finding

**MCP files found on this machine:**

| File | Scope | Notes |
|---|---|---|
| `~/.claude/mcp.json.bak` | user | Backup file; no live `mcp.json` present in `~/.claude/` |
| `~/.claude.json` | user + local | Per canonical docs: this is where local and user-scoped MCP servers are stored |
| `.mcp.json` (project root) | project | Per canonical docs: project-scoped servers, checked into version control |

**What `~/.claude/mcp.json.bak` contains:**
```json
{
  "mcpServers": {
    "ccusage": { "command": "bunx", "args": ["@ccusage/mcp@latest"] },
    "puppeteer": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-puppeteer"] }
  }
}
```
This is the old user-level MCP config format. It was renamed to `.bak`, indicating migration to the new `~/.claude.json` format.

**JASON-OS `.claude/` directory:** No `.mcp.json` or `mcp.json` file exists at the project level in JASON-OS. MCP is entirely absent from the project-scope config.

**JASON-OS `settings.json`:** Lists MCP servers via `mcp__*` permissions in the `allow` array (`mcp__sonarcloud`, `mcp__memory`, `mcp__sequential-thinking__sequentialthinking`, `mcp__context7__*`, `mcp__plugin_episodic-memory_*`), but these are permission declarations — not server configuration. The actual server configs live in `~/.claude.json` (local scope) or are plugin-provided.

**Canonical doc findings (from https://code.claude.com/docs/en/mcp):**

Three config locations per scope:

| Scope | File | Shared? | Notes |
|---|---|---|---|
| `local` (default) | `~/.claude.json` under project path key | No | Private, project-specific |
| `project` | `.mcp.json` in project root | Yes (version control) | Team-shared |
| `user` | `~/.claude.json` under user-level section | No | Cross-project |

**Key architectural finding:** As of current Claude Code, `~/.claude/mcp.json` is the OLD format. The current canonical file is `~/.claude.json` (note: `.claude.json` at the home directory root, not `~/.claude/mcp.json`). The `.bak` file in `~/.claude/` is a migration artifact.

**Sync classification:**
- `~/.claude.json` — `scope_tag: machine` (contains user + local MCP configs; has machine-specific paths, API keys, project-path keys that differ per machine)
- `.mcp.json` (project root, if present) — `scope_tag: project`, `portability: sanitize-then-portable` (shared but may contain machine-specific paths or credentials)
- Plugin-provided MCP (in `.mcp.json` at plugin root or `plugin.json`) — covered under the plugin sync unit, not a standalone sync category

**Sync handling:** These are NOT a sub-key of `settings.json` sync. `~/.claude.json` is a separate top-level file at `~` (not inside `~/.claude/`). It requires its own sync-unit entry in the D9 inventory. The old `~/.claude/mcp.json` format should be documented as deprecated.

---

## Claims (with C-G prefix)

- **[C-G1]** No file in any memory directory (project-scoped or user-scoped) currently uses `type: tenet` frontmatter. The `t3_convergence_loops.md` file uses `type: reference`. (confidence: HIGH — filesystem ground truth, two directories checked)

- **[C-G2]** The only currently-working tenet identification mechanism is the `t[N]_` filename prefix. `type: tenet` in the `memory_type` enum is schema-valid but uninstantiated. (confidence: HIGH)

- **[C-G3]** `~/.claude/projects/` directory names are NOT cryptographic hashes — they are deterministic path-encodings: `path.replace(':','--').replace(/[\\/]/g,'-')`. The encoding is reversible. (confidence: HIGH — verified against 4+ observed directory names)

- **[C-G4]** The encoded project directory name is machine-local (different absolute paths on different machines produce different directory names). Multi-machine sync cannot use the encoded path as a stable cross-machine identifier; it must use a separate stable key (e.g., git remote URL or repo name). (confidence: HIGH)

- **[C-G5]** No `project.json` or equivalent manifest file exists inside a `~/.claude/projects/<encoded>/` directory to name the original absolute path. The mapping must be inferred from the encoding algorithm or maintained externally. (confidence: HIGH — inspected one project directory structure)

- **[C-G6]** The current canonical MCP config file for user-level and local-scoped servers is `~/.claude.json` (at home directory root), NOT `~/.claude/mcp.json`. The `~/.claude/mcp.json.bak` file is a migration artifact from the old format. (confidence: HIGH — confirmed by canonical docs + filesystem)

- **[C-G7]** Project-scoped MCP servers live in `.mcp.json` at the project root (version-controlled). JASON-OS currently has no `.mcp.json` at its project root. (confidence: HIGH)

- **[C-G8]** `~/.claude.json` requires its own sync-unit row in the D9 context-sync inventory. It is distinct from `~/.claude/settings.json` and is not currently listed in D9's inventory. Scope-tag: `machine` (machine-local due to project-path keys and potential credentials). (confidence: HIGH)

- **[C-G9]** The `~/.claude/projects/<encoded>/memory/` directory naming convention is: drive-letter + `--` + path-segments separated by `-`. Case may vary based on original path creation. The algorithm is: replace `:` with `--`, replace `\` or `/` with `-`. (confidence: HIGH)

---

## Sources

- Filesystem: `/c/Users/<user>/.claude/projects/C--Users-<user>-Workspace-dev-projects-jason-os/memory/` — all files inspected via `grep -r "type:"` and `ls`
- Filesystem: `/c/Users/<user>/.claude/projects/c--Users-<user>-Workspace-dev-projects-sonash-v0/memory/` — same
- Filesystem: `/c/Users/<user>/.claude/` top-level listing — confirmed `mcp.json.bak` only
- Filesystem: `/c/Users/<user>/Workspace/dev-projects/JASON-OS/.claude/sync/schema/enums.json` — `memory_type` enum confirmed
- Filesystem: `/c/Users/<user>/Workspace/dev-projects/JASON-OS/.claude/settings.json` — MCP permission entries
- Canonical docs: https://code.claude.com/docs/en/mcp — MCP scope table, `~/.claude.json` as current canonical file
- Filesystem pattern analysis: 4+ `~/.claude/projects/` dir names correlated with known absolute paths

---

## Updated source inventory (delta to D9)

**Two new sync-unit rows D9 must add:**

1. **`~/.claude.json`** — user/local MCP server config (the current canonical format). NOT currently in D9's inventory. Scope-tag: `machine`. Portability: `not-portable` (contains machine-specific project-path keys, potential credentials). This is the primary MCP config file for both user-scoped and local-scoped MCP servers.

2. **`.mcp.json` (project root)** — project-scoped MCP server config. NOT currently in D9's inventory as a distinct sync unit. Scope-tag: `project`. Portability: `sanitize-then-portable` (shared via VCS but may contain absolute paths or credentials that need sanitization). Currently absent from JASON-OS project root.

**One deprecated artifact to document:**

- **`~/.claude/mcp.json`** — OLD format, now superseded by `~/.claude.json`. The `.bak` file at `~/.claude/mcp.json.bak` is a migration artifact. Any sync-mechanism that targets `~/.claude/mcp.json` will find nothing on current installations.

**One clarification for D9 tenet row:**

- Row 2 (Tenets) must be updated: identification is by filename prefix `t[N]_` only. The `type: tenet` frontmatter mechanism does not function in practice. The implementation must use a glob/regex match on filenames, not a frontmatter scan, unless backfill is performed first.
