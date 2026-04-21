# D6-cas-integration — CAS Outside-Dependency Inventory

**Agent:** D6-cas-integration (Phase 1 D-agent, /migration deep-research)
**Sub-question:** SQ-D6e — What does CAS reach OUT to that must be resolved in
JASON-OS before CAS can run there?
**Depth:** L1 (file:line)
**Scope:** 6 CAS skills (`analyze`, `document-analysis`, `media-analysis`,
`recall`, `repo-analysis`, `synthesize`) + `scripts/cas/` (12 .js scripts) +
CAS planning (`.planning/content-analysis-system/`).
**Date:** 2026-04-21
**Status:** FINAL

---

## Summary

CAS has **zero outbound auth dependencies** (no API keys, no OpenAI/Anthropic
/Google/Firebase tokens anywhere in scripts or skills). It is a
**filesystem-native** subsystem. Its real coupling to SoNash is through
**four concrete seams**:

1. **Home-context files** — `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`,
   `MEMORY.md`, `.research/home-context.json` (optional) — hard-wired into
   every handler's Creator View phase. These are the assumption surfaces §5 Q6
   /D19 calls out: "home-context assumptions reshaped during the CAS port."
2. **`scripts/lib/*` helper modules** — 8 distinct lib imports across CAS
   (sanitize-error, security-helpers, safe-fs, safe-cas-io, parse-jsonl-line,
   read-jsonl, analysis-schema, retag-mutations). CAS **cannot** move without
   these.
3. **Sibling CAS skills** — analyze dispatches via `Skill` tool to 4
   handlers + synthesize; synthesize invokes `/convergence-loop` and Phase 6
   routes to `/brainstorm` `/deep-plan` `/deep-research` `/analyze`.
4. **External CLI tooling** invoked via Bash at skill-level (NOT script-level):
   `git`, `gh`, `npx repomix@latest`, Python (`youtube-transcript-api`,
   `faster_whisper`, `pdfjs-dist`), `npx tsx` for invocation-tracking.

No PreToolUse/PostToolUse hooks gate CAS. CAS is isolated at the hook layer —
which makes porting the **scripts** surgical, but the **skills** carry
implicit assumptions about home-context file shapes and sibling skills being
resolvable by name.

**SoNash-specific hardcoding is minimal** — one home-repo-guard string
(`jasonmichaelbell78-creator/sonash-v0`) and one stack-version set in
CLAUDE.md §1. The `.research/` directory layout is portable as-is.

---

## 1. Auth / Credentials

**Count: 0** (zero outbound auth dependencies)

### Script-level scan
Grep for `process.env|OPENAI|ANTHROPIC|API_KEY|TOKEN|SECRET|GOOGLE|FIREBASE`
across `scripts/cas/*.js`: **no matches**. The 12 CAS scripts are
filesystem-only. SQLite via `better-sqlite3` is local — no network, no auth.

Verified files:
- `scripts/cas/rebuild-index.js:14-19` — fs, path, better-sqlite3, lib imports
- `scripts/cas/update-index.js:16-21` — same shape
- `scripts/cas/recall.js:22-30` — fs, path, better-sqlite3, lib imports
- `scripts/cas/self-audit.js:19-28` — pure fs/lib
- `scripts/cas/retag.js:21-33` — fs/lib + `node:child_process` (spawnSync for
  re-running scripts, not API)
- `scripts/cas/generate-extractions-md.js:15-19` — fs/lib
- `scripts/cas/migrate-v3.js`, `migrate-schemas.js`, `backfill-candidates.js`,
  `backfill-tags.js`, `fix-depth-mislabel.js`,
  `promote-firecrawl-to-journal.js` — all fs/lib only

### Skill-level auth surfaces (via Bash/WebFetch at invocation, NOT via script)
These are **indirect** dependencies on **user-level** auth, not on a CAS
API-key the migration would need to port:

- **`/repo-analysis`** — uses `gh api rate_limit` and `gh api` for repo
  metadata. `repo-analysis/SKILL.md:69,92,429`. Auth via user's `gh` CLI
  token (stored in GitHub CLI config, NOT in repo).
- **`/document-analysis`** — uses `gh api /gists/<gist-id>` for gist
  metadata. `document-analysis/REFERENCE.md:930`.
- **`/media-analysis`** — YouTube oEmbed API (public, no key);
  `youtube-transcript-api` Python lib (no key, uses YouTube cookies).
  `media-analysis/SKILL.md:160-162,191-193`.
- **`/repo-analysis`** — `npx repomix@latest` (npm public registry, no auth).
  `repo-analysis/SKILL.md:175`.

**Port implication:** Zero secrets to migrate. JASON-OS operator needs `gh`
authenticated locally for repo/gist handlers — this is a **user-environment
prerequisite**, not a CAS port blocker.

---

## 2. Data Paths Outside CAS

**External path count: 5 canonical home-context paths + `.research/`
substrate**

### Home-context files (MUST-load for Creator View)
Referenced identically across the 4 content handlers:

- `repo-analysis/SKILL.md:279-280` — *"Home repo context loading (MUST):
  `SESSION_CONTEXT.md`, `ROADMAP.md`, `CLAUDE.md`, `.claude/skills/`,
  MEMORY.md entries."*
- `document-analysis/SKILL.md:61-63` — same 5-file set
- `media-analysis/SKILL.md:68-69` — same 5-file set
- `repo-analysis/REFERENCE.md:1540-1546` — normative section: SESSION_CONTEXT
  (sprint), ROADMAP (vision), CLAUDE.md (conventions), `.claude/skills/`
  (listing), MEMORY.md (project initiatives)
- `synthesize/SKILL.md:198-201` — synthesize adds: *"Prefer dynamic discovery
  from `.research/home-context.json` when present; fall back to the listed
  5."* + auto-loaded MEMORY.md feedback entries

### Write surfaces outside CAS slug dirs
CAS handler skills and CAS scripts write beyond `.research/analysis/<slug>/`:

- `.research/extraction-journal.jsonl` — append-only cross-source record;
  written by every handler at Phase 6, read by `rebuild-index.js`,
  `update-index.js`, `recall.js`, `generate-extractions-md.js`.
  `scripts/cas/rebuild-index.js:26`, `update-index.js:28`,
  `generate-extractions-md.js:22`.
- `.research/EXTRACTIONS.md` — human-readable regeneration target.
  `scripts/cas/generate-extractions-md.js:23`.
- `.research/content-analysis.db` + WAL/SHM — SQLite index.
  `scripts/cas/rebuild-index.js:22`, `update-index.js:24`, `recall.js:34`.
- `.research/tag-vocabulary.json` — vocabulary for tag classification.
  `scripts/cas/recall.js:35`.
- `.research/reading-chain.jsonl` — cross-source relationship graph.
  `repo-analysis/SKILL.md:340`.
- `.research/analysis/synthesis/` + `history/` + `opportunities-ledger.jsonl`
  — synthesize-owned outputs.
- `.claude/state/analyze-routing-log.jsonl` — routing decision log.
  `analyze/SKILL.md:147,224`.
- `.claude/state/<handler>.<slug>.state.json` — per-handler state files.
- `.claude/state/synthesize.state.json`, `synthesize.lock`,
  `synthesize-audit-log.jsonl` — synthesize state.
- `data/ecosystem-v2/invocations.jsonl` — **SoNash-specific** (via
  `scripts/reviews/write-invocation.ts`). `recall/SKILL.md:234`,
  `repo-analysis/SKILL.md:530-537`.

### Path-to-port DAG (data-substrate view)
JASON-OS needs these **existing or creatable** for CAS to run:

```
.research/                                     (root for CAS substrate)
├── analysis/                                  (per-slug handler outputs)
├── analysis/synthesis/                        (synthesize outputs)
│   ├── history/                               (archive)
│   └── opportunities-ledger.jsonl
├── extraction-journal.jsonl                   (canonical JSONL substrate)
├── EXTRACTIONS.md                             (regenerated, human-readable)
├── content-analysis.db (+ -wal, -shm)         (gitignored SQLite)
├── tag-vocabulary.json                        (optional but referenced)
├── reading-chain.jsonl                        (cross-source relationships)
└── home-context.json                          (NEW — JASON-OS should ship)

.claude/state/                                 (ephemeral state)
├── analyze-routing-log.jsonl
├── synthesize.state.json, .lock, audit-log.jsonl
└── <handler>.<slug>.state.json
```

All these paths are **relative to project root** (`PROJECT_ROOT =
path.resolve(__dirname, "../..")` — `scripts/cas/rebuild-index.js:21`),
making the substrate portable with zero path rewrites.

---

## 3. SoNash-Specific Labels / Tags / Categories

**Hardcoded-list count: ~3 (all minor)**

### Home-repo identity string (hardcoded)
- `repo-analysis/SKILL.md:68,432` — *"If target matches
  `jasonmichaelbell78-creator/sonash-v0`, redirect to `/audit-comprehensive`."*
  **Port:** parameterize as `HOME_REPO` config or `.research/home-context.json`
  field.

### SoNash stack version table (from CLAUDE.md §1)
Next.js 16 / React 19 / Firebase 12 / Tailwind 4 / Zod 4 — **NOT referenced in
CAS code**, but Creator View reads `CLAUDE.md` and therefore includes stack
deltas in §2 "What's Relevant" and §3 "Where Your Approach Differs". Port
implication: JASON-OS's `CLAUDE.md` already advertises stack-agnosticism
(§1); Creator View will naturally produce stack-neutral outputs when run
against JASON-OS's CLAUDE.md.

### Tag vocabulary
`.research/tag-vocabulary.json` is a **data file**, not hardcoded — content
is user-owned. `scripts/cas/recall.js:35` loads it via safe-fs. Not a port
blocker; carries over as data.

### Other hardcoded strings
- `scripts/reviews/write-invocation.ts` usage carries SoNash-specific
  invocation-tracking context (see §2 above). This is a **coupling to
  SoNash's metrics pipeline**, not to CAS identity. The invocation-tracking
  blocks in all 6 CAS skills (`repo-analysis/SKILL.md:530`,
  `document-analysis/SKILL.md:413`, `media-analysis/SKILL.md:449`,
  `recall/SKILL.md:234`) need to be stubbed or dropped for JASON-OS port.
  Per JASON-OS CLAUDE.md "Phase 3 metrics pipeline deferred" (session-end
  skill reference), this is already gated off in JASON-OS.

### NOT found
- No SoNash content categories (journal/daily_logs/inventoryEntries) in any
  CAS skill or script. CAS is content-type-agnostic (repo/website/document/
  media are generic).
- No Firestore/Cloud Functions references in CAS. CAS never touches SoNash's
  data layer.

---

## 4. Other Skills CAS Calls

**Cross-skill call count: 7 distinct skills invoked**

### Via `Skill` tool (hard dispatch)
- `/analyze` → **`/repo-analysis`**, **`/website-analysis`**,
  **`/document-analysis`**, **`/media-analysis`** (4 handlers).
  `analyze/SKILL.md:117,213-214` — *"Dispatch to handler via `Skill` tool
  call."*
- `/analyze --synthesize` → **`/synthesize`**.
  `analyze/SKILL.md:236-239`.
- `/synthesize` → **`/convergence-loop`** (Phases 2.5 and 4.5 mandatory).
  `synthesize/SKILL.md:246,289` — *"Invoke via the `/convergence-loop`
  skill (quick profile, 2 passes minimum)."*
- `/synthesize` Phase 6 routing → **`/brainstorm`**, **`/deep-plan`**,
  **`/deep-research`**, **`/analyze`** (user-selected, via Skill tool with
  `--context=<json>`). `synthesize/SKILL.md:332,338-342`,
  `synthesize/REFERENCE.md:181-183`.

### Via upstream references (NOT dispatched, documented as triggers)
- `/recall` referenced as downstream query surface by `/deep-plan`,
  `/brainstorm` (CLAUDE.md PRE-TASK rule) — these upstream skills read
  `.research/EXTRACTIONS.md` + `extraction-journal.jsonl` directly, **not**
  via a Skill call to `/recall`. `recall/SKILL.md:214-216`.
- `/repo-analysis` references `/audit-comprehensive` for home-repo redirect
  (NOT a CAS skill — SoNash-only audit skill).
  `repo-analysis/SKILL.md:68`.

### SKILL-dispatch DAG
```
/analyze (router)
  ├── /repo-analysis ────┐
  ├── /website-analysis ─┤
  ├── /document-analysis ┤ (handlers; write .research/analysis/<slug>/)
  └── /media-analysis ───┘

/analyze --synthesize ─→ /synthesize
                         ├── /convergence-loop (mandatory, Phases 2.5/4.5)
                         └── [Phase 6 user-routed] ──→ /brainstorm
                                                    ──→ /deep-plan
                                                    ──→ /deep-research
                                                    ──→ /analyze (re-enter)
```

**Not called:** `/sync`, `/pr-review`, `/label-audit`, S8-backfill — zero
references to these in any CAS skill or script (grepped explicitly).

---

## 5. Hooks CAS Depends On

**Hook dependency count: 0** (zero PreToolUse/PostToolUse hooks required)

Grep of `.claude/hooks/*.js` for CAS-related patterns
(`cas/|content-analysis|extraction-journal|tag-vocabulary|analyze|recall|
synthesize|repo-analysis|document-analysis|media-analysis`, case-insensitive):

- `user-prompt-handler.js:144-145,707` — contains `runAnalyze()` function
  and `ANALYZE USER REQUEST` comment, but this is **prompt analysis** (user
  intent classification), NOT the `/analyze` CAS skill. False positive.
- No other hook files mention CAS, content-analysis, extraction, or any CAS
  skill name.

### Settings.json
`.claude/settings.json` grep for `cas/|content-analysis|extraction-journal`:
**no matches**.

### Implication
CAS is **hook-independent**. It:
- Does not rely on a PreToolUse hook to validate slugs, paths, or payloads.
- Does not rely on a PostToolUse hook to rebuild indexes (rebuild is called
  explicitly from `/analyze` Router Step 5.2 and `/synthesize` Phase 5
  step 4 via `node scripts/cas/update-index.js` / `rebuild-index.js`).
- Does not rely on settings-guardian, large-file-gate, or any of the 28
  hooks in SoNash's `.claude/hooks/`.

The handler skills DO defend against hook-rejection of prose writes:
`repo-analysis/SKILL.md:437` — *"Write-rejection bypass — hook-rejected
prose writes → retry via Bash/Python, never silently skip."* — this is a
**defense**, not a dependency. JASON-OS's hook suite (whatever lands)
won't break CAS as long as write paths aren't blocked outright.

**Port cost of hooks: ZERO.** Pure skill+script port.

---

## 6. Lib Helpers CAS Uses

**Lib-import count: 8 distinct `scripts/lib/*` modules**

Imports observed (across 12 CAS scripts):

| Lib module | Consumers (CAS scripts) |
| --- | --- |
| `scripts/lib/security-helpers.js` | all 12 CAS scripts — `sanitizeError`, `validatePathInDir`, `refuseSymlinkWithParents`, `slugify` |
| `scripts/lib/safe-fs.js` | 9 CAS scripts — `safeWriteFileSync`, `isSafeToWrite`, `readTextWithSizeGuard`, `safeAtomicWriteSync` |
| `scripts/lib/safe-cas-io.js` | 5 CAS scripts — `safeReadText`, `safeReadJson`, `validateCandidate`, `isValidArtifactFile` |
| `scripts/lib/parse-jsonl-line.js` | 5 CAS scripts — `safeParseLine`, `safeParseLineWithError` |
| `scripts/lib/read-jsonl.js` | 2 CAS scripts (`rebuild-index.js`, `generate-extractions-md.js`) — `readJsonl` |
| `scripts/lib/analysis-schema.js` | 4 CAS scripts (`migrate-v3`, `migrate-schemas`, `fix-depth-mislabel`, `backfill-candidates`, `self-audit`) — `validate`, Zod schemas |
| `scripts/lib/retag-mutations.js` | 1 CAS script (`retag.js`) — `mutations` namespace |
| `node:*` builtins | all CAS scripts — `fs`, `path`, `crypto`, `child_process` |
| `better-sqlite3` | 3 CAS scripts (`rebuild-index`, `update-index`, `recall`) — SQLite FTS5 |

### Transitive port cost
The 7 `scripts/lib/*` files need to land in JASON-OS **before** any CAS
script runs. JASON-OS CLAUDE.md §2 already documents 3 of them:
`sanitize-error.cjs`, `security-helpers.js`, `safe-fs.js` — the
**foundation helpers**. The CAS-specific 4 (`safe-cas-io.js`,
`parse-jsonl-line.js`, `read-jsonl.js`, `analysis-schema.js`,
`retag-mutations.js`) are **not** yet in JASON-OS.

### Node-version dependency
Per JASON-OS CLAUDE.md §1: *"Claude Code infrastructure: Node.js 22 (pinned
via `.nvmrc`)."* `better-sqlite3` needs native compilation against the local
Node ABI — prebuilt binaries exist for Node 22, but **the first run** in
JASON-OS will pull from the npm registry and may need a native-build
toolchain if the prebuilt binary isn't available for the user's OS/arch.
This is a setup concern, not a port blocker.

### Zod schema coupling
`analysis-schema.js` uses **Zod 4.3.6** (per SoNash CLAUDE.md stack table).
JASON-OS is stack-agnostic and would need Zod as an npm dependency of the
port — adds one runtime dep.

---

## 7. Full Dep Chain DAG (What Ports First)

**Critical-path depth: 5 layers**

```
Layer 0 — JASON-OS foundation (ALREADY IN JASON-OS)
  ├── Node.js 22 runtime (CLAUDE.md §1)
  ├── scripts/lib/sanitize-error.cjs
  ├── scripts/lib/security-helpers.js
  └── scripts/lib/safe-fs.js

Layer 1 — CAS-shared lib (MUST PORT FIRST)
  ├── scripts/lib/safe-cas-io.js          ← depends on security-helpers, safe-fs
  ├── scripts/lib/parse-jsonl-line.js
  ├── scripts/lib/read-jsonl.js
  ├── scripts/lib/analysis-schema.js      ← adds Zod 4.3.6 runtime dep
  └── scripts/lib/retag-mutations.js      ← only needed if /retag ports

Layer 2 — CAS substrate (DATA PATHS)
  ├── .research/ directory (root)
  ├── .research/analysis/ (per-slug outputs)
  ├── .research/extraction-journal.jsonl (empty-seeded or imported)
  ├── .research/EXTRACTIONS.md (regeneratable)
  ├── .research/content-analysis.db (auto-built by rebuild-index)
  ├── .research/tag-vocabulary.json (optional, degrades gracefully)
  ├── .claude/state/ (ephemeral)
  └── npm install better-sqlite3 (native binding)

Layer 3 — CAS scripts (PORT IN DEP ORDER)
  ├── scripts/cas/rebuild-index.js        ← foundational: builds DB from files
  ├── scripts/cas/update-index.js         ← incremental update after handler
  ├── scripts/cas/generate-extractions-md.js   ← regenerates EXTRACTIONS.md
  ├── scripts/cas/recall.js               ← depends on tag-vocabulary loader
  ├── scripts/cas/self-audit.js           ← depends on analysis-schema
  ├── scripts/cas/retag.js                ← depends on retag-mutations
  └── migration/backfill scripts (optional for v1): migrate-v3, migrate-schemas,
      backfill-candidates, backfill-tags, fix-depth-mislabel,
      promote-firecrawl-to-journal

Layer 4 — CAS shared skill assets
  ├── .claude/skills/shared/CONVENTIONS.md        ← referenced by all handlers
  ├── .claude/skills/_shared/TAG_SUGGESTION.md    ← Phase 6c tag protocol
  ├── .claude/skills/_shared/SELF_AUDIT_PATTERN.md
  └── JASON-OS home-context files (SESSION_CONTEXT.md, ROADMAP.md, CLAUDE.md,
      MEMORY.md, optional .research/home-context.json)

Layer 5 — CAS skills (PORT IN DISPATCH-GRAPH ORDER)
  ├── /repo-analysis   ─────┐
  ├── /website-analysis      │  ← the 4 handlers (peers, parallel port)
  ├── /document-analysis     │
  ├── /media-analysis   ─────┘
  ├── /analyze              ← router; depends on all 4 handlers + /synthesize
  ├── /synthesize           ← depends on /convergence-loop being present
  └── /recall               ← thin wrapper over recall.js (port with Layer 3)
```

### Critical path (single longest dep chain)
```
Node 22 → safe-fs.js → safe-cas-io.js → analysis-schema.js → self-audit.js
       → (Layer 2 substrate) → synthesize.skill → /convergence-loop skill
```

**Depth: 5 hops** from foundation to top-level skill invocation.

### Parallelizable port groups
- **Layer 1 libs** can all port in parallel (only depend on Layer 0).
- **Layer 3 scripts** — `rebuild-index`, `update-index`, `recall`,
  `generate-extractions-md` form a tight cluster; `self-audit` and
  `retag` are independent.
- **Layer 5 handlers** — 4 handlers can port in parallel (peer skills);
  `/analyze` port must wait for all 4; `/synthesize` can port after the
  handlers OR in parallel if stubbed. `/recall` is nearly decoupled.

### Ordering verdict
**Minimum viable CAS port (MVP):** Layers 0-3 + `/analyze` + at least 1
handler (`/document-analysis` is simplest — no clone, no repomix, no
Python). This gets you working CAS without media (Python deps) and
without `/synthesize` (needs `/convergence-loop`).

**Full CAS parity:** all 5 layers + `/convergence-loop` skill port (separate
D-agent track — see D2-core-orchestration) + home-context files in
JASON-OS + `better-sqlite3` native binding.

### JASON-OS-specific blockers
1. **`/convergence-loop` skill MUST port before `/synthesize`** (Phases
   2.5/4.5 hard-require it). JASON-OS currently lists it in available
   skills, so this is likely not a blocker.
2. **Home-repo guard string** needs parameterization — hardcoded SoNash
   repo slug in `repo-analysis/SKILL.md:68`.
3. **Invocation-tracking calls** (`cd scripts/reviews && npx tsx
   write-invocation.ts ...`) need stubbing or removing — SoNash-specific
   metrics pipeline, already noted as Phase-3-deferred in JASON-OS.
4. **npm package `better-sqlite3`** — native compilation at install time.

---

## Sources

### CAS skill SKILL.md files
- `<SONASH_ROOT>\.claude\skills\analyze\SKILL.md`
- `<SONASH_ROOT>\.claude\skills\document-analysis\SKILL.md`
- `<SONASH_ROOT>\.claude\skills\media-analysis\SKILL.md`
- `<SONASH_ROOT>\.claude\skills\recall\SKILL.md`
- `<SONASH_ROOT>\.claude\skills\repo-analysis\SKILL.md`
- `<SONASH_ROOT>\.claude\skills\synthesize\SKILL.md`

### CAS skill REFERENCE.md files
- `<SONASH_ROOT>\.claude\skills\{analyze,document-analysis,media-analysis,recall,repo-analysis,synthesize}\REFERENCE.md`

### Shared skill conventions
- `<SONASH_ROOT>\.claude\skills\shared\CONVENTIONS.md`
- `<SONASH_ROOT>\.claude\skills\_shared\TAG_SUGGESTION.md`

### CAS scripts (all 12)
- `<SONASH_ROOT>\scripts\cas\rebuild-index.js`
- `<SONASH_ROOT>\scripts\cas\update-index.js`
- `<SONASH_ROOT>\scripts\cas\recall.js`
- `<SONASH_ROOT>\scripts\cas\self-audit.js`
- `<SONASH_ROOT>\scripts\cas\retag.js`
- `<SONASH_ROOT>\scripts\cas\generate-extractions-md.js`
- `<SONASH_ROOT>\scripts\cas\migrate-v3.js`
- `<SONASH_ROOT>\scripts\cas\migrate-schemas.js`
- `<SONASH_ROOT>\scripts\cas\backfill-candidates.js`
- `<SONASH_ROOT>\scripts\cas\backfill-tags.js`
- `<SONASH_ROOT>\scripts\cas\fix-depth-mislabel.js`
- `<SONASH_ROOT>\scripts\cas\promote-firecrawl-to-journal.js`

### Lib dependencies
- `<SONASH_ROOT>\scripts\lib\safe-cas-io.js:1-30`
- `<SONASH_ROOT>\scripts\lib\security-helpers.js`
- `<SONASH_ROOT>\scripts\lib\safe-fs.js`
- `<SONASH_ROOT>\scripts\lib\sanitize-error.cjs`
- `<SONASH_ROOT>\scripts\lib\parse-jsonl-line.js`
- `<SONASH_ROOT>\scripts\lib\read-jsonl.js`
- `<SONASH_ROOT>\scripts\lib\analysis-schema.js`
- `<SONASH_ROOT>\scripts\lib\retag-mutations.js`

### CAS planning / architecture
- `<SONASH_ROOT>\.planning\content-analysis-system\DECISIONS.md:1-79`

### Hooks dir (verified clean of CAS deps)
- `<SONASH_ROOT>\.claude\hooks\` (28 files, grepped)
- `<SONASH_ROOT>\.claude\hooks\user-prompt-handler.js:144-145,707`
  (runAnalyze is prompt-intent, not CAS)

### BRAINSTORM refs
- `<JASON_OS_ROOT>\.research\migration-skill\BRAINSTORM.md`
  §3 D19 (CAS port with home-context reshape), §5 Q6 (deferred research
  into integration points)
- `<JASON_OS_ROOT>\CLAUDE.md:19-30` (stack-agnostic
  posture, Node 22 pinned), §2 (scripts/lib helpers already declared)

---

**End findings** — D6-cas-integration L1 complete.
