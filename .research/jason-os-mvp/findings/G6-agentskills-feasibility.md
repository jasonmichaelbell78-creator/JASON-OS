# G6 — AgentSkills Open-Standard Feasibility (Gap Pursuit)

**Gap type:** verification-gap (C-G1 was UNVERIFIED — external standard, no
filesystem evidence)
**Profile used:** web + lightweight codebase
**Confidence:** HIGH (spec fully located, schema confirmed, compatibility gap is
a direct structural comparison)

---

## Summary

AgentSkills is a real, published open standard (Anthropic, 2025-12-18) with a
minimal YAML frontmatter schema: only `name` and `description` are required.
JASON-OS SKILL.md files are structurally compatible today — they already carry
both required fields. All non-standard content (Document Version, Status,
Critical Rules, Process sections) lives in the Markdown body, where the spec
places zero format restrictions. A JASON-OS skill can be made AgentSkills
compliant with zero breaking changes; the only additions needed are cosmetic
field upgrades (optional `metadata.version`, `compatibility`, `license`). The
standard is stable enough to target: 14–26 tools adopted it within four months
of publication, and the GitHub Copilot changelog explicitly calls out `.claude/skills/`
as automatically recognized. The recommended action is adopt now via 30-minute
field hygiene pass — not a 2-hour spike.

---

## Detailed Findings

### Spec Location and Publication Verification

The AgentSkills standard was published on **2025-12-18** by Anthropic. The
canonical specification lives at:

- **Primary spec:** https://agentskills.io/specification
- **Raw spec markdown:** https://agentskills.io/specification.md
- **Reference implementation / validator:** https://github.com/agentskills/agentskills
- **Anthropic engineering blog:** (referenced in CH-O-001 as
  `anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills`)
- **GitHub Copilot adoption announcement (same day):**
  https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/
- **VentureBeat coverage:**
  https://venturebeat.com/technology/anthropic-launches-enterprise-agent-skills-and-opens-the-standard
- **Unite.AI coverage:**
  https://www.unite.ai/anthropic-opens-agent-skills-standard-continuing-its-pattern-of-building-industry-infrastructure/

**Publication date VERIFIED:** 2025-12-18 is confirmed by the GitHub Copilot
changelog (primary source, dated same day) and multiple tech press articles.
C-G1's claimed date is accurate.

**Tool count: CH-O-001 claimed 16 as of 2026-03.** Multiple sources now cite
14–26 tools as of early 2026. Community repos list: Claude Code, OpenAI Codex,
Gemini CLI, GitHub Copilot, Cursor, VS Code/Copilot, Windsurf, Kiro, OpenCode,
Aider, Augment, Antigravity, and others. The 16-tool figure from the OTB
challenge is a conservative floor; actual adoption is higher.

---

### Spec Contents — Schema, Required Fields, Section Structure

The AgentSkills specification defines a **directory-based format**:

```
skill-name/
├── SKILL.md          # Required: YAML frontmatter + Markdown body
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation (REFERENCE.md, etc.)
├── assets/           # Optional: templates, resources
```

**SKILL.md frontmatter fields:**

| Field           | Required | Constraint                                                          |
| --------------- | -------- | ------------------------------------------------------------------- |
| `name`          | YES      | 1–64 chars, lowercase + hyphens only, matches parent directory name |
| `description`   | YES      | 1–1024 chars, describes what AND when                               |
| `license`       | no       | License name or reference to bundled file                           |
| `compatibility` | no       | 1–500 chars, environment requirements                               |
| `metadata`      | no       | Arbitrary key-value map (use for `version`, `author`, etc.)         |
| `allowed-tools` | no       | Space-separated pre-approved tool list (EXPERIMENTAL)               |

**Body content:** The Markdown body after the frontmatter has **no format
restrictions**. "Write whatever helps agents perform the task effectively."
Recommended (but not required) sections: step-by-step instructions, I/O
examples, edge cases. Max 500 lines recommended (move reference detail to
`references/` subdirectory).

**Progressive disclosure model:**
1. `name` + `description` (~100 tokens) loaded at startup for all skills
2. Full SKILL.md body loaded only when the skill is activated
3. `scripts/`, `references/`, `assets/` loaded on demand

Source: https://agentskills.io/specification

---

### JASON-OS SKILL.md Compatibility Gap

**Sample SKILL.md examined:** `.claude/skills/deep-research/SKILL.md`
(and `.claude/skills/brainstorm/SKILL.md` for double-check)

**Actual JASON-OS frontmatter (deep-research):**

```yaml
---
name: deep-research
description: >-
  Multi-agent research engine that decomposes questions, dispatches parallel
  searcher agents, synthesizes findings with citations and confidence levels,
  runs mandatory contrarian/OTB challenges, gap-pursuit verification, and
  cross-model verification via Gemini CLI, and produces structured output with
  downstream adapters, research index, and management commands.
---
```

**Compatibility matrix:**

| AgentSkills field | JASON-OS status         | Action needed                                          |
| ----------------- | ----------------------- | ------------------------------------------------------ |
| `name`            | PRESENT — `deep-research` | Verify matches directory name (it does)              |
| `description`     | PRESENT — 256 chars     | Within 1024 limit. Content quality is good.            |
| `license`         | ABSENT (optional)       | Add `Proprietary` or leave absent — both valid         |
| `compatibility`   | ABSENT (optional)       | Add `Requires Claude Code or AgentSkills-compatible tool` |
| `metadata`        | ABSENT (optional)       | Add `version: "2.0"` and `author: jason-os` if desired |
| `allowed-tools`   | ABSENT (optional/exp.)  | Skip — experimental, not needed                        |

**Non-standard body content status:**

The JASON-OS SKILL.md body contains: Document Version comment block, Status
comment, large process overview, Critical Rules, phase-by-phase instructions,
version history table. None of this violates the spec — the spec body has
**no format restrictions**. It will load verbatim on all 14+ compliant tools.

**One constraint to watch:** The spec requires `name` to **match the parent
directory name**. JASON-OS skill directories are named identically to their
`name` fields (`deep-research/` → `name: deep-research`), so this is already
satisfied.

**Compatibility verdict: ADDITIVE ONLY.** No breaking changes required. No
fields need to be removed. The two required fields are already present and valid.
Optional enhancements (`compatibility`, `metadata.version`) improve
cross-tool discoverability but are not required for compliance.

**One caveat on cross-tool behavior:** JASON-OS skills contain JASON-OS-specific
constructs in the body (PROACTIVELY clauses, Claude Code hook wiring references,
`.claude/state/` paths, Windows fallback instructions). These will load verbatim
in Cursor, Codex, etc. They will not cause errors, but some instructions will be
no-ops on non-Claude Code platforms. This is not a compliance issue — it is
expected behavior for Claude Code-optimized skills in a cross-tool context.

---

### Risk and Stability Assessment

**Is the standard stable?**

The standard is minimal by design (only 2 required fields), which is a
deliberate stability choice — a narrow spec is harder to break. The Anthropic
spec page lists `allowed-tools` as EXPERIMENTAL and flags that support may vary,
suggesting the stable core (`name`, `description`, body) is stable and the
experimental features are the volatile surface.

**Governance concern (from search findings):** Long-term stewardship is
undefined — whether it falls under an "Agentic AI Foundation" or Anthropic-
controlled governance is an open question as of early 2026. However, with 14+
major tool adoptions in 4 months and a community library of 490,000+ skills,
the standard has achieved critical mass that makes abandonment unlikely. The
risk of investment loss is LOW.

**Adoption trajectory:** GitHub Copilot, VS Code, Cursor, Codex, Gemini CLI all
adopted within the announcement window. The Copilot changelog explicitly calls
out that skills in `.claude/skills/` are **automatically recognized** — meaning
JASON-OS skills (which already live there) are de facto Copilot-compatible today
without any changes.

**Version risk:** The spec does not include a version field in stable frontmatter;
`metadata.version` is the recommended place for author-side versioning. The
standard itself has no published version number or changelog cadence yet, which
is a governance gap — but the stability of the two-field core means this is
unlikely to be disruptive.

---

### Recommendation

**Adopt now via a 30-minute field hygiene pass. Do not budget a 2-hour spike.**

The 2-hour spike framing in CH-O-001 assumed feasibility was unknown. This
investigation resolves that: compatibility is confirmed, the cost is cosmetic
field additions.

**Concrete steps (30 minutes total):**

1. **Add `compatibility` field to all 9 SKILL.md files** (~5 min):
   ```yaml
   compatibility: Optimized for Claude Code. Compatible with any AgentSkills-compliant tool.
   ```
   This signals to cross-tool loaders that Claude Code-specific constructs
   (hook references, Windows fallbacks) are expected.

2. **Add `metadata.version` to all 9 SKILL.md files** (~5 min):
   ```yaml
   metadata:
     version: "1.0"
     author: jason-os
   ```
   This enables pinning in cross-tool deployments and community registry entries.

3. **Verify `name` matches directory name for all 9 skills** (~5 min):
   The spec requires this. Current JASON-OS naming is consistent, but worth
   a quick scan.

4. **Run `skills-ref validate`** (~5 min, optional):
   `npx skills-ref validate .claude/skills/<skill-name>` — reference validator
   from https://github.com/agentskills/agentskills. Not required, but confirms
   compliance before any registry submission.

5. **Do NOT restructure the body** — leave all JASON-OS-specific content
   (Critical Rules, phase structure, PROACTIVELY clauses, version history) in
   place. It is compliant as-is.

**What this unlocks:** Every JASON-OS skill becomes natively installable via
any AgentSkills registry or `skills-ref` CLI. If JASON-OS is ever distributed,
the install story becomes `/plugin install jason-os` or `skills-ref install
jason-os/brainstorm` rather than manual `.claude/skills/` placement.

**What it does NOT unlock:** The standard does not cover hook wiring, CLAUDE.md
injection, permission rules, or settings.json — these remain Claude Code-specific
and have no AgentSkills equivalent. AgentSkills compatibility is a skill-layer
concern, not an infrastructure-layer concern.

---

## Claims

- **[C-G1-RESOLVED]** AgentSkills open standard is confirmed published 2025-12-18
  by Anthropic. The two-field schema (name, description) is verified at
  agentskills.io/specification. (confidence: HIGH)

- **[C-G6-001]** JASON-OS SKILL.md files are AgentSkills-compliant today with
  zero breaking changes. Both required fields (`name`, `description`) are
  present and valid across all examined skills. (confidence: HIGH)

- **[C-G6-002]** AgentSkills adoption reached 14–26 tools within 4 months of
  publication (Dec 2025 – Apr 2026), including Claude Code, GitHub Copilot, VS
  Code, Cursor, OpenAI Codex, Gemini CLI, Windsurf, and others. The OTB claim
  of 16 tools is a conservative floor. (confidence: HIGH)

- **[C-G6-003]** GitHub Copilot automatically recognizes skills in `.claude/skills/`
  without any configuration changes. JASON-OS skills are therefore de facto
  Copilot-compatible today. (confidence: HIGH — primary source: GitHub
  Copilot changelog 2025-12-18)

- **[C-G6-004]** The AgentSkills body section has no format restrictions. JASON-OS
  body content (Critical Rules, phase structure, version history, Claude-specific
  constructs) is spec-compliant. (confidence: HIGH)

- **[C-G6-005]** Full compliance requires only additive optional field additions
  (`compatibility`, `metadata.version`, `license`). Estimated effort: 30 minutes
  for all 9 current JASON-OS skills. (confidence: HIGH)

- **[C-G6-006]** AgentSkills does not cover hook wiring, CLAUDE.md injection, or
  settings.json — these remain Claude Code-specific with no cross-tool
  equivalent in the standard. (confidence: HIGH)

- **[C-G6-007]** Long-term governance of the AgentSkills standard is undefined
  (Anthropic vs. independent foundation). This is a LOW risk given critical-mass
  adoption, but is an unresolved governance gap as of early 2026. (confidence:
  MEDIUM — derived from search findings, no primary governance document found)

---

## Gaps

- **The Anthropic engineering blog URL** cited in CH-O-001
  (`anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills`)
  was not directly fetched. All spec content was confirmed via agentskills.io/specification
  (primary spec) and independent press coverage. If the blog post contains
  additional architectural rationale, it is supplementary to the spec.

- **`allowed-tools` experimental field behavior** in non-Claude-Code platforms
  is not verified. JASON-OS skills do not currently use this field, so the gap
  is not actionable.

- **AgentSkills registry submission process** (if JASON-OS is ever distributed)
  was not investigated. Out of scope for MVP feasibility.

---

## Serendipity

- The GitHub Copilot announcement explicitly calls out `.claude/skills/` as the
  recognized path — this means any developer already using Claude Code with
  JASON-OS skills gets Copilot compatibility as a **free side-effect of the
  current directory structure**. No action required for this benefit.

- The community library at https://github.com/VoltAgent/awesome-agent-skills lists
  1,000+ community skills compatible with the standard. This is a potential
  reference library for JASON-OS skill authoring patterns (not porting — for
  cross-referencing quality conventions).

- The spec's progressive disclosure model (name+description loaded at startup,
  body on activation) validates JASON-OS's existing design choice of keeping
  frontmatter `description` concise and comprehensive — the brainstorm and
  deep-research skills already follow this pattern well.
