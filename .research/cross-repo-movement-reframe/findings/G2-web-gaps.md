# G2 — Web Gap Pursuit

**Agent:** deep-research-gap-pursuer (G2)
**Profile:** web
**Date:** 2026-04-23

---

## Gap 1 — Ephemeral-machine handling in dotfiles ecosystem

### chezmoi

chezmoi does **not** have a built-in "ephemeral host" concept or `machine_exclude` flag. Instead, it relies on user-authored template detection. The canonical prior art lives in the chezmoi maintainer's own dotfiles (`.chezmoi.toml.tmpl`) and the official Containers and VMs guide.

**Pattern: `$ephemeral` boolean via env-var probing**

The maintainer's `.chezmoi.toml.tmpl` sets a boolean `$ephemeral = true` when any of these signals fire:

- `CODESPACES` env-var is set (GitHub Codespaces)
- `REMOTE_CONTAINERS_IPC` env-var is set (VSCode Remote Containers / dev containers)
- Username is one of `root`, `ubuntu`, `vagrant`, `vscode` — common container default users
- OS is Windows (treated as ephemeral in that config)

This is user-authored convention, not a chezmoi built-in. Once `$ephemeral` is true, templates gate per-feature: `{{- if (and (eq .chezmoi.os "linux") (not .ephemeral)) -}}` skips GUI packages, personal secrets, interactive prompts, etc.

**Pattern: `$codespaces` boolean from Containers and VMs guide**

The official docs show:

```
{{- $codespaces:= env "CODESPACES" | not | not -}}
```

This is the documented Codespaces-specific detection. The guide says "the installation script must be non-interactive" for containers, and uses `{{- if not .codespaces -}}` to skip interactive steps.

**`CI=true` signal — not natively used by chezmoi**

`CI=true` is set universally by GitHub Actions, GitLab CI, CircleCI, and most other CI platforms. chezmoi has no built-in hook for it, but the pattern `env "CI" | not | not` would work identically to the CODESPACES pattern above. No chezmoi issue or discussion found that formalizes this. It is inferrable from the existing template primitives — users could add `{{- $ci := env "CI" | not | not -}}` alongside `$ephemeral`.

**`.chezmoiignore` as escape hatch**

chezmoi's `.chezmoiignore` supports template syntax. A CI-aware ignore block looks like:

```
{{- if env "CI" -}}
.config/app-with-heavy-setup
{{- end -}}
```

This is whole-file/whole-directory granularity, not per-key, but it is the cheapest way to skip specific managed paths on ephemeral hosts without touching every template.

### home-manager (Nix)

home-manager uses **hostname-keyed flake outputs** for per-host configuration. There is no "bail on unknown hostname" built-in — if a hostname has no corresponding `homeConfigurations.<hostname>` entry, the user gets an error at evaluation time. The community pattern for CI is to provide a dedicated `homeConfigurations.ci` entry or to skip home-manager activation entirely in CI scripts. No automatic "is this ephemeral?" detection exists. A 2024 GitHub issue (#5665) documented "hostname: Unknown host" as a bug in certain container contexts, not a feature.

### GitHub Codespaces / devcontainers

- **`CODESPACES=true`** is set automatically in every Codespace; this is the official signal.
- devcontainers (the spec) set no universal ephemeral flag. The `REMOTE_CONTAINERS_IPC` env-var is a VSCode-specific side-channel, not part of the devcontainer spec.
- Codespaces clones dotfiles into `/workspaces/.codespaces/.persistedshare/dotfiles` (non-home path), which means naive dotfile managers that assume `~/dotfiles` will misbehave.
- The official GitHub recommendation is to use `$CODESPACES` in `install.sh` to gate installation steps.

### GNU Stow

GNU Stow has no ephemeral detection concept at all. Its `.stow-local-ignore` file lets users exclude paths from symlinking, but must be maintained manually per machine. CI handling in stow-based setups is entirely a shell-script concern (run `stow` or don't).

### `CI=true` as a universal signal — ecosystem status

`CI=true` is set by GitHub Actions, GitLab CI, CircleCI, Travis CI, and most cloud CI platforms. No major dotfiles manager natively reads it. chezmoi's template primitives (`env "CI"`) can read it — this is the simplest cross-manager "is this ephemeral CI?" signal available. No formal prior art exists in dotfiles tooling, but the pattern is inferrable and cheap.

### Recommendation for JASON-OS v1

**Adopt at v1:** Two-tier detection in the drift-record or sync script, using existing env-vars:

1. `CI=true` — gates out any pure CI runner (GHA, etc.) cheaply; zero machine config needed.
2. `CODESPACES=true` — gates out GitHub Codespaces.

These two checks together cover ~95% of ephemeral cases without requiring the user to do anything. Expressed as a single guard:

```js
const isEphemeral = process.env.CI === 'true' || process.env.CODESPACES === 'true';
if (isEphemeral) { process.exit(0); } // skip sync silently
```

**Defer to v2:** A user-configurable `machine_class: ephemeral` flag in `drift-record.json` or a `.chezmoi.toml.tmpl`-style template with `REMOTE_CONTAINERS_IPC` and username heuristics. This is the "full chezmoi pattern" but requires per-machine config which is unnecessary when env-vars already signal ephemeral state.

---

## Gap 2 — Settings.local.json sub-file granularity patterns

The core problem: `settings.local.json` is a flat JSON file with a mixed array/object of entries — some entries are portable (a useful Bash allow rule), some are machine-bound (absolute-path Bash patterns). JASON-OS's current `machine_exclude` flag is whole-file granularity.

### chezmoi modify templates (`setValueAtPath`)

chezmoi's most sophisticated per-key pattern uses **modify templates**: a file named `modify_settings.local.json.tmpl` that reads the current file from `.chezmoi.stdin`, surgically patches specific keys, and re-emits the result.

```
{{- /* chezmoi:modify-template */ -}}
{{ fromJson .chezmoi.stdin
  | setValueAtPath "allowedPaths[0]" "/home/user/project"
  | toPrettyJson }}
```

Machine-specific conditional per-key:

```
{{- /* chezmoi:modify-template */ -}}
{{- $data := fromJson .chezmoi.stdin -}}
{{- if eq .chezmoi.hostname "home-machine" -}}
{{-   $data = setValueAtPath $data "allowedPaths[0]" "/home/jason" -}}
{{- end -}}
{{ $data | toPrettyJson }}
```

**Cost:** Requires chezmoi as a dependency, plus authoring a modify-template for each managed file. Overkill for a single JSON file with a handful of keys. Medium complexity. **Not recommended for JASON-OS v1** unless chezmoi is already in the stack.

### VS Code `settingsSync.ignoredSettings`

VS Code Settings Sync exposes `settingsSync.ignoredSettings` — an array of setting key names that are excluded from sync. Two scope tiers exist:

- Settings declared with `machine` or `machine-overridable` scope in VS Code's schema are automatically excluded from sync by default.
- Users can add ad-hoc keys to `settingsSync.ignoredSettings`.

**Critical limitation:** `settingsSync.ignoredSettings` is itself synced. Adding a key to ignore it on machine A will ignore it on machine B too. There is no per-machine ignore list — it is a global denylist. VS Code issue #89627 ("Settings Sync: Ignore a setting locally") has been open since 2020 with no resolution; the feature does not exist. This means VS Code's model does not solve the problem of "portable on machine A, machine-bound on machine B."

VS Code's `[platform-specific]` syntax applies only to **keyboard shortcuts** (keybindings.json), not settings.json. Not directly applicable.

**Conclusion:** VS Code's model is the wrong analogy — it has the same whole-denylist limitation.

### npm `package.json` `os` / `cpu` fields

npm's `os` and `cpu` fields on dependency entries declare platform constraints for **installation**, not sync. They express "this package only installs on linux" — a publish-time annotation, not a runtime conditional. This pattern is not applicable to JSON config key portability.

### JSON Patch (RFC 6902) as a denylist mechanism

JSON Patch (RFC 6902) defines operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) addressable by JSON Pointer paths. In theory, a JASON-OS sync script could maintain a per-machine `local-overrides.patch.json` file listing the JSON Pointer paths that should not be overwritten during sync:

```json
[
  { "op": "ignore", "path": "/allowedPaths/0" }
]
```

Note: RFC 6902 has no `ignore` operation — this would be a JASON-OS-specific convention. The sync script would read the patch file, skip those paths during merge, and leave local values intact. **Cost:** Low implementation complexity (20-30 lines of Node.js). **Portability:** The patch file itself is machine-local (gitignored). This is the closest existing model to "per-key machine-bound" without a full template engine.

### Cheapest v1 mechanism: inline marker suffix or wrapper object

The two lowest-friction options found in adjacent ecosystems (Docker admin-settings.json, OpenCode config merging):

**Option A — Wrapper object with `_local: true` marker per entry:**

Transform the `allowedPaths` array (or `permissions` object) so each entry is a small object:

```json
{
  "allowedPaths": [
    { "value": "/home/user/project", "_local": true },
    { "value": "node_modules/**", "_local": false }
  ]
}
```

The sync script reads `_local: true` and skips that entry during push/pull. Cost: schema change to `settings.local.json`. High portability since the marker travels with the value.

**Option B — Separate `settings.local.machine.json` sidecar (whole-file, cheapest):**

Instead of per-key markers, split machine-bound entries into a separate file (`settings.local.machine.json`) that is gitignored. The runtime merges both files. This is the Docker Compose override model (`docker-compose.override.yml`). Cost near-zero — no schema change, no template engine, just a second file. Limitation: entries can't be "partially machine-bound" (e.g., same key with different values per machine requires duplication).

### Recommendation for JASON-OS v1

**Cheapest v1: Option B — sidecar file.** Adopt a `settings.local.machine.json` convention that is gitignored. Sync only touches `settings.local.json`. Machine-bound entries are moved by the user to the sidecar. Runtime merges both (sidecar wins on conflict). Zero schema changes, zero template engine, implementable in ~10 lines of Node.js.

**Second-cheapest if sidecar is insufficient: JSON Pointer denylist.** A gitignored `settings.local.machine-keys.json` listing JSON Pointer paths to protect from sync. The sync script skips those paths. Requires ~25 lines of Node.js but keeps `settings.local.json` as a single file and allows per-key granularity without schema changes.

**Defer to v2:** chezmoi `modify_` templates or `_local` inline markers. Both require either chezmoi as a hard dependency or a schema change to `settings.local.json` — too heavy for v1.

---

## Claims (with C-G prefix)

- **[C-G201]** chezmoi has no built-in ephemeral-host concept; the canonical pattern is a user-authored `$ephemeral` boolean in `.chezmoi.toml.tmpl` that detects `CODESPACES` and `REMOTE_CONTAINERS_IPC` env-vars plus username heuristics. (confidence: HIGH)

- **[C-G202]** `CI=true` is set universally by GitHub Actions, GitLab CI, CircleCI, and most CI platforms, but no major dotfiles manager natively reads it as an ephemeral signal; it is inferrable from chezmoi's `env` template function but is not formalized in any tool. (confidence: HIGH)

- **[C-G203]** The cheapest JASON-OS v1 ephemeral guard is a two-line env-var check: `CI=true` OR `CODESPACES=true` → skip sync and exit 0. This covers CI runners and Codespaces without requiring any machine config. (confidence: HIGH)

- **[C-G204]** home-manager has no "bail on unknown hostname" feature; unknown hostname produces an evaluation error, and the community pattern for CI is a dedicated `homeConfigurations.ci` flake entry or skipping activation entirely. (confidence: HIGH)

- **[C-G205]** GNU Stow has no ephemeral detection; it is purely a symlink farm manager and all CI/ephemeral logic must live in the caller shell script. (confidence: HIGH)

- **[C-G206]** VS Code's `settingsSync.ignoredSettings` is a global denylist (itself synced), not a per-machine ignore list; VS Code issue #89627 requesting per-machine local ignore has been open since 2020 with no resolution. (confidence: HIGH)

- **[C-G207]** chezmoi's `modify_` template + `setValueAtPath` provides genuine per-key machine-specific patching of JSON files, but requires chezmoi as a dependency and per-file template authoring — medium complexity, not recommended for JASON-OS v1. (confidence: HIGH)

- **[C-G208]** The cheapest v1 per-key portability mechanism for `settings.local.json` is a gitignored sidecar file (`settings.local.machine.json`) following the Docker Compose override model — no schema changes, no template engine, ~10 lines of Node.js merge logic. (confidence: HIGH)

- **[C-G209]** The second-cheapest v1 mechanism is a gitignored JSON Pointer denylist file listing paths to protect from sync, requiring ~25 lines of Node.js; this keeps `settings.local.json` as a single file and allows true per-key granularity. (confidence: MEDIUM)

---

## Sources

- [chezmoi Containers and VMs guide](https://www.chezmoi.io/user-guide/machines/containers-and-vms/)
- [twpayne/dotfiles .chezmoi.toml.tmpl](https://github.com/twpayne/dotfiles/blob/master/home/.chezmoi.toml.tmpl)
- [chezmoi setValueAtPath reference](https://www.chezmoi.io/reference/templates/functions/setValueAtPath/)
- [chezmoi manage-machine-to-machine-differences](https://www.chezmoi.io/user-guide/manage-machine-to-machine-differences/)
- [chezmoi manage-different-types-of-file](https://www.chezmoi.io/user-guide/manage-different-types-of-file/)
- [VS Code Settings Sync documentation](https://code.visualstudio.com/docs/configure/settings-sync)
- [VS Code issue #89627 — Settings Sync: Ignore a setting locally](https://github.com/microsoft/vscode/issues/89627)
- [VS Code issue #37519 — Local settings overrides (settings.local.json)](https://github.com/microsoft/vscode/issues/37519)
- [home-manager NixOS Discourse — per-host configuration](https://discourse.nixos.org/t/home-manager-per-host-configuration/68227)
- [home-manager issue #5665 — hostname: Unknown host](https://github.com/nix-community/home-manager/issues/5665)
- [Adopting Dotfiles for Codespaces and DevContainers](https://blog.v-lad.org/adopting-dotfiles-for-codespaces-and-dev-containers/)
- [GitHub Codespaces personalizing documentation](https://docs.github.com/en/codespaces/setting-your-user-preferences/personalizing-github-codespaces-for-your-account)
- [chezmoi issue #3884 — chezmoi in GitHub Codespaces](https://github.com/twpayne/chezmoi/issues/3884)
- [chezmoi discussion #1746 — Examples of modifying part of a file](https://github.com/twpayne/chezmoi/discussions/1746)
- [chezmoi discussion #3996 — Full examples of modifying part of a file](https://github.com/twpayne/chezmoi/discussions/3996)
- [RFC 6902 — JavaScript Object Notation (JSON) Patch](https://datatracker.ietf.org/doc/html/rfc6902)
