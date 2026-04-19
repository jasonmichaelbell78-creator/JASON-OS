# D19a — Product Dirs Inventory (Part 1)

**Agent:** D19a
**Profile:** codebase
**Date:** 2026-04-18
**Scope:** 9 product dirs under `sonash-v0/` — `app/`, `components/`, `lib/`, `src/`, `styles/`, `public/`, `types/`, `data/`, `dataconnect/`
**Method:** INVENTORY ONLY per SCHEMA_SPEC Section 7. No product files deep-read.

---

## Per-Dir Summary Table

| Dir | File Count | Size | Dominant Ext | Subdirs (1 level) |
|-----|-----------|------|-------------|-------------------|
| `app/` | 10 | 75K | tsx (9) | admin/, celebration-demo/, colors/, dev/, journal/, meetings/ |
| `components/` | 116 | 1.1M | tsx (109) | admin/, auth/, celebrations/, desktop/, dev/, growth/, home/, journal/, maps/, meetings/, notebook/, onboarding/, providers/, pwa/, settings/, status/, ui/, widgets/ |
| `lib/` | 34 | 249K | ts (33) | auth/, config/, contexts/, db/, hooks/, security/, types/, utils/ |
| `src/` | 15 | 136K | json (5), md (4), js (4) | dataconnect-generated/ |
| `styles/` | 1 | 8.0K | css (1) | (none) |
| `public/` | 37 | 12M | jpg (20), png (10) | fonts/, images/, leaflet-icons/ |
| `types/` | 1 | 4.0K | ts (1) | (none) |
| `data/` | 12 | 1.5M | jsonl (6), ts (4) | ecosystem-v2/ |
| `dataconnect/` | 12 | 182K | gql (10), yaml (2) | example/, schema/ |
| **TOTAL** | **238** | **~15.3M** | | |

---

## Per-Dir Narratives

### `app/` (10 files, 75K)

Next.js App Router root. Contains `layout.tsx`, `page.tsx`, and `globals.css` at the top level plus 6 route-segment subdirs: `admin/`, `celebration-demo/`, `colors/`, `dev/`, `journal/`, `meetings/`. Pure product code — no infrastructure artifacts. File mix is entirely TSX + 1 CSS (the app-router-level global stylesheet).

**Note:** `app/globals.css` and `styles/globals.css` both exist — potential duplication flagged as gap.

### `components/` (116 files, 1.1M)

Largest product dir by file count. 18 domain-organized subdirs covering every product feature area. Heavily TSX-dominant (109/116 files). This is the primary UI component library. The 18 subdirs map cleanly to product features: admin panel, auth flows, celebrations system, desktop shell, dev tools, growth tracking, home screen, journaling, maps, meetings, notebook, onboarding, context providers, PWA shell, settings, status indicators, primitive UI components, and dashboard widgets.

### `lib/` (34 files, 249K)

App-layer TypeScript utility library. 8 concern-organized subdirs: `auth/`, `config/`, `contexts/`, `db/`, `hooks/`, `security/`, `types/`, `utils/`. Almost entirely `.ts` (33/34). The `lib/hooks/` subdir contains React custom hooks (product hooks — confirmed single file `use-tab-refresh.ts`). The `lib/security/` subdir is a potential point of interest for future JASON-OS port analysis (security utilities may have portable patterns), but is out of scope for this inventory-only pass.

**Note:** `lib/types/` and top-level `types/` both exist — possible type consolidation gap.

### `src/` (15 files, 136K)

Auto-generated Firebase DataConnect client SDK. Single subdir: `src/dataconnect-generated/` containing `package.json`, `index.cjs.js`, `index.d.ts`, `README.md`, `esm/`, `react/`. This is build artifact / generated code, not hand-authored product code. Source of truth is `dataconnect/` (GQL definitions); `src/` is the compiled output.

**Architecture note:** `dataconnect/` is source, `src/dataconnect-generated/` is compiled SDK.

### `styles/` (1 file, 8.0K)

Minimal directory — single `globals.css` file. Possible redundancy with `app/globals.css`.

### `public/` (37 files, 12M)

Next.js static asset directory. Largest by disk size due to image content (20 JPG + 10 PNG). Contains: 2 web fonts (handlee-latin, rock-salt-latin in woff2), product images including Gemini-generated images (filename pattern `gemini-generated-image-*.jpeg/png`), and Leaflet map marker icons (4 PNGs for the maps feature). One JSON file (likely `manifest.json` for PWA).

### `types/` (1 file, 4.0K)

Minimal directory — single `types/journal.ts` file. The co-existence of top-level `types/` and `lib/types/` subdir suggests an organic split between shared type declarations and runtime-adjacent types. Potential consolidation candidate.

### `data/` (12 files, 1.5M)

Split purpose directory:
- **Static data (4 TS files at top level):** `glossary.ts`, `local-resources.ts`, `recovery-quotes.ts`, `slogans.ts` — application content data
- **Runtime tracking (ecosystem-v2/ subdir):** 5+ JSONL operational logs (`deferred-items.jsonl`, `ecosystem-health-log.jsonl`, `enforcement-manifest.jsonl`, `invocations.jsonl`, `test-registry.jsonl`, `warnings.jsonl`) plus an `archive/` with 2 dated `.archived-20260318` files

**Red flag:** `ecosystem-v2/` JSONL files appear to be runtime state for the SoNash ecosystem health/enforcement tracking system. These are likely machine-specific operational logs that may warrant gitignore review. The `.archived-20260318` date-stamped files confirm this is live operational data being versioned. The 1.5M size is entirely attributable to these JSONL logs.

### `dataconnect/` (12 files, 182K)

Firebase DataConnect schema and connector definitions. Clean structure: `schema/schema.gql` (data model) + `example/` (connector with `connector.yaml`, `mutations.gql`, `queries.gql`). The 10 GQL files and 2 YAML config files are all source definitions. Paired with `src/dataconnect-generated/` as its compilation output.

---

## Claude-Code Artifacts Flagged

**None found.** Checked all 9 dirs for:
- `CLAUDE.md`
- `.claude*` files/dirs
- `*.hook.*` patterns

Zero Claude-Code infrastructure artifacts detected in any product dir. The `lib/hooks/` subdir is React product hooks (confirmed `use-tab-refresh.ts`), not Claude hooks.

---

## Learnings for Methodology

1. **Dual globals.css pattern:** Two `globals.css` files (app/ and styles/) — a Next.js app-router project may have both an app-router-level global style and a legacy styles/ dir. Inventory should flag both and note the potential duplication rather than assuming one supersedes the other.

2. **src/ as generated-code dir:** `src/` here is entirely auto-generated Firebase DataConnect SDK output, not hand-authored source. The extension histogram (5 json, 4 md, 4 js, 2 ts) was the tip-off — mixed types + README + package.json = generated SDK package. Future scans should check for `README.md` + `package.json` inside a src/ subdir as a build-artifact signal.

3. **data/ split-purpose pattern:** Combining static application data (.ts files) with runtime operational JSONL logs in the same directory is an unusual pattern. The disk size anomaly (1.5M for 12 files vs 75K for app/ with 10 files) was the signal. When a data/ dir is disproportionately large, inspect for log/state files that may be gitignore candidates.

4. **Extension-based archive naming:** `.archived-20260318` as a file extension (appended to existing filename) is a SoNash-specific archive convention. Standard tools won't recognize this as a known type — the histogram surfaced it correctly as "2 archived-20260318".

5. **Scope clarification needed on matrix:** The SCHEMA_SPEC Section 5 coverage matrix assigns `lib/`, `src/`, `styles/`, `public/`, `types/` to D19b, but my spawn prompt assigned them to D19a (first half). The spawn prompt takes precedence. This discrepancy should be noted for D22 (schema surveyor) — the matrix may have been written before final agent scope assignment.

6. **lib/security/ deserves a note:** Not Claude-Code infrastructure, but contains security utility code that could be relevant to JASON-OS port analysis. Flagged in notes for completeness; not cross-referenced to a D-agent since it's product code.

7. **dataconnect/ → src/ build relationship:** Two dirs form a producer/consumer pair (dataconnect/ = GQL source → src/dataconnect-generated/ = compiled SDK). This is a data contract that would normally go to D21's composite unit schema, but since both dirs are product-code, noting it in each dir's notes is sufficient.

---

## Gaps and Missing References

1. **app/ subdirs not enumerated:** Per Section 7 protocol, only 1 level of subdirs was captured. The individual route files inside `app/admin/`, `app/journal/`, etc. were not listed — intentional per inventory-only methodology.

2. **public/images/ chip dir:** `public/images/chips/` was observed during spot-check but not enumerated further. May contain additional image assets not counted in the top-level extension histogram (the `find` command was recursive so count is accurate).

3. **data/ecosystem-v2/archive/ gitignore status unknown:** Cannot determine without reading git config whether these JSONL logs and archives are gitignored. Flagged as red flag in notes. D22 or a dedicated gitignore scan should verify.

4. **lib/security/ contents unknown:** Not deep-read per protocol. Noted as potentially relevant for future port analysis.

5. **app/ root page.tsx purpose:** Unknown without reading the file. Could be a redirect, landing page, or the primary app shell.
