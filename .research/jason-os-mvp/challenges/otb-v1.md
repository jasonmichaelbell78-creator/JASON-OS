# OTB Challenges: JASON-OS MVP

**Challenger:** OTB Agent v1
**Date:** 2026-04-15
**Research reviewed:** RESEARCH_OUTPUT.md (12 D-agents, 45 claims, 4 V-agents)
**Research lens used by D-agents:** SoNash-as-source-of-truth, extract-and-port, gap-analysis

The D-agents operated with a single lens. The alternatives below use different lenses.

---

## CH-O-001: Target AgentSkills Open Standard Directly

- **Angle:** Newer alternatives / adjacent domain
- **Novelty:** HIGH

### What was NOT considered

Anthropic published AgentSkills as an open standard on 2025-12-18. As of 2026-03, supported by 16+ tools: Claude Code, Cursor, OpenAI Codex, Gemini CLI, GitHub Copilot, VS Code, JetBrains Junie, OpenHands, Goose. The standard defines a portable directory format any compliant tool can load.

Research exclusively compared SKILL.md as Claude Code artifacts. Did not evaluate whether JASON-OS skills should target the open standard.

### Why it might be better
- Skills written to spec natively load in 16+ tools
- Eliminates "Claude Code first, cross-tool later" sequencing
- The brainstorm's cross-tool anti-goal was stated Dec 2025, before 16-tool coverage
- Install story: `/plugin install jason-os` + standard registry

### Why it might not
- Standard may not support all Claude-Code-specific constructs (hook wiring, CLAUDE.md injection, permission deny rules)
- Standard skills may be LESS capable inside Claude Code
- 4 months old — tooling maturity unknown

### Recommendation
2-hour feasibility spike: is AgentSkills a superset, subset, or orthogonal to SKILL.md? If superset-compatible, upside is enormous at near-zero cost. Run before deep-plan finalizes skill authoring conventions.

**Sources:**
- agentskills.io/home
- anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

---

## CH-O-002: Dotfile-Tool Patterns for Portability

- **Angle:** Adjacent domain (dotfiles ecosystem)
- **Novelty:** HIGH

### What was NOT considered

The "portable setup replicating across machines/projects" is the dotfiles problem — solved at industrial scale by chezmoi, YADM, GNU Stow, Dotbot. 20 years of accumulated design on exactly JASON-OS's problems:
- Host-specific overrides via chezmoi templating `{{if eq .chezmoi.os "windows"}}`
- Single source of truth with machine divergence
- Update: `chezmoi update` pulls upstream and merges
- Bidirectional: `chezmoi re-add` captures local modifications back

Research found the template-divergence problem and concluded CLI (Direction F) is only solution. Dotfile tools ARE that CLI.

### Why it might be better
- `chezmoi init jason-os-repo && chezmoi apply` = zero-infra install story
- Eliminates Direction F CLI build effort
- Host-specific overrides native
- Update story (`chezmoi update`) solves SoNash→JASON-OS drift without custom tooling

### Why it might not
- Dotfile tools target `~/`, not project-level `.claude/` — path mapping unclear
- Doesn't solve skill-scrubbing (content transformation, not file placement)
- No-code orchestrator needs learning curve

### Recommendation
Investigate path mapping. If chezmoi can target arbitrary dirs, deployment dramatically simpler. If not, note for Direction F CLI (could use chezmoi under the hood).

---

## CH-O-003: The Workflow Chain as the Portable Product (Not Artifacts)

- **Angle:** Reframing
- **Novelty:** HIGH — directly contradicts research frame

### What was NOT considered

Every D-agent investigated ARTIFACTS. Alternative reading: the WORKFLOW CHAIN itself (brainstorm→deep-research→deep-plan→execute) is the actual portable product; artifacts are scaffolding.

Operator's own framing: "if someone who doesn't code can build a 67-skill infrastructure through pure orchestration, that infrastructure should be portable." Proof-of-concept isn't the 67 skills — it's the ORCHESTRATION PATTERN.

JASON-OS MVP reframed: not "port N hooks/M skills." Instead: "document and encode the orchestration pattern so any operator can replicate the PROCESS — not the artifacts."

Write `how-I-work.md` teaching the rhythm. Encode trigger logic as a skill that teaches itself.

### Why it might be better
- Solves maintenance-trap at conceptual level — documented process doesn't rot
- Aligns with "creating for joy, not shipping" — documenting the process IS creative work
- "Portable OS" = KNOWLEDGE of how to build, not the OS itself — more defensible as product
- Eliminates extraction problem

### Why it might not
- Operator wants to USE JASON-OS right now for real work
- 3 active bugs need concrete fixes regardless of framing
- "Document the process" risks rabbit-hole anti-goal
- Home feel requires actual hook wiring

### Recommendation
Secondary lens, not replacement. Bugs need fixing either way. But synthesizer should evaluate whether Layer 3 (Navigation Documents) and Layer 4 (Quality Skills) are better served by this reframe than mechanical porting. AI_WORKFLOW.md should encode PROCESS, not just catalog artifacts.

---

## CH-O-004: Emergent MVP — Use JASON-OS Now, Port On Demand

- **Angle:** Inverted approach
- **Novelty:** MEDIUM

### What was NOT considered

Research produced top-down 4-tier, 18-item MVP via gap analysis. Inversion: start using JASON-OS NOW (has brainstorm, deep-plan, deep-research, session-begin — enough). Port artifacts only when specific gap creates specific pain in real session. MVP EMERGES from use.

Brainstorm explicitly named "another rabbit hole" as anti-goal; "extraction is grunt work" as joy problem. Emergent approach eliminates extraction phase until pain demands it.

### Why it might be better
- Guarantees MVP is what's actually needed
- Converts grunt work into motivated "fix specific pain"
- JASON-OS ALREADY being used (this deep-research is running in it)
- Prioritization automatic: first pain hit = Tier A
- Prevents over-porting

### Why it might not
- 3 active bugs would be hit immediately — still need finding
- Context compaction without pre-compaction hooks causes painful restart
- Operator doesn't think "shippable" — emergent needs "done enough" trigger
- Some gaps only appear after weeks

### Recommendation
Adopt as sequencing principle for Layers 3-4, NOT Layers 0-1. Fix bugs + wire rhythm proactively. Everything else: let pain drive priority. Hybrid.

---

## CH-O-005: Git-Native Sync via Sparse Checkout / Subtree

- **Angle:** Simpler alternative
- **Novelty:** MEDIUM

### What was NOT considered

Research concluded sync requires CLI (Direction F) or manual. Brainstorm dismissed monorepo. Not considered: `git subtree` with `.claude/` portable layer. `git subtree pull --prefix=.claude sonash-portable main` as sync command. Or: dedicated `jason-os-portable` branch in SoNash that JASON-OS tracks.

### Why it might be better
- Sync = standard git operation, no custom CLI
- History preserved
- Sanitization done once in portable branch, not per-project
- Zero additional tooling

### Why it might not
- Subtree merges notoriously confusing when divergent
- Sanitization still requires human judgment
- Project-specific additions conflict with subtree sync
- Not no-code-friendly

### Recommendation
Future consideration for Direction F's `jason-os sync` impl (could be thin wrapper over git subtree). Don't implement now.

---

## CH-O-006: PROACTIVELY Clauses Are Highest-Leverage Single Port

- **Angle:** Simpler / reframing
- **Novelty:** MEDIUM (gap documented, leverage underweighted)

### What was NOT considered

17 SoNash agents have PROACTIVELY clauses; 0 JASON-OS agents do. Adding them requires NO new scripts, NO hook wiring, NO dependency resolution — pure text edit to 8 existing JASON-OS agent frontmatter files.

MVP scope treats hook wiring (scripts + deps + settings.json edits) as equivalent-weight to PROACTIVELY clauses (text change). NOT equivalent.

PROACTIVELY converts agents from "tools the operator must remember to invoke" to "colleagues who self-dispatch." For no-code orchestrator: transformative. Ambient intelligence WITHOUT hook infrastructure.

### Why it might be better
- Zero cost: text edits to existing files
- Immediately upgrades all 8 ported agents
- Addresses C-012, C-013 (workflow enforcement) without porting user-prompt-handler.js
- Deep-research team agents would self-dispatch on trigger conditions

### Why it might not
- Wrong trigger conditions cause unwanted auto-invocation
- Without hook enforcement, softer than hooks — Claude can override
- Existing JASON-OS agents all deep-research variants — PROACTIVELY for "when spawn D-agent?" subtle

### Recommendation
ADOPT IMMEDIATELY. Layer 0 or early Layer 1. Write PROACTIVELY for: convergence-loop (iterative improvement), deep-research (domain/tech research). Cost: 30 min. Return: ambient self-dispatch without infrastructure.

---

## CH-O-007: Canonical Memory as Git-Tracked Sync Primitive

- **Angle:** Adjacent / simpler
- **Novelty:** MEDIUM

### What was NOT considered

D2d noted SoNash maintains `canonical-memory/` inside `.claude/` — git-tracked "golden" memory, separate from machine-local auto-memory in `~/.claude/projects/`. Research noted divergence (23 files) without evaluating its significance.

Canonical-memory is the ONLY mechanism in either repo for syncing behavioral knowledge across machines. Git-trackable, diffable, pull-requestable. JASON-OS could use this pattern AS THE GENERAL sync primitive: anything "golden" lives in `.claude/canonical/`, deploys via `cp -r`.

### Why it might be better
- No CLI: `cp` is sync command
- git tracks every change
- Solves cross-machine memory sync
- Operator already uses pattern indirectly

### Why it might not
- SoNash divergence (23 files) suggests the sync is already failing — adopting failing pattern not better
- Only addresses memory, not hooks/skills/settings
- `cp` has no conflict detection — silent overwrite

### Recommendation
Investigate SoNash divergence cause before adopting. If benign (intentional specialization) → sound. If rot (canonical-memory abandoned) → warning sign.

---

## CH-O-008: Stub /todo Skill Instead of Porting Full Script Stack

- **Angle:** Simpler alternative
- **Novelty:** LOW (research considers, pivots to full port)

### What was NOT considered

Research classifies Bug 2 (broken /todo) as HIGH requiring full port of todos-cli.js + render-todos.js + todos-mutations.js + .planning/todos.jsonl. Rationale: "All JSONL mutations MUST go through todos-cli.js" to avoid T26/T27/T28 data-loss bug.

Simpler: stub `/todo` as markdown-file skill storing in `.planning/TODOS.md` (plain markdown, no JSONL, no CLI) until real stack ported. NOT safe for concurrent mutation, but JASON-OS session 1 with single operator has no concurrency risk.

### Why it might be better
- Unblocks /todo in 30 min vs 3-4h
- Markdown readable without tooling
- Full stack ported later when concurrency is real
- Aligns with emergent MVP (CH-O-004)

### Why it might not
- SKILL.md has hard rule: "All JSONL mutations MUST go through todos-cli.js"
- Stub creates migration step (stub → JSONL) that may never happen
- `post-todos-render.js` hook needs adaptation

### Recommendation
Adopt stub for immediate fix. Change SKILL.md to declare v0-stub explicitly. Port full stack when a second operator or high-frequency use makes concurrency risk real.

---

## Summary

| ID | Angle | Novelty | Key Shift |
|---|---|---|---|
| CH-O-001 | AgentSkills open standard | HIGH | Cross-tool free at authoring time |
| CH-O-002 | Dotfile tools (chezmoi/YADM) | HIGH | Eliminates Direction F CLI build |
| CH-O-003 | Workflow chain as product | HIGH | Encode PROCESS, not port artifacts |
| CH-O-004 | Emergent MVP | MEDIUM | Let pain drive priority |
| CH-O-005 | git subtree sync | MEDIUM | Sync = standard git command |
| CH-O-006 | PROACTIVELY clauses first | MEDIUM | 30-min zero-infra ambient intelligence |
| CH-O-007 | Canonical-memory as primitive | MEDIUM | `.claude/canonical/` git-tracked |
| CH-O-008 | Stub /todo vs full port | LOW | 30 min vs 3-4h for same functional goal |

## Most Urgent to Adopt

**CH-O-006 (PROACTIVELY clauses):** 30-minute zero-infra win. Adopt at Layer 0.

**CH-O-008 (Stub /todo):** Unblocks Bug 2 in 30 min; full port deferred to real need.

## Most Strategically Important

**CH-O-001 (AgentSkills):** 2-hour feasibility spike before deep-plan finalizes skill-authoring conventions. If compatible, every JASON-OS skill becomes natively cross-tool at zero additional cost.

**CH-O-003 (Workflow chain as product):** Reframes the entire MVP question. Deep-plan should EXPLICITLY decide: are we porting SoNash artifacts, or encoding the orchestration pattern?
