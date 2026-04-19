# D13 Findings: tools/statusline

**Agent:** D13
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** SoNash `tools/statusline/` (all files, recursive) + JASON-OS port delta

---

## Summary

- **SoNash files inventoried:** 16 (source: 7 Go, 1 bash, 2 TOML config, 1 TOML example, 1 TOML local, 1 gitignore, 3 generated binaries/backup)
- **JASON-OS port files:** 12 (same source files minus .gitignore, minus 3 generated artifacts — those are machine-local)
- **Widget count (SoNash):** 22
- **Widget count (JASON-OS port):** 16
- **JASON-OS port status:** SoNash-ahead (6 widgets in SoNash not ported)
- **Security gap found:** real API key committed in SoNash `config.local.toml`

---

## Tool Architecture

### Go Source Layout

```
tools/statusline/
  main.go           — entry point, stdin parsing, orchestration
  widgets.go        — all widget implementations + helper functions
  cache.go          — API cache subsystem (weather, PR, CI) + fetch functions
  config.go         — Config struct, TOML loader (shared + local merge)
  render.go         — 3-line output assembly, ANSI colorize, prepareLine
  statusline_test.go — Go test suite (18 test functions)
  go.mod            — module sonash-statusline, go 1.26.1, BurntSushi/toml v1.6.0
  go.sum            — checksum lock
  build.sh          — build + install script
  config.toml       — shared versioned defaults
  config.local.toml.example — template for machine-local overrides
  config.local.toml — actual machine-local overrides (gitignored, but committed in SoNash — security gap)
  .gitignore        — ignores config.local.toml, *.exe~, cache/, binaries
  [generated] sonash-statusline-v3.exe — Windows binary (untracked, NOT covered by .gitignore)
  [generated] sonash-statusline.exe~   — backup artifact (covered by *.exe~ in .gitignore)
  [generated] sonash-statusline        — Unix binary (covered by .gitignore)
```

### Widget Catalog — Full 22 (SoNash)

| Widget ID | Function | Data Source | SoNash | JASON-OS |
|-----------|----------|-------------|--------|----------|
| A1 | Model name | stdin | yes | yes |
| A3 | Session duration | stdin | yes | yes |
| A4 | Permission mode (output_style) | stdin | yes | yes |
| A6 | Active agent name | stdin | yes | **DROPPED** |
| B1 | Git branch | shell out (git, cached 5s) | yes | yes |
| B2 | Project directory (basename) | stdin | yes | yes |
| B3 | Worktree name | stdin | yes | **DROPPED** |
| C1 | Context window gauge (bar + %) | stdin | yes | yes |
| C5 | Rate limit 5hr | stdin | yes | yes |
| C6 | Rate limit 7d | stdin | yes | yes |
| C7 | Rate limit reset time | stdin | yes | yes |
| C8 | Lines added/removed | stdin | yes | yes |
| D1 | Hook health (last hook-runs.jsonl entry) | file read | yes | **DROPPED** |
| D5 | Unacked warnings count (hook-warnings-log.jsonl) | file read | yes | **DROPPED** |
| E1 | Current in-progress task (from ~/.claude/todos/) | file read | yes | yes |
| F4 | Clock (timezone-aware) | system time | yes | yes |
| F6 | Weather current (temp + condition icon) | cache file | yes | yes |
| F7 | Weather forecast (H/L) | cache file | yes | yes |
| F15 | System uptime (Windows: net stats workstation) | shell out | yes | **DROPPED** |
| H2 | GitHub PR status (number + check rollup) | cache file | yes | yes |
| H3 | CI/CD pipeline status (last gh run) | cache file | yes | yes |
| I4 | Session count today | file r/w (sessions-today.json) | yes | **DROPPED** |

**6 widgets dropped in JASON-OS port:** A6, B3, D1, D5, F15, I4

### Line Layout Comparison

| Line | SoNash | JASON-OS |
|------|--------|----------|
| Line 1 (Identity & Workspace) | A1, B1, B3, B2, A4, C1 | A1, B1, B2, A4, C1 |
| Line 2 (Health & Metrics) | D1, D5, H2, H3, C8, [C5 C7], C6 | H2, H3, C8, [C5 C7], C6 |
| Line 3 (Lifestyle & Session) | weatherCluster, F4, A3, F15, I4 | weatherCluster, F4, A3, E1 |

Notable: JASON-OS moved E1 (current task) to Line 3 instead of being a standalone widget — this also consolidates the "what am I doing" info alongside clock/duration.

### Cache Subsystem

`cache.go` manages API-backed widget data at `~/.claude/statusline/cache/`:

```
~/.claude/statusline/cache/
  weather.json      — temp, condition, high, low, fetched_at
  github-pr.json    — PR number, status, fetched_at
  github-ci.json    — status, conclusion, fetched_at
  backoff.json      — per-source failure counts and next-retry timestamps
```

Refresh strategy: synchronous post-render call to `refreshCacheIfStale()`. (Original async goroutine approach failed because the process exits before goroutines complete — comment in main.go documents this decision.) Backoff schedule: [1, 2, 5, 10] minutes, capped at last slot.

### Build Pipeline

1. `go test -v ./...` — gate: tests must pass before build
2. `go build [-a] -o BINARY_NAME .` — JASON-OS adds `-a` flag (force full rebuild)
3. Windows `.exe` extension added if GOOS=windows
4. Binary + config files copied to `~/.claude/statusline/`
5. Test render from `INSTALL_DIR/BINARY_NAME` with inline JSON sample

---

## Source-vs-Runtime Scope (cache.go Canonical Example — Piece 1a §5.3)

`cache.go` is the canonical demonstration of the source/runtime scope split:

- **source_scope: universal** — pure Go code, compiles identically on any machine, no hardcoded paths in the source itself
- **runtime_scope: machine** — `cacheDir()` resolves to `~/.claude/statusline/cache/` on the *running* machine; cache files are written to that machine's home directory; backoff state accumulates per-machine

This split means: the source file syncs freely between machines (universal), but the cache state it produces is always local (machine). A second developer pulling this code gets a clean cache; they don't inherit the original developer's weather staleness or backoff penalties.

The same split applies to `widgetSessionCount` in SoNash's `widgets.go` (I4): source is universal Go, but the runtime writes `~/.claude/statusline/sessions-today.json` — machine-scoped persistence.

---

## JASON-OS Port Delta (Widget-by-Widget)

### 16 widgets retained and in-sync

A1, A3, A4, B1, B2, C1, C5, C6, C7, C8, E1, F4, F6, F7, H2, H3

All retained widgets appear functionally identical between SoNash and JASON-OS. The Go function bodies show no meaningful differences in the widget logic for these 16.

### 6 widgets in SoNash not ported to JASON-OS

**A6 — Active agent name**
- Source: `data.Agent.Name` from stdin
- Renders: `◆agentname` (magenta) or placeholder `agent:none`
- Drop reason (inferred): JASON-OS is a multi-project tool; "active agent" is project-specific metadata
- Back-port candidate: Yes — zero I/O, pure stdin read. Low-risk add.

**B3 — Worktree name**
- Source: `data.Worktree.Name` from stdin
- Renders: `wt:name` (cyan) or placeholder `wt:none`
- Drop reason (inferred): Worktree usage is project-specific; JASON-OS may not use the worktree pattern
- Back-port candidate: Conditional — only useful if the operator uses worktrees

**D1 — Hook health**
- Source: `~/.claude/state/hook-runs.jsonl` (last line, project-dir)
- Renders: `✓ hooks` (green) or `✗ hooks` (red)
- Drop reason (inferred): Requires SoNash hook infrastructure (hook-runs.jsonl state file)
- Back-port candidate: Yes, once JASON-OS hook infrastructure generates `hook-runs.jsonl`. Already in JASON-OS hooks — check D3a/D3b findings.

**D5 — Unacked warnings**
- Source: `~/.claude/state/hook-warnings-log.jsonl` + `hook-warnings-ack.json`
- Renders: `⚠  N unacked` (yellow/red)
- Drop reason (inferred): Requires hook warning infrastructure
- Back-port candidate: Yes, same condition as D1

**F15 — System uptime**
- Source: `net stats workstation` (Windows shell out)
- Renders: `Up Xd Yh` or `Up Xh`
- Drop reason (inferred): Windows-only implementation; cross-platform would require separate logic per OS
- Back-port candidate: Low priority; Windows-specific and not Claude Code infrastructure

**I4 — Session count today**
- Source: `~/.claude/statusline/sessions-today.json` (reads + writes per invocation)
- Renders: `Sessions today: N`
- Drop reason (inferred): Writes state per statusline invocation (side-effect); may have been intentionally omitted
- Back-port candidate: Yes — useful metric, pure local state, no external deps

### SoNash-ahead summary

SoNash has 6 widgets that JASON-OS lacks. In priority order for back-porting:
1. **D1 + D5** (hook health + unacked warnings) — highest value; feeds into JASON-OS health visibility once hooks are wired
2. **A6** (active agent) — zero I/O, trivial to add
3. **I4** (session count) — useful metric, easy state file
4. **B3** (worktree) — operator-optional
5. **F15** (uptime) — Windows-only, low value

---

## Install-Target Namespace Convention

| Repo | BINARY_NAME | Install path |
|------|-------------|--------------|
| SoNash | `sonash-statusline-v2` | `~/.claude/statusline/sonash-statusline-v2[.exe]` |
| JASON-OS | `jason-statusline-v2` | `~/.claude/statusline/jason-statusline-v2[.exe]` |

The convention: `<project-slug>-statusline-v<N>`. This allows multiple projects to coexist in `~/.claude/statusline/` without collision — each project references its own binary in its `settings.json`. The version suffix (`v2`) allows safe in-place replacement per the "Statusline rebuild safety" feedback (never overwrite the running exe; bump versioned filename + shim pointer).

Cache and config are co-located in `~/.claude/statusline/` regardless of project. This means if two projects share a machine, they share the same weather/PR/CI cache — which is intentional (one set of API calls services all statuslines on the machine).

The Go module names also differ: `sonash-statusline` vs `jason-statusline`. This is cosmetic (module name is not imported by external packages) but correct for clarity.

---

## Security Finding

**config.local.toml contains real API key (working-tree only, gitignored)**

`tools/statusline/config.local.toml` is correctly gitignored in both SoNash and JASON-OS (verified via `git check-ignore` — file NOT tracked in git history). The file contains an OpenWeatherMap API key in a working-tree-local copy on both machines.

**Secret value redacted from this research finding** — see operator for rotation status.

**Recommended action:** Rotate the key at openweathermap.org as a precaution (file has been present on local disks; keys should rotate periodically regardless). No git history scrub required — file was never committed.

**Agent error note:** Initial D13 agent reported "appears committed in SoNash" — this was INCORRECT. Post-agent verification (`git ls-files --error-unmatch tools/statusline/config.local.toml` returned not-tracked) confirmed gitignored.

---

## Gaps and Missing References

1. **SoNash `sonash-statusline-v3.exe` untracked status unclear** — the `.gitignore` only covers `sonash-statusline` and `sonash-statusline.exe`, not `sonash-statusline-v3.exe`. It's present in the working tree. Whether it's in git history requires `git ls-files` check (not done in this scan).

2. **countUnackedSince in JASON-OS** — D5 widget was dropped but `statusline_test.go` contains `TestCountUnackedSince`. The helper function must still exist somewhere in JASON-OS's Go files. This scan did not confirm whether the helper was retained or whether the test will fail. Needs verification.

3. **JASON-OS config.toml [placeholders] delta** — SoNash config.toml has `worktree` and `agent` placeholder keys; JASON-OS omits them. This is intentional (widgets dropped) but means `defaultConfig()` in JASON-OS's `config.go` may need corresponding field removal or it will silently use empty strings for those struct fields. Need to verify `config.go` struct in JASON-OS matches its `config.toml`.

4. **settings.json statusLine.command** — the build.sh summary tells the operator to update `settings.json`. This agent did not verify whether either repo's `settings.json` actually points to the installed binary. D17a-b (root-level configs) would cover this.

5. **Cache namespace collision** — if SoNash and JASON-OS are run on the same machine (which they are — this is the user's machine), both binaries write to `~/.claude/statusline/cache/`. PR and CI cache files (`github-pr.json`, `github-ci.json`) are project-agnostic filenames. The active project's `gh pr view` results will overwrite the other project's cached PR data. This is a latent bug for multi-project operators.

---

## Learnings for Methodology

1. **Widget count as a leading delta signal** — The build.sh summary string "Widgets active: N" was the fastest delta signal. Future scanners: always check build scripts for summary output strings before doing line-by-line diff.

2. **AllWidgets struct as ground truth** — In Go statusline pattern, the struct definition is the canonical widget inventory. Reading the struct fields and their comments gives a faster inventory than tracing all function calls. Pattern: read struct definition first.

3. **Gitignore coverage gaps are findable via file listing** — The `sonash-statusline-v3.exe` presence revealed a `.gitignore` pattern gap. Pattern: always cross-reference directory listing against `.gitignore` patterns; don't assume gitignored = absent.

4. **config.local.toml security risk is systematic** — Any repo with a `config.local.toml.example` pattern is at risk of the actual `.local.toml` being accidentally committed. This is a class of issue worth checking for across all repos with this pattern. D17a-b should flag this pattern wherever encountered.

5. **Render.go is the integration manifest** — In a Go statusline, `render.go`'s line assembly is the most compact summary of which widgets appear and in what order. Reading it first would have saved time vs reading all widget implementations. Recommendation: for future multi-widget tool scans, read render/assembly file first.

6. **Test file retention after widget drop** — JASON-OS dropped D5/D1 widgets but test file may still contain tests for their helpers. This is a correctness risk (tests may pass trivially or fail). Scanners should flag when test files are not trimmed to match implementation scope.

7. **Module name sanitization is cosmetic but still a sanitize_fields item** — `go.mod` module names don't affect compilation or imports, but they appear in error messages and `go list` output. Worth flagging as a sanitize field even though the impact is low.

8. **Binary versioning convention reveals safety protocol** — The `v2` in `sonash-statusline-v2` directly implements the "statusline rebuild safety" feedback (bump version, don't overwrite running exe). Future scanner: version suffix in binary name = safety protocol in use; note the convention.

---

## Confidence Assessment

- All source file readings: direct filesystem read (ground truth)
- Widget delta comparison: direct struct-level comparison of AllWidgets in both repos
- Security finding: confirmed by direct file read
- Drop reasons (A6, B3, D1, D5, F15, I4): inferred from context; not documented in code
- countUnackedSince JASON-OS gap: observed from test file, not confirmed by reading JASON-OS widgets.go in full
- Overall confidence: HIGH for inventory; MEDIUM for inferred drop rationale
