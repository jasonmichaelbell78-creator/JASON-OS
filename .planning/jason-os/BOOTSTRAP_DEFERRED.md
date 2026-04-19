# Bootstrap: Deferred Items

**Created:** 2026-04-15
**Context:** Items intentionally not ported during the initial JASON-OS
bootstrap from SoNash. Revisit these in dedicated sessions once their
dependencies exist or their coupling can be untangled.

---

## Deferred Skills

### `session-end`

**Why deferred:** Structural coupling to SoNash-specific systems.
Phase 3 (Metrics & Data Pipeline) depends on:

- `npm run reviews:sync` — SoNash reviews system
- `.claude/skills/ecosystem-health/scripts/run-ecosystem-health.js` — not ported
- `scripts/debt/consolidate-all.js` — TDMS (not ported)
- `scripts/debt/generate-metrics.js` — TDMS (not ported)

Step 10 also relies on `npm run session:end` (not in JASON-OS) and updates
sonash-specific docs (SESSION_CONTEXT.md, SESSION_HISTORY.md, ROADMAP.md).

**Revisit when:** JASON-OS has its own close-out pipeline and debt system,
or when it's clear the skill should be a simpler "wrap up + commit" flow
without the metrics pipeline.

**Source:** `~/.local/bin/sonash-v0/.claude/skills/session-end/`

---

### `pr-review`

**Why deferred:** 71 sanitization hits across SKILL.md and 4 reference
files. Coupling to:

- `/add-debt` skill (TDMS, not ported)
- SonarCloud enrichment pipeline (`reference/SONARCLOUD_ENRICHMENT.md`
  entire file)
- TDMS integration (`reference/TDMS_INTEGRATION.md` entire file)
- Gemini CLI integration
- CodeRabbit / Qodo / SonarCloud / Gemini as named external review origins

Core 8-step flow IS portable, but SKILL.md requires a ~45min careful
rewrite rather than a grep-swap.

**Manual workaround until ported:** Process PR review feedback manually —
read each comment, fix or note why skipping, propagate patterns across
codebase before closing the round.

**Revisit when:** JASON-OS has a debt system (or decides it doesn't need
one), and the external review origins for JASON-OS are known.

**Source:** `~/.local/bin/sonash-v0/.claude/skills/pr-review/`

---

### `pr-retro`

**Why deferred:** 30 hits, plus structural dependency on `pr-ecosystem-audit`
(not ported). Without pr-ecosystem-audit the routing table and dashboard
features don't function. Also depends on convergence-loop deliverable
verification and TDMS.

**Revisit when:** Decision made on whether pr-ecosystem-audit comes over
too, or whether pr-retro should be simplified to a standalone retro skill.

**Source:** `~/.local/bin/sonash-v0/.claude/skills/pr-retro/`

---

## Deferred Infrastructure

### `.github/workflows/ci.yml`

**Why deferred:** Entire file calls SoNash npm scripts, tests, and Firebase
env vars that don't exist in JASON-OS yet. Examples: `npm run lint:fast`,
`npm run test:coverage`, `scripts/check-pattern-compliance.js`,
`NEXT_PUBLIC_FIREBASE_*` env vars in build step, TDMS schema validation
steps.

**Revisit when:** JASON-OS has a chosen stack and a `package.json`. At
that point, rebuild a lean CI from scratch — don't import sonash's CI
wholesale.

**Source:** `~/.local/bin/sonash-v0/.github/workflows/ci.yml`

---

### `.github/copilot-instructions.md`

**Why deferred:** 29 SoNash-specific references — stack, architecture,
Firebase patterns. The file is effectively a stack-and-conventions
briefing for GitHub Copilot; it rewrites cleanly only once JASON-OS
has its own stack and conventions.

**Revisit when:** Stack chosen and CLAUDE.md §1-3 filled in.

**Source:** `~/.local/bin/sonash-v0/.github/copilot-instructions.md`

---

### Custom statusline (Go binary)

**Location in SoNash:** `tools/statusline/` (Go source + compiled
`sonash-statusline-v3.exe`)

**Why deferred:** Requires editing config.toml, renaming the binary,
stripping sonash-specific widgets. Non-trivial Go work.

**Current state in JASON-OS:** Stock Claude Code statusline (no `statusLine`
field in settings.json — uses default).

**Revisit when:** Ready for a dedicated Go porting session.

---

### Agents directory

**Why deferred:** Built-in Claude Code agents (Explore, Plan,
general-purpose) cover the common triggers. SoNash-specific agents
(`code-reviewer.md`, `frontend-developer.md`, `gsd-*`) are explicitly
tailored to sonash's stack — they need rewrites, not sanitization.

**Revisit when:** JASON-OS has a chosen stack and specific agent needs
surface.

---

### GSD / TDMS / audit ecosystem

**Not ported intentionally.** These are large SoNash-internal systems:

- GSD (`get-shit-done`) project manager
- TDMS (technical debt management)
- 20+ audit skills (comprehensive, domain, ecosystem)
- SonarCloud integration
- Review lifecycle automation

**Revisit when:** JASON-OS identifies a concrete need that would justify
porting or rebuilding these.

---

## How to pick up a deferred item

1. Open the source path listed above.
2. Run the same sanitization grep used during bootstrap:
   `(sonash|SoNash|firebase|Firebase|firestore|httpsCallable|sonarcloud|SonarCloud|MASTER_DEBT|TDMS|tdms|/add-debt|Qodo|qodo|CodeRabbit|coderabbit|Gemini)`
3. For each hit, classify: cosmetic swap / structural rewrite / drop.
4. Copy + sanitize in the same session. Don't batch-copy then batch-sanitize.

---

## Sync-Mechanism Project Progress Pointer

Separate from bootstrap deferrals — this section tracks the sync-mechanism
multi-piece project (per `.research/sync-mechanism/BRAINSTORM.md`).

| Piece | Status | Artifacts |
|---|---|---|
| 1a Discovery (JASON-OS) | ✅ Complete | `.research/sync-mechanism/piece-1a-discovery-scan-jason-os/` |
| 1b Discovery (SoNash)   | ✅ Complete | `.research/sync-mechanism/piece-1b-discovery-scan-sonash/` |
| 2 Schema design         | ✅ Complete | `.claude/sync/schema/` (SCHEMA.md + enums.json + schema-v1.json + EVOLUTION.md + EXAMPLES.md). Plan + decisions at `.planning/piece-2-schema-design/`. |
| 3 Labeling mechanism    | ⏳ Next — `/deep-plan piece-3-labeling-mechanism` | — |
| 3.5 Mass back-fill      | After Piece 3 | — |
| 4 Registry              | After 3.5 | — |
| 5 Sync engine           | After 4 | — |

**Schema reference entrypoints (for Piece 3):**
- `.claude/sync/schema/SCHEMA.md` — master spec, the canonical reference
- `.claude/sync/schema/schema-v1.json` — JSON-Schema validation
- `.claude/sync/schema/EXAMPLES.md` — 20 worked records across file types
- `.planning/piece-2-schema-design/DECISIONS.md` — rationale for every choice
