# Dimension: Documentation

## What ships

Beyond README + CLAUDE.md + LICENSE, the repo carries **seven docs files** under `docs/` plus a top-level `ARCHITECTURE.md`, `SKILL.md`, and `CREDITS.md`. Total docs surface is ~3,000+ lines of pure prose.

Files inspected:

- `README.md` (127 lines) — non-coder install + quickstart, jargon glossary, who-it's-for, costs
- `ARCHITECTURE.md` (211 lines) — long-form system explanation; design choices, lineage, hook layer, MCP integration, what's-not-included
- `SKILL.md` (66 lines) — top-level skill manifest with frontmatter
- `CLAUDE.md` (84 lines) — the operating instructions template
- `docs/laws.md` (70 lines) — the four operating laws (Operating Constraint, Verification Protocol, Scope Discipline, Execute-Don't-Meta-Talk) with rationale
- `docs/memory.md` (107 lines) — four memory types, frontmatter spec, save/don't-save rules, decay + provenance
- `docs/protocols.md` (138 lines) — wiring detail for each command, failure modes, state-file contract
- `docs/feedback-loop.md` (73 lines) — how corrections become memories; rule-why-apply format
- `docs/obsidian-setup.md` (3,226 tokens — not yet read; flagged for content eval)
- `docs/notion-vs-obsidian.md` + `docs/notion-vs-obsidian-deep.md` — editorial / not-yet-read
- `CREDITS.md` — attribution
- `vault-template/_system/Session Log.md` and others — template-level docs

## Quality observations

- **Prose-first throughout.** Tables exist but earn their place; almost everything is conversational explanation.
- **WHY paired with WHAT.** Every operating law has rationale ("This rule exists because..."). Every design choice has a reason ("Why markdown / Why Obsidian / Why Claude Code"). Strongly aligned with explanatory tenet.
- **Audience-specific framing.** Written for non-coders without condescending to coders. Glossary at the bottom of README handles jargon ("Vault: the folder Obsidian uses to hold your notes").
- **Lineage preserved.** Architecture.md tells the multi-year story of how the system arose (custom GPTs → IFS therapist → Claude Code + Obsidian → current loop). Names other April-2026 implementations (ADAM, unmutable/ai-chief-of-staff, claudia, MemPalace, Hermes, Karpathy LLM Wiki).
- **Self-aware about scope.** "What this is not" sections in README + SKILL.md. "What is not included" in ARCHITECTURE.md. Clear about being a personal-OS template, not a productivity SaaS.

## Gaps

- No CONTRIBUTING.md, no CHANGELOG, no SECURITY.md, no CODE_OF_CONDUCT.
- No version trail (no Git tags visible in shallow clone; would need Deep wave for history).
- No API/spec docs because there's no API.

## Findings

| ID    | Severity | Finding                                                                                  |
| ----- | -------- | ---------------------------------------------------------------------------------------- |
| DOC-1 | Info     | Doc-to-code ratio is extremely high. Docs ARE the deliverable; the code is incidental.   |
| DOC-2 | Info     | No CHANGELOG; revision history is implicit in git. Acceptable for a template repo.       |
| DOC-3 | Info     | No CONTRIBUTING.md. Repo is opinionated personal template; PR contributions not solicited. |

## Band

**Excellent (92)** — exceptional. Every document earns its place, prose-first, WHY-with-WHAT throughout. Reference-grade for any other markdown-as-substrate project.
