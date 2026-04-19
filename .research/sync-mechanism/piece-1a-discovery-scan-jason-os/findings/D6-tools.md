# D6 Tools Inventory — JASON-OS statusline

**Agent:** D6  
**Date:** 2026-04-18  
**Scope:** `tools/statusline/` — Go-based Claude Code statusline binary  
**Files read:** 11 of 13 total (2 gitignored: binary + config.local.toml)

---

## Summary Table

| # | Name | Type | Size (bytes) | Scope | Portability | Purpose |
|---|------|------|-------------|-------|-------------|---------|
| 1 | main.go | .go source | 3,309 | universal | portable | Entry point: stdin parse → widget build → render → cache refresh |
| 2 | config.go | .go source | 2,936 | universal | portable | Config structs + two-file merge loader (shared + local override) |
| 3 | render.go | .go source | 2,211 | universal | portable | 3-line layout assembly, ANSI prefix, non-breaking space conversion |
| 4 | widgets.go | .go source | 10,708 | universal | sanitize-then-portable | 16 widget implementations across 4 I/O tiers |
| 5 | cache.go | .go source | 13,219 | machine | sanitize-then-portable | API cache management + fetch (weather/PR/CI) + backoff |
| 6 | statusline_test.go | .go test | 7,292 | universal | portable | 19 test functions covering config, widgets, rendering, cache |
| 7 | go.mod | Go module | 90 | universal | portable | Module def: jason-statusline, Go 1.26.1, BurntSushi/toml dep |
| 8 | go.sum | Go checksum | 171 | universal | portable | Lockfile for BurntSushi/toml v1.6.0 |
| 9 | build.sh | bash script | 3,042 | universal | portable | Cross-platform build: test → compile → install → smoke test |
| 10 | config.toml | TOML config | 488 | project | sanitize-then-portable | Shared defaults (Nashville/CST — needs sanitization for portability) |
| 11 | config.local.toml.example | TOML template | 662 | user | portable | Machine-local override template with setup instructions |
| 12 | config.local.toml | TOML secret | 109 | machine | not-portable | **GITIGNORED** — live API key, not read |
| 13 | jason-statusline-v2.exe | binary | (gitignored) | machine | not-portable | **GITIGNORED** — compiled binary, rebuild via build.sh |
| — | tool:statusline (meta) | composite | ~44,237 | universal | sanitize-then-portable | 16-widget ANSI statusline for Claude Code |

---

## Tool Architecture Notes

### Widget taxonomy (4 I/O tiers)
1. **Stdin-only** (zero I/O): model name, session duration, permission mode, project dir, context gauge, rate limits (5hr/7d/reset), lines changed, clock — all from CC's JSON payload
2. **Shell-out cached**: git branch (5-second in-process cache via sync.Mutex)
3. **File-read**: current task (reads `~/.claude/todos/<session>-agent-*.json`, path traversal guarded)
4. **API-backed from cache**: weather current/forecast, GitHub PR status, CI pipeline — read from `~/.claude/statusline/cache-jason-os/*.json`, refreshed synchronously post-render

### Config merge pattern
`config.toml` (git-tracked, shared defaults) + `config.local.toml` (gitignored, machine secrets + overrides). Binary discovers config from its own directory at install time (`~/.claude/statusline/`). The shared config ships Nashville/Central timezone defaults — these are user-specific and would need sanitization for a truly generic JASON-OS distribution.

### SoNash sibling isolation
Cache dir is `~/.claude/statusline/cache-jason-os/` — explicitly isolated from any SoNash statusline instance that might share the parent `~/.claude/statusline/` directory. PR/CI/weather caches do not cross-contaminate between repos.

### External dependencies
- `github.com/BurntSushi/toml v1.6.0` — sole third-party dep; all else is Go stdlib
- `gh` CLI — for PR status and CI run data (fetched post-render, cached)
- `git` CLI — for branch name (short shell-out, in-process 5s cache)
- OpenWeatherMap API — weather data (requires API key in gitignored config.local.toml)

---

## Learnings for Methodology

### Agent sizing
- Files read: 11 (all non-gitignored non-binary files). Right-sized for D6 scope — the tool is self-contained with no sub-directories. A single agent handled it comfortably. For SoNash's `tools/` (16 files, ~30 MB mostly binaries), splitting into two agents would make sense: one for source/config files, one for binary inventory/metadata only.

### File-type observations
- Go source scanning works well with Read + manual import extraction. No tooling gaps for a small module (6 files). For larger Go projects, parsing `go list -json ./...` via Bash would extract inter-file dependency graphs (which .go file imports which package), but for this 6-file single-package tool, reading imports directly was sufficient.
- The dual-format FlexModel (string vs object) in main.go is a forward-compatibility pattern worth noting — it represents Claude Code API version divergence that would affect any downstream consumer.
- Test file (statusline_test.go) is in the same package (`package main`) — Go convention for whitebox testing. No separate test package or mocks for external APIs.

### Classification heuristics
- `scope_hint` worked well for most files. The tricky case is `cache.go` — the source code itself is universal/portable, but its runtime behavior (writing to `~/.claude/statusline/cache-jason-os/`) is machine-scoped. Tagged as `machine` to reflect runtime behavior, not source portability. A dual-field approach (`source_scope` + `runtime_scope`) would be more precise.
- `config.toml` is `project`-scoped but contains user-specific defaults (Nashville, imperial units). Tagged `sanitize-then-portable` to flag this. The distinction between "project config" and "user-baked defaults that happen to live in project config" is worth a schema field.
- `portability_hint: sanitize-then-portable` on the composite meta-entry correctly captures that the tool itself is portable but config.toml needs location/timezone sanitization for public distribution.

### Dependency extraction
- **Go module deps**: go.mod is the authoritative source — one external dep (`github.com/BurntSushi/toml v1.6.0`), everything else stdlib. Extracted directly by reading go.mod.
- **Script deps**: build.sh requires `go` and `bash` at runtime — extracted by reading the script header and command usage.
- **Inter-file deps**: All 6 Go files are in `package main` — they compile as a unit. Identified functional dependencies by reading import blocks and cross-referencing function calls (e.g., widgets.go calls functions from cache.go, render.go calls widgets.go structs). No tooling assistance needed at this scale.
- **Runtime deps** (external services/CLIs): Extracted from cache.go fetch functions and widgets.go shell-out commands — not visible from go.mod alone. Schema `external_refs` field captured these well.

### Schema-field candidates
The tool inventory revealed several attributes not currently in the schema that add meaningful signal:

1. **`language`** — already in `existing_metadata`, but worth promoting to top-level for tools. Go vs bash vs toml are fundamentally different handling requirements.
2. **`requires_build`** (boolean) — Go source requires `go build`; scripts do not. Critical for sync decisions (can you sync source and run it, or must you build first?).
3. **`binary_present`** (boolean + path) — The compiled binary (`jason-statusline-v2.exe`) is gitignored but operationally required. Knowing whether a pre-built binary exists on disk matters for "is this tool usable right now?" assessment.
4. **`install_target`** — Where the tool installs to (`~/.claude/statusline/`). Different from `path` (source location). Sync must understand install targets to know what to rebuild after pulling.
5. **`runtime_scope`** vs **`source_scope`** — cache.go is a good example: source is universal, runtime is machine. Current single `scope_hint` field conflates these.
6. **`secret_config_required`** (boolean) — Flags tools that require a gitignored secret file before they are operational. Would prevent false-positive "ready to use" assessments during sync.

### Adjustments recommended for SoNash tools scan
- **SoNash has 1 tools entry, 16 files, ~30 MB** — the bulk of that is almost certainly the compiled binary (`sonash-statusline.exe` or similar). The source files will be similar in structure to JASON-OS's statusline (possibly older/different widget set).
- **Same tool or different?** — Sibling, not shared. SoNash statusline is SoNash-specific; JASON-OS statusline is JASON-OS-specific. They share lineage but are now maintained separately. The D6 scan confirms the cache dir isolation (`cache-jason-os`) was deliberately designed to prevent cross-contamination.
- **Binary file handling**: For the SoNash scan, binary files should be inventoried by metadata only (name, size, gitignored status, install location) — never read. The schema `notes` field should record: gitignored=yes, rebuild command, install target. A `binary_present` flag (see above) would make this explicit.
- **Recommended split for SoNash tools agent**: One agent reads all source/config/script files (same as D6 did here); a second agent does `ls -la` + git-check-ignore on the full directory to inventory binary artifacts without reading them. This avoids the risk of accidentally reading a large binary and wasting context.
- **config.toml sanitization flag**: SoNash's config.toml likely has SoNash-specific defaults (different location, timezone, etc.). The scan agent should explicitly flag any user-specific values in shared config as `needs_sanitization: true` with the specific fields called out.
