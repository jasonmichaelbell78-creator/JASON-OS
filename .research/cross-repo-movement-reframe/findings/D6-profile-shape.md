# Findings: Target-Process-Profile Data Structure

**Searcher:** deep-research-searcher (B2)
**Profile:** web + reasoning
**Date:** 2026-04-23
**Sub-Question IDs:** B2 — "What is the data structure of a target-process-profile, and how is it organized?"

---

## Sub-Question

What top-level fields does a target-process-profile carry? What is the data shape of each gate inside the gates section? What is the per-unit-type shape inside the shapes section? Where does the file live on disk?

---

## Approach

1. Read BRAINSTORM.md and PHASE_0_LANDSCAPE.md in full to extract design constraints and Challenge 6 resolution wording.
2. Surveyed four reference systems for "describe-a-target-environment" data structures:
   - GitHub Actions `action.yml` metadata (composite/reusable action inputs schema)
   - Terraform `providers schema -json` output (hierarchical block + attribute shape)
   - Ansible inventory + group_vars (per-host variable scoping)
   - Bazel platform rules (constraint_setting / constraint_value as dimension + value pairs)
3. Checked existing project enums in `.claude/sync/schema/enums.json` for the actual file-kind taxonomy in use.
4. Applied the BRAINSTORM's explicit design forces: field-count discipline, no-over-engineering, gates-first, shapes-second-but-named, profile is per target repo, profile is a cache (not source of truth).

---

## Finding 1 — Top-Level Profile Shape

**CONFIDENCE: HIGH** (derived directly from BRAINSTORM constraints + well-established registry patterns)

A profile is a per-owned-target-repo cache written by the first companion that writes into that repo and read by all subsequent writes. It is NOT a ledger record — it has no lineage. It is a discovery artifact.

The BRAINSTORM names the profile's contents explicitly: "gate-and-guardrail discovery (primary) plus shape-expectations (secondary, named explicitly per Challenge 6 resolution)." The Challenge 6 resolution adds: "directory convention / companion files / naming scheme — three fields per unit type."

These constraints directly determine the top-level field set. No field earns its place unless it serves one of: identity (which repo), cache freshness (when to re-discover), explainability (which files produced this), gate data, or shape data.

**Top-level fields:**

| Field | Type | Purpose |
|---|---|---|
| `schema_version` | string | Profile format version, e.g. `"1"`. Mirrors ledger's versioning approach. Allows cache reader to detect format mismatch and re-discover rather than silently misread. |
| `repo_name` | string | Human-readable target repo name (e.g., `"SoNash"`). Primary identity key used in file naming and in ledger cross-references. |
| `repo_remote_url` | string or null | Git remote URL if detectable (e.g., `"git@github.com:owner/sonash.git"`). Optional — not all repos have a configured remote, but if present it disambiguates renamed repos. |
| `discovered_at` | ISO 8601 string | Timestamp of last discovery run. Used to determine cache staleness. |
| `discovered_at_sha` | string | Git HEAD SHA of the target repo at discovery time. A SHA mismatch on next access signals the repo has changed and the profile may be stale. |
| `discovery_source_map` | object | Map of which files were read to build this profile. Keys are section names (`"gates"`, `"shapes"`); values are arrays of relative file paths. Supports explainability and re-discovery trigger logic. |
| `gates` | array | Ordered list of gate objects. See Finding 2. |
| `shapes` | object | Map of unit-type name to 3-field shape block. See Finding 3. |

**Total top-level fields: 8.** This is intentionally minimal. The BRAINSTORM explicitly rejects the "30+ field universal schema" failure pattern; this profile has no metadata fields beyond what's operationally needed.

**Reference cross-checks:**

- Terraform `providers schema -json` uses a top-level `format_version` string plus a versioned `block` per schema — the same version-at-top pattern. [1]
- GitHub Actions `action.yml` uses a flat set of named top-level keys (`name`, `description`, `inputs`, `outputs`, `runs`) with no nesting beyond what each section needs. [2] The profile follows this same philosophy: flat top level, structured sections.
- Ansible `group_vars` organizes per-host variable scoping by filename matching the group name — the same "one file per target" pattern used here. [3]

---

## Finding 2 — Gates Section Shape

**CONFIDENCE: HIGH** (derived from BRAINSTORM design constraints + reference system patterns)

Each gate describes one enforcement point in the target repo. The companion must produce output that satisfies every gate or it has failed its job.

The BRAINSTORM states: "Target-process-profile (gates, guardrails, hooks, CI, review infrastructure) discovered on first write into each owned target repo and cached."

A gate has two audiences: the discovery process (which populates it) and the moving companion (which reads it). Fields serve one of those two purposes. No decoration.

**Per-gate fields:**

| Field | Type | Purpose |
|---|---|---|
| `gate_id` | string | Stable slug for this gate (e.g., `"pre-commit-gitleaks"`, `"ci-codeql"`). Used as a deduplification key if the same gate is detected from multiple source files. kebab-case. |
| `trigger` | enum string | When this gate fires: `"pre-commit"`, `"pre-push"`, `"ci-pr"`, `"ci-merge"`, `"ci-push"`, `"manual"`. Directly maps to git hook event or CI trigger. |
| `required_by` | string | Relative path of the file that declared this gate (e.g., `.husky/pre-commit`, `.github/workflows/semgrep.yml`). Back-reference for re-discovery and for the companion to trace why the gate exists. |
| `action_description` | string | Plain English: what this gate does. Written for the companion, not for humans. E.g., `"Scans committed content for secrets using gitleaks patterns."` |
| `companion_directive` | string | Plain English: what the moving companion must do to satisfy this gate. E.g., `"Never include content matching gitleaks secret patterns. Strip API keys, tokens, credentials before writing."` This is the operationally-actionable field — the companion reads this as an instruction. |
| `confidence` | enum string | `"HIGH"` (parsed cleanly from config), `"MEDIUM"` (inferred from heuristic, e.g., detected a workflow file but couldn't parse its trigger exactly), `"LOW"` (guessed from directory structure or naming convention alone). |

**Total per-gate fields: 6.** Lean enough to parse and scan quickly. No fields for gate severity, gate owner, remediation steps, or other metadata that the companion doesn't directly act on.

**Worked example (JASON-OS's own gitleaks gate as it would appear if JASON-OS were the target):**

```json
{
  "gate_id": "pre-commit-gitleaks",
  "trigger": "pre-commit",
  "required_by": ".husky/pre-commit",
  "action_description": "Runs gitleaks to scan staged content for secrets before allowing commit.",
  "companion_directive": "Do not write content that matches gitleaks secret patterns. Strip tokens, API keys, credentials, and private URLs before emitting any file into this repo.",
  "confidence": "HIGH"
}
```

**Reference cross-checks:**

- GitHub Actions inputs schema uses `description` (what it is) + `required` (enforcement) + `default` (fallback behavior). The gate schema follows the same pattern: description-of-what + directive-for-compliance + confidence-of-detection. [2]
- Terraform block attributes carry `description`, `required`, `sensitive` — a similar three-concern pattern. [1]
- Bazel `constraint_setting` / `constraint_value` pairs define a dimension + a value. The gate's `trigger` + `gate_id` plays the same role: dimension (when does it fire) + specific instance (what exactly). [4]

---

## Finding 3 — Shapes Section (Per-Unit-Type)

**CONFIDENCE: HIGH** (Challenge 6 resolution in BRAINSTORM is explicit; three fields per unit type is a design hard constraint)

The BRAINSTORM's Challenge 6 resolution is unambiguous: "shape-expectations restored as a named profile component. Three fields per unit type: directory convention / companion files / naming scheme." This is a design constraint, not a finding to be derived — it is specified.

What requires research is: which unit types get shape blocks, and what the three-field values look like for each.

The BRAINSTORM names the unit types as: file, family/composite, memory, context-artifact, concept. These five map to the five abstract movement categories, not to the 27-value `type` enum in `enums.json` (which is the file-kind classification for catalog records). The profile shapes section uses the coarser, movement-oriented categorization.

**The 3-field block (same structure for every unit type):**

| Field | Type | Purpose |
|---|---|---|
| `directory` | string | Where this unit type lives in the target repo. Use a pattern with `<name>` as the slot placeholder. E.g., `.claude/skills/<name>/` |
| `companion_files` | array of objects | Files that MUST or SHOULD accompany the primary file. Each object: `{ "path": "<name>/SKILL.md", "required": true }`. Patterns allowed. Empty array if no companions required. |
| `naming_scheme` | string | Human-readable naming rule. E.g., `"kebab-case directory, e.g. my-skill"` or `"UPPER_SNAKE.md for manifest files"` or `"<verb>-<noun> pattern"`. |

**Per-unit-type 3-field blocks (as defaults — target repo discovery overrides):**

These are the JASON-OS conventions that serve as the discovery baseline. A companion discovering a target repo compares these defaults against what it actually finds in that repo and records the target's actual conventions.

**unit_type: `file`**
A single standalone file with no required companions.
```
directory:        depends on file kind — no fixed convention (varies by file_type)
companion_files:  []
naming_scheme:    "follows target repo conventions for the file kind; no cross-type rule"
```
Note: `file` is the catch-all for unit types that don't fit the more structured categories. The discovery process uses the target's actual directory layout rather than a JASON-OS-specific default.

**unit_type: `family` (also called `composite`)**
A grouping of related files treated as one movement unit (e.g., a skill directory with SKILL.md + reference/ + scripts).
```
directory:        ".claude/skills/<name>/"
companion_files:  [
                    { "path": "<name>/SKILL.md", "required": true },
                    { "path": "<name>/reference/", "required": false }
                  ]
naming_scheme:    "kebab-case directory name; SKILL.md literal filename; reference/ literal dirname"
```

**unit_type: `memory`**
A memory file scoped to a project or user.
```
directory:        "~/.claude/projects/<project-hash>/memory/"   (user-scoped)
                  ".claude/canonical-memory/"                    (project-scoped)
companion_files:  []
naming_scheme:    "snake_case or kebab-case .md filename; no strict rule — follows target repo's existing memory filenames"
```
Note: memory has two directory conventions depending on scope (user vs project). The discovery process records both if both exist in the target.

**unit_type: `context-artifact`**
Session-produced artifacts: research outputs, planning docs, decision registers, state files.
```
directory:        ".research/<topic>/"   (research artifacts)
                  ".planning/<topic>/"   (planning artifacts)
                  ".claude/state/"       (machine state files)
companion_files:  []
naming_scheme:    "uppercase for primary docs (FINDINGS.md, DECISIONS.md, BRAINSTORM.md); lowercase-with-hyphens for supporting files"
```

**unit_type: `concept`**
Abstract patterns, tenets, or design principles that exist as documentation and may manifest as memory files or inline CLAUDE.md text rather than as standalone moveable files.
```
directory:        "~/.claude/projects/<project-hash>/memory/"   (if tenet is a memory file)
                  "CLAUDE.md"                                    (if embedded in project instructions)
companion_files:  []
naming_scheme:    "tenet_<name>.md for dedicated tenet files; no convention if embedded"
```
Note: `concept` is the unit type least amenable to mechanical movement. Discovery records where the target manifests concept-equivalent content (if at all) as a signal to the understanding layer.

---

## Finding 4 — Profile Schema Sketch

**CONFIDENCE: HIGH** (derived from Findings 1-3)

Full type definition in TypeScript-style pseudocode:

```typescript
type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

type GateTrigger =
  | "pre-commit"
  | "pre-push"
  | "ci-pr"
  | "ci-merge"
  | "ci-push"
  | "manual";

type CompanionFile = {
  path: string;      // relative path pattern, <name> as slot placeholder
  required: boolean; // true = must be present; false = recommended
};

type ShapeBlock = {
  directory: string;              // where this unit type lives in target
  companion_files: CompanionFile[]; // required/recommended accompanying files
  naming_scheme: string;          // plain-English naming rule
};

type Gate = {
  gate_id: string;                // stable kebab-case slug
  trigger: GateTrigger;           // when this gate fires
  required_by: string;            // relative path of declaring file
  action_description: string;     // plain English: what the gate does
  companion_directive: string;    // plain English: what the companion must do
  confidence: ConfidenceLevel;    // how reliably this was detected
};

type DiscoverySourceMap = {
  gates: string[];   // relative paths read to discover gates
  shapes: string[];  // relative paths read to discover shapes
};

type UnitType = "file" | "family" | "memory" | "context-artifact" | "concept";

type TargetProcessProfile = {
  schema_version: string;                   // e.g., "1"
  repo_name: string;                        // e.g., "SoNash"
  repo_remote_url: string | null;           // git remote URL or null
  discovered_at: string;                    // ISO 8601 timestamp
  discovered_at_sha: string;               // git HEAD SHA at discovery
  discovery_source_map: DiscoverySourceMap; // which files were read
  gates: Gate[];                            // ordered list, primary section
  shapes: Record<UnitType, ShapeBlock>;     // per unit type, secondary section
};
```

**Worked minimal example (JSON):**

```json
{
  "schema_version": "1",
  "repo_name": "SoNash",
  "repo_remote_url": "git@github.com:owner/sonash.git",
  "discovered_at": "2026-04-23T14:30:00Z",
  "discovered_at_sha": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "discovery_source_map": {
    "gates": [".husky/pre-commit", ".github/workflows/semgrep.yml", ".github/workflows/codeql.yml"],
    "shapes": [".claude/skills/", ".claude/settings.json", "CLAUDE.md"]
  },
  "gates": [
    {
      "gate_id": "pre-commit-gitleaks",
      "trigger": "pre-commit",
      "required_by": ".husky/pre-commit",
      "action_description": "Runs gitleaks to scan staged content for secrets before allowing commit.",
      "companion_directive": "Do not write content that matches gitleaks secret patterns. Strip tokens, API keys, credentials, and private URLs before emitting any file into this repo.",
      "confidence": "HIGH"
    }
  ],
  "shapes": {
    "file": {
      "directory": "varies by file kind",
      "companion_files": [],
      "naming_scheme": "follows target repo conventions for the file kind"
    },
    "family": {
      "directory": ".claude/skills/<name>/",
      "companion_files": [
        { "path": "<name>/SKILL.md", "required": true },
        { "path": "<name>/reference/", "required": false }
      ],
      "naming_scheme": "kebab-case directory; SKILL.md literal filename"
    },
    "memory": {
      "directory": "~/.claude/projects/<hash>/memory/",
      "companion_files": [],
      "naming_scheme": "snake_case or kebab-case .md filename"
    },
    "context-artifact": {
      "directory": ".research/<topic>/ or .planning/<topic>/",
      "companion_files": [],
      "naming_scheme": "UPPERCASE for primary docs; lowercase-with-hyphens for supporting files"
    },
    "concept": {
      "directory": "~/.claude/projects/<hash>/memory/ or embedded in CLAUDE.md",
      "companion_files": [],
      "naming_scheme": "tenet_<name>.md if standalone; no convention if embedded"
    }
  }
}
```

---

## Finding 5 — Where the Profile Lives on Disk

**CONFIDENCE: MEDIUM** (reasoned from existing project patterns; not explicitly stated in BRAINSTORM)

The BRAINSTORM describes profiles as a "target-process-profile cache — one profile per owned target repo." This means:

- One JSON file per target repo.
- Lives inside JASON-OS (the tool's home), not inside the target repo.
- Must be in a location that is gitignored or clearly machine-local, since SHA and timestamp fields are machine-specific state.

**Recommended location:** `.claude/state/profiles/<repo-name>.json`

Rationale:
- `.claude/state/` is already the project's home for machine-local runtime state (commit-log.jsonl, hook-warnings-log.jsonl, task-pr-review-*.state.json, etc.). This is observed directly in the filesystem.
- `<repo-name>` as the filename (e.g., `sonash.json`) is the natural key matching the `repo_name` field at the top of the profile.
- `profiles/` subdirectory isolates profile files from other state files as the set of tracked repos grows.
- If `.claude/state/profiles/` does not exist yet, the companion creates it on first profile write.

**Alternative considered:** embedding the profile inside the target repo itself (e.g., `<target>/.claude/state/jason-os-profile.json`). Rejected for two reasons: (1) it requires the companion to have write access to the target repo before discovery is complete, creating a chicken-and-egg; (2) it places JASON-OS's internal state inside a repo that belongs to the target, which is a scope violation.

**Gitignore status:** `.claude/state/` should be gitignored for machine-specific files. If profile files are gitignored, they are re-discovered on each new machine clone — which is acceptable behavior given that discovery reads the target repo's live files anyway.

---

## Claims

1. **The profile carries exactly 8 top-level fields.** CONFIDENCE: HIGH. Derived from BRAINSTORM constraints: identity (repo_name, repo_remote_url), cache freshness (discovered_at, discovered_at_sha), format safety (schema_version), explainability (discovery_source_map), and the two data sections (gates, shapes).

2. **Each gate carries exactly 6 fields.** CONFIDENCE: HIGH. Derived from the two-audience requirement (discovery populates; companion reads) and the no-decoration constraint. Fields are: gate_id, trigger, required_by, action_description, companion_directive, confidence.

3. **The shapes section uses exactly 3 fields per unit type.** CONFIDENCE: HIGH. Challenge 6 resolution in BRAINSTORM is explicit: "directory convention / companion files / naming scheme."

4. **The five unit types in the shapes section are: file, family, memory, context-artifact, concept.** CONFIDENCE: MEDIUM. These come from the BRAINSTORM's Challenge 6 framing and the movement-oriented unit classification described across BRAINSTORM and PHASE_0_LANDSCAPE. The `enums.json` type enum (27 values) is a finer-grained catalog classification that does NOT map 1:1 to these profile unit types. The profile uses the coarser movement-category classification.

5. **Profiles live at `.claude/state/profiles/<repo-name>.json` inside JASON-OS.** CONFIDENCE: MEDIUM. Derived from existing `.claude/state/` usage patterns observed in the filesystem. Not explicitly specified in BRAINSTORM.

6. **`repo_remote_url` is nullable.** CONFIDENCE: HIGH. Not all repos will have a configured remote (e.g., a local-only scratch repo). Nullable field prevents discovery failure on repos without remotes.

7. **`discovered_at_sha` enables staleness detection without re-reading all source files.** CONFIDENCE: HIGH. SHA comparison is a standard cache-invalidation approach used in GitHub Actions caching and Terraform state; a mismatch triggers re-discovery. [1][2]

8. **The `companion_directive` field is the operationally-critical gate field.** CONFIDENCE: HIGH. It is the field the moving companion actually reads as an instruction. All other gate fields are for provenance, routing, and confidence tracking.

---

## Sources

| # | URL | Title | Type | Trust | CRAAP (avg) | Date |
|---|---|---|---|---|---|---|
| 1 | https://developer.hashicorp.com/terraform/cli/commands/providers/schema | Terraform providers schema command | Official docs | HIGH | 4.4 | Current |
| 2 | https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax | GitHub Actions metadata syntax | Official docs | HIGH | 4.6 | Current |
| 3 | https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html | Ansible inventory guide | Official docs | HIGH | 4.2 | Current |
| 4 | https://bazel.build/extending/platforms | Bazel platforms | Official docs | HIGH | 4.0 | Current |
| 5 | BRAINSTORM.md (project file) | cross-repo-movement-reframe BRAINSTORM | Project design doc | HIGH | 5.0 | 2026-04-23 |
| 6 | .claude/sync/schema/enums.json (project file) | JASON-OS enum schema | Project source file | HIGH | 5.0 | Current |

---

## Contradictions

None identified. The four reference systems (Terraform, GitHub Actions, Ansible, Bazel) are structurally consistent in their approach: a version field at top, a flat set of named top-level sections, and per-item fields that serve either "describe what this is" or "describe what to do with it" purposes. These patterns reinforce rather than contradict the profile design derived from the BRAINSTORM constraints.

One tension to surface: the BRAINSTORM says the shapes section is "secondary" to gates. This could be read as "optional" or as "lower priority." The Challenge 6 resolution makes clear it is NOT optional — it is a named, required profile component. Secondary means it's populated after gates in the discovery pass, not that it can be omitted.

---

## Gaps

1. **Discovery mechanism is out of scope for B2.** This document defines the profile data structure; sibling B1 covers which files to read. How the discovery process populates `companion_directive` from a parsed workflow file (the hardest field to derive mechanically) is a B1 concern.

2. **Profile file gitignore status is not specified in BRAINSTORM.** The recommendation to gitignore profiles (since they contain machine-specific SHA and timestamp data) is derived reasoning, not an explicit design decision. This should be confirmed in planning.

3. **Schema version migration strategy is not defined.** The `schema_version` field enables future format changes, but what happens when a companion reads a profile at an older version is not specified here. A simple rule (re-discover if version mismatch) is implied but not locked.

4. **The `file` unit type shape block is intentionally vague.** "Varies by file kind" is not a useful directive for a companion. Planning should decide whether `file` gets sub-typed (e.g., `file.config`, `file.doc`) or whether the profile simply marks it as "use target repo conventions" and delegates to the companion's understanding layer.

5. **Whether `shapes` is populated for ALL five unit types or only for types the target repo demonstrably uses** is not decided here. A target with no skill files might have no `family` shape to report. Planning should specify whether the shapes block is always fully populated with defaults or only populated for observed types.

---

## Serendipity

The Terraform `providers schema -json` pattern of using a `format_version` string at the absolute top level (before any data) is worth noting as a pattern. If a future profile reader encounters a profile with an unknown `schema_version`, it can fail fast with a clear error before attempting to parse the rest of the document. The ledger (per D1-D3 sibling findings) presumably does the same. Both documents should use the same version key name (`schema_version`) for consistency across the shared data backbone.

---

## Confidence Assessment

- HIGH claims: 6
- MEDIUM claims: 2
- LOW claims: 0
- UNVERIFIED claims: 0
- Overall confidence: HIGH
