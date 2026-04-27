# Creator View — jdpolasky/ai-chief-of-staff

> **Note on coverage:** an earlier draft of this view skipped several artifacts (`docs/notion-vs-obsidian.md`, `docs/notion-vs-obsidian-deep.md`, `docs/obsidian-setup.md` Layers 4–5, `CREDITS.md`) under a "JASON-OS doesn't use Obsidian, low expected relevance" heuristic that the skill text does not endorse. The user reversed those skips. This rewrite is the full-coverage version.

## 1. What This Repo Understands

This is a personal operating system built on Claude Code and an Obsidian vault, framed as an ADHD prosthetic. The author has run it for over a hundred sessions against real client work and has built a remarkably coherent loop: five skills (`/setup`, `/start`, `/sync`, `/wrap`, `/audit`), a four-quadrant to-do list, a Command Center file, and a `.claude/memory/` directory of typed markdown files. The deliverable is the *calibration* — the rules, preferences, and feedback memories that accumulate into a model that genuinely behaves as if it knows the operator.

What the repo understands deeply, the kind of thing you only learn from living with the system rather than designing it on a whiteboard:

- **Memory is RAG over a typed-markdown directory, indexed by `MEMORY.md`.** Four types — user, feedback, project, reference — declared in frontmatter. Files load on demand based on each line's per-file description. Specific descriptions are load-bearing because that's what the model uses to route. The author's seventy-six feedback memories at the time of writing are evidence the pattern survives at scale.

- **Corrections only matter if they survive the session.** The whole feedback loop hinges on the moment of friction becoming a written file rather than a chat-history correction. The shape that works is rule + why + how-to-apply. The why is the load-bearing piece — without it, the model follows the rule mechanically into edge cases and either misapplies or ignores it.

- **Models drafting their own corrections is a known failure mode.** Quote: "the same model that just made the mistake is drafting the rule meant to prevent the mistake; rule reflects the model's interpretation of its own failure, which can be wrong in subtle ways." Naming this danger is unusual and mature — most repos in this space don't.

- **Memory decay needs a bootstrap gate.** The `/audit` skill checks for memories that haven't fired recently, but it stays dormant until the firings log holds 10 distinct sessions. Below that threshold the tool can't tell a dormant memory from one that hasn't had a chance to fire yet. This is the cleanest expression of the resolve-before-gate pattern in any repo I've read recently.

- **User-facing files must stay clean.** The Command Center and the To-Do list have no YAML frontmatter and no embedded query blocks because the operator reads them every day. State the machinery needs lives in `_system/` behind those files. The split is the design.

- **Skills are prose, not code.** Each `.claude/skills/<name>/SKILL.md` is plain-English instructions to the model. The runtime is the LLM. This produces a skill library that's small (under ~200 lines per skill), readable in one sitting, and trivially portable.

- **A few rules do most of the work.** `docs/laws.md` distills the system to four operating laws: Operating Constraint (stop, diagnose, propose, wait), Verification Protocol (don't claim facts you can't cite a memory file for), Scope Discipline (take stated scope literally, don't bundle nearby work), Execute-Don't-Meta-Talk (when the instruction is clear and approved, the first output is the work). Each law has a story behind it; Execute-Don't-Meta-Talk literally cost the author 40 minutes once.

- **Search vs. read is a structural difference, not a feature gap.** This is the headline argument of `notion-vs-obsidian.md` and `-deep.md` and it generalizes well outside the Obsidian/Notion comparison. AI working through a search-API-mediated workspace degrades on cross-source synthesis; AI with direct file-system reads handles it. The author's framing: "Notion AI searches your workspace. Claude reads it. That gap matters most for cross-referencing everything you know to help you make better decisions." This is a tenet shape, not a tool comparison.

- **Format longevity is an architectural choice, not a footnote.** Plain-text markdown is readable in any text editor in thirty years regardless of whether Obsidian exists; proprietary databases aren't. Migration asymmetry is concrete: Notion-to-Obsidian is a clean export-and-import; Obsidian-to-Notion loses wikilinks, backlinks, plugin metadata, and graph structure. The principle survives without Obsidian — anyone choosing a substrate is making a 30-year bet whether they articulate it or not.

- **Compute cost across the stack is real and rankable.** From `obsidian-setup.md` Layer 5: there are four ways to reach the vault, and they cost different amounts of context. Raw file read is cheapest (no protocol overhead). Obsidian-CLI-via-Bash is light (shell exec + JSON out, Bash schema already loaded). Smart-Connections semantic query is mid-cost. Obsidian MCP server is heaviest, and *the cost hits before you use it* because most MCP servers load all their tool schemas into context up-front. The rule: raw reads for known paths, CLI for search and listings, semantic only for cross-domain work, MCP server only when you need the rendered view. Few MCPs = more headroom for content. This is a tool-selection discipline that translates directly to JASON-OS's existing tool inventory (Read vs Bash vs Grep vs Skill vs MCP) and articulates a principle JASON-OS already partially follows via `ToolSearch` for deferred tools.

- **Markdown-as-substrate scales further than ad-hoc grep.** The Obsidian plugin ecosystem (Dataview's SQL-like queries, Smart Connections' local embeddings, Templater's logic-in-templates, Tasks' parsed checkboxes) demonstrates that a typed-markdown corpus with frontmatter has more depth than "a folder of notes." Even if JASON-OS never adopts these specific plugins, the *shape* — declarative queries against a corpus of typed files, vector layer over the same corpus, templates that execute logic — is reachable from where JASON-OS currently is. The Obsidian ecosystem is prior art for what markdown-substrate systems can grow into.

- **Editor-as-CLI is a tool-tier insight.** The author's hard-won lesson is in the Layer 3 paragraph: "I spent weeks doing MCP gymnastics that the CLI would have replaced in a single command." Reaching for the heaviest tool first is a common error; reaching for the cheapest tool that does the job is the discipline. Generalizes to any system with a tool-tier choice.

- **Documentation can be dual-mode.** The README is explicitly designed to work two ways — a human reads it as install steps, OR a human pastes the README into Claude and Claude walks them through. `docs/obsidian-setup.md` has a "For the human reading this" section followed by "Below the line is Claude's operating manual." That writing pattern is itself a teachable shape — JASON-OS docs aren't currently dual-mode, but the pattern is reachable.

### Blindspots

- **No multi-agent paradigm.** Single conversation throughout. Repo doesn't think in terms of parallel sub-agents, dispatcher patterns, or convergence loops. For its purpose (one operator, one daily loop), that's correct — but it has no muscle for the kinds of research/planning workflows JASON-OS runs.
- **No formal SCOPE manifest or schema contracts on skills.** Skills self-describe in prose. Cross-skill drift is caught by the `/audit` skill rather than by structural enforcement. Works for five skills; would creak at fifteen.
- **No CI security pipeline at all.** No Gitleaks, no Semgrep, no CodeQL, no dependency review. For a public MIT-licensed template that ships executable Python (`smart_search.py`) and is intended to be cloned + run on operator machines, this is the most surprising omission given how carefully everything else is thought through.
- **`.claude/settings.json` ships as `{}`.** No hooks, no automated guardrails. The four operating laws are honor-only — they fire because the model reads CLAUDE.md, not because anything blocks bad behavior at a hook layer. JASON-OS sees this differently (CLAUDE.md §4 explicitly tags rules as `[GATE]` vs `[BEHAVIORAL: honor-only]`).
- **No version pinning or release checkpoint.** Operators cloning today vs. six months from now get different state. For a personal template that's deliberate; for ecosystem adoption it's friction.
- **The Notion-vs-Obsidian docs don't surface their best framing.** The "search vs read" structural argument and the "use both, bridge via Claude+MCP" architecture pattern are buried inside material framed as a tool comparison. The author has the insight; the docs would carry further if the framing were lifted out and named as principles.

## 2. What's Relevant To Your Work

JASON-OS is an extraction-of-SoNash-minus-app-infra effort centered on cross-repo movement, sync mechanics, and skill portability. This repo isn't a port target — it solves a different problem (personal task triage, not skill movement) — but several of its specific artifacts have direct uptake value.

**The decay-and-provenance pattern in `docs/memory.md`.** JASON-OS doesn't currently track which memories fire. The auto-memory layer in `~/.claude/projects/.../memory/` accumulates without a feedback signal — there's no mechanism to surface "this memory hasn't been pulled into a turn in N sessions, is it still load-bearing?" The ai-chief-of-staff approach is concrete: append one line to a firings log per memory that shaped a response, run decay analysis inside `/audit` every 7 sessions, gate the analysis on 10 distinct sessions of log data. If JASON-OS auto-memory grows past ~30-40 entries, this becomes worth considering. Right now it's note-only.

**The two-tier vault separation principle in `docs/protocols.md` and `ARCHITECTURE.md`.** Their `Command Center.md` (user reads daily) is clean; `_system/last_session.md` and `hot.md` (machinery) live behind it. JASON-OS scatters state files in `.claude/state/` alongside skill files in `.claude/skills/` and config in `.claude/settings.json`. The principle "anything you read every day is in the user-facing files; anything the machinery needs is behind a folder boundary" is worth surfacing as a tenet candidate if JASON-OS ever produces a user-readable surface beyond CLAUDE.md and SESSION_CONTEXT.md.

**The `/audit` skill as a scheduled aggregate check.** JASON-OS has `/skill-audit` per-skill and the `convergence-loop` skill for verification, but no recurring cross-system integrity check. Their `/audit` runs every 7 sessions, walks six dimensions (redundant memory, stale memory, MEMORY.md index drift, broken wikilinks, skill-vs-system drift, decay analysis), and reports findings without auto-fixing. That read-mostly discipline matches JASON-OS conventions exactly.

**The `setup` skill as a runnable interview.** JASON-OS has `/skill-creator` for new skills and `/deep-plan` for complex work but no first-time-clone wizard. ai-chief-of-staff `/setup` is a skippable interview that builds the system in 10 minutes, with all questions optional, and an explicit "ship it or keep going" gate after the four-question minimum. If JASON-OS ever ships as a clone-and-run template, the wizard pattern is reference.

**Four operating laws as a comparison set.** JASON-OS CLAUDE.md §4 has 16 behavioral guardrails. The compactness of ai-chief-of-staff's four laws (and the rationale-paired-with-each format) is worth holding up as a contrast. Two of the four laws (Operating Constraint, Verification Protocol) match JASON-OS rules directly. The other two (Scope Discipline, Execute-Don't-Meta-Talk) phrase ideas JASON-OS already has in scattered places more crisply.

**Search-vs-read as a JASON-OS tenet candidate.** The structural argument in `notion-vs-obsidian-deep.md` is a tenet shape: "AI that searches degrades on cross-source synthesis; AI that reads handles it." JASON-OS's existing `tenet_filesystem_verification.md` says research claims must be filesystem-verified — that's the verification angle. The ai-chief-of-staff framing is the *access-pattern* angle: "you should read your own corpus directly, not via a search intermediary." Worth surfacing alongside the existing tenet.

**Format-longevity as a JASON-OS tenet candidate.** Plain-text-outlives-the-tool. JASON-OS already lives this implicitly (markdown everywhere) but doesn't articulate the principle. The ai-chief-of-staff framing — including the asymmetric-migration-pain observation — is a clean way to name it.

**Tool-cost ranking + cheapest-tool-first as operational discipline.** From `obsidian-setup.md` Layer 5. JASON-OS has `ToolSearch` for deferred MCP tools (which matches the spirit) but no stated principle. Naming the principle ("prefer the cheapest tool that does the job; MCP servers cost tokens before you call them") would let JASON-OS skill authors make explicit choices instead of implicit ones.

**Use-both / bridge-via-Claude-MCP as architectural analog.** From the same Notion-vs-Obsidian docs. The pattern: split layers by use-context, bridge with AI reading both. Maps onto the SoNash-app-infra + JASON-OS-portable-layer + cross-repo-movement-reframe split JASON-OS is currently working through. Not a copy-paste pattern; a shape reference for how to think about the split.

**ADAM `coherence_monitor.py` as a hook-pattern reference.** From `CREDITS.md`. The script reads Claude Code JSONL session files and detects compaction events. JASON-OS has `compact-restore.js` as part of the session-start hook layer — there's likely cross-pollination available. Worth running `/repo-analysis` on the ADAM repo itself when JASON-OS hook-layer expansion is on the agenda.

**Don't-batch-install MCPs as cross-cutting discipline.** "Add these one at a time. Verify each one works before adding the next. Never batch-install." Generalizes to skill-porting, hook-adding, dependency-introduction. JASON-OS already follows this implicitly via per-skill port discipline, but stating it cross-cuts everything.

**CREDITS.md attribution protocol as a JASON-OS-shaped question.** The repo has a written maintenance protocol: when a script traces to an external source, its per-file docstring must include source repo URL, source file path, and (if MIT or similar) the original copyright line and permission notice. JASON-OS has a SoNash lineage that the whole repo embodies. The question of how to maintain attribution as patterns flow back and forth between SoNash and JASON-OS is open; ai-chief-of-staff's protocol is one answer.

**Dual-mode docs (human + LLM coach) as a writing-pattern reference.** JASON-OS doesn't ship public docs today, but if it does — and `tenet_conversational_explanatory.md` already pulls in that direction — the pattern is reachable.

**Obsidian plugin ecosystem as inspiration for markdown-substrate scaling.** Dataview's declarative queries, Smart Connections' local-embedding semantic layer, Templater's logic-in-templates. Even though JASON-OS doesn't run Obsidian, these are existence proofs for what a typed-markdown corpus *can grow into*. If JASON-OS auto-memory or `.research/` output ever needs cross-source synthesis beyond keyword grep, the prior-art shape is well-established.

The repo's `smart_search.py` script is a small code-craft reference (subprocess timeouts, json.dumps escaping for embedded JS, env-var-overridable paths) — JASON-OS's `scripts/lib/` utilities follow similar discipline; this validates the pattern.

## 3. Where Your Approach Differs

**Where JASON-OS is ahead.**
- Multi-agent architecture. JASON-OS routinely spawns 4-18 agents for `/deep-research`, runs convergence loops, has explicit dispute resolution and contrarian challenger phases. ai-chief-of-staff has none of this and doesn't need any of it.
- CI security pipeline. JASON-OS has Gitleaks pre-commit + Semgrep + CodeQL + dependency review + Scorecard + SonarCloud + Qodo. ai-chief-of-staff has none.
- Formal authority-split discipline (user-locked vs research-recommended-defaults vs filesystem-fact). ai-chief-of-staff doesn't have this concept.
- Schema contracts on skills (CONVENTIONS.md, schema validation, skill-audit rubric, SCOPE manifests).
- `[GATE]` vs `[BEHAVIORAL: honor-only]` annotation on each behavioral rule, with explicit `NEEDS_GATE` flags for rules that should become enforced.

**Where ai-chief-of-staff is ahead.**
- Memory firings log + decay analysis + bootstrap gate. JASON-OS auto-memory accumulates blind.
- Two-tier user-readable vs machinery separation. JASON-OS mixes these.
- The compact four-laws crystallization as a CLAUDE.md frame. JASON-OS CLAUDE.md is more documentary.
- The "rubber-stamp danger" framing for AI-drafted feedback memories. JASON-OS doesn't explicitly name this risk.
- Self-aware brevity. Five skills accomplish the daily loop.
- Search-vs-read as a stated principle (JASON-OS has filesystem verification but not this access-pattern framing).
- Format longevity as a stated principle.
- Tool-cost ranking with a stated cheapest-tool-first rule.
- A written attribution protocol (`CREDITS.md`).
- Dual-mode documentation (human-readable AND LLM-walkthrough-ready).
- Adjacent-implementations listing as research-honesty discipline.

**Where they're roughly even.**
- Memory architecture (typed markdown files + MEMORY.md index + frontmatter convention).
- Operating Constraint / stop-diagnose-confirm pattern.
- Verification Protocol / filesystem-verification tenet.
- CLAUDE.md as durable instructions that load every session.
- Rule-why-apply format for feedback memories.

## 4. The Challenge

The honest challenge this repo presents to JASON-OS:

**You scatter state.** Their `_system/` folder draws a clean line between user-facing daily-reads and machinery the system needs. JASON-OS puts skill state in `.claude/state/`, hooks in `.claude/hooks/`, sync data in `.claude/sync/`, settings in `.claude/settings.json` — all sibling directories under `.claude/`. The user has no single boundary that says "everything below this line is machinery you don't read." If JASON-OS ever grows a user-facing layer, the scattering becomes a real problem.

**You don't measure your memories.** Auto-memory accumulates. There's no signal that says memory X hasn't been load-bearing for the last N sessions. ai-chief-of-staff's firings log is the kind of cheap instrumentation that gets you decay analysis for free later. JASON-OS could add this incrementally.

**Your CLAUDE.md is documentary, not instructional.** ai-chief-of-staff CLAUDE.md is a thin operating-instructions template that grows by accretion of friction-driven rules. JASON-OS CLAUDE.md is currently a 200+ line document with sections on Stack, Security Rules, Architecture, Behavioral Guardrails, Critical Anti-Patterns, Coding Standards, Agent/Skill Triggers, Reference Docs. Some of that is operating instruction. A lot of it is reference material that happens to live in the file Claude reads first. The compactness of the chief-of-staff approach is worth examining.

**Your honor-only rules don't have a decay path.** JASON-OS marks rules `[BEHAVIORAL: honor-only]` and `NEEDS_GATE: <hook>`, which is good. But there's no scheduled audit asking "is rule X still firing in real sessions, or has it gone dormant?" ai-chief-of-staff's `/audit` skill could be the model for a JASON-OS aggregate audit.

**Your tool-tier choices are implicit.** The ai-chief-of-staff Layer-5 ranking (raw read < CLI < eval-via-CLI < MCP server) makes the cost difference explicit and gives skill authors a rule of thumb. JASON-OS skill authors are picking among Read / Bash / Grep / Skill / MCP every day and the choices are implicit. A stated tool-cost tenet would give the choice a name.

**Your access-pattern principle is half-stated.** `tenet_filesystem_verification.md` says verify-on-disk before claiming. The ai-chief-of-staff framing adds the access-pattern angle — *read directly, don't search via an API* — which is the structural reason filesystem verification works at all. Naming both halves of the principle would tighten the tenet.

**Your cross-repo attribution is implicit.** SoNash → JASON-OS lineage is everywhere in this repo, but there's no written protocol for how attribution gets maintained as patterns flow between the two. ai-chief-of-staff's CREDITS.md is one shape for that.

## 5. Knowledge Candidates

| Candidate | Type | Port priority | Effort | Why |
| --- | --- | --- | --- | --- |
| **"Rubber-stamp danger" warning for AI-drafted feedback memories** | knowledge | port-now | E0 | Cheap and immediately useful. One sentence to add to the JASON-OS auto-memory writing instructions: when the model drafts a feedback memory after a correction, the user reviews like an intern wrote it, not like durable policy. |
| **Search-vs-read access-pattern tenet** | tenet | port-now | E0 | Articulates the access-pattern angle of JASON-OS's existing filesystem-verification posture. Could become a one-paragraph addition to the existing tenet or its own short tenet. |
| **Tool-cost ranking + cheapest-tool-first rule** | tenet | port-now | E0 | JASON-OS skill authors implicitly pick among Read/Bash/Grep/Skill/MCP. Stating the principle gives the choice a name. Concrete weakness: JASON-OS environment is different from Obsidian's; the specific ranking has to be re-derived for our tool inventory. |
| **Format-longevity tenet** | tenet | port-when-needed | E0 | JASON-OS lives this; doesn't articulate it. Worth surfacing if/when a substrate decision is up for debate. |
| **Memory firings log + decay analysis with bootstrap gate** | pattern | port-when-needed | E1 | When JASON-OS auto-memory entry count grows past ~30-40 OR stale-memory drift becomes visible. |
| **Two-tier user-readable vs machinery file separation** | design-principle | port-when-needed | E1 | When JASON-OS grows a user-facing layer beyond CLAUDE.md and SESSION_CONTEXT.md. |
| **`/audit` as scheduled aggregate cross-system check** | pattern | port-when-needed | E1 | When JASON-OS skill or rule count grows past ~20 and aggregate drift becomes invisible. |
| **`setup` wizard as runnable first-time interview** | pattern | port-when-needed | E1 | If JASON-OS ships as a clone-and-run template (not currently on the roadmap). |
| **Use-both / bridge-via-Claude-MCP architecture pattern** | architecture | note-only | E0 | Shape reference for the SoNash + JASON-OS + cross-repo-movement-reframe split. Not a port; a way to think about the structure. |
| **CREDITS.md as a maintained attribution protocol** | discipline-pattern | port-when-needed | E1 | When JASON-OS ↔ SoNash cross-pollination gets dense enough that informal attribution stops working. |
| **ADAM `coherence_monitor.py` pattern (read JSONL session files; detect compaction)** | pattern | note-only | E1 | When JASON-OS hook-layer expansion is on the agenda. Worth a future `/repo-analysis` on the ADAM repo. |
| **Don't-batch-install operational discipline** | discipline | port-now | E0 | Cheap. Add as a one-line cross-cutting rule in JASON-OS conventions. |
| **Compact four-laws crystallization as CLAUDE.md frame** | knowledge | note-only | E0 | Comparison data, not a port. Could be the prompt for a future CLAUDE.md trim pass. |
| **Adjacent-implementations listing as research-honesty discipline** | discipline | note-only | E0 | Inspirational shape for any future research-output framing. |
| **Dual-mode docs (human + LLM coach) writing pattern** | writing-pattern | note-only | E0 | If/when JASON-OS produces public-facing docs. |
| **Markdown-as-substrate scaling pattern (Dataview/Smart Connections/Templater inspiration)** | knowledge | note-only | E0 | Existence proof of where markdown-substrate systems can grow. Inspiration only; no port. |
| **Editor-as-CLI tool-tier insight** | knowledge | note-only | E0 | Validates the cheapest-tool-first principle from a different angle. |
| **Rule-why-apply feedback format** | (already-converged) | already-applied | — | Validates current JASON-OS pattern. No port needed. |

## 6. What's Worth Avoiding

- **Don't ship a JASON-OS surface with no CI security pipeline.** ai-chief-of-staff gets away with it because the surface is prose + one Python script and the audience is a single operator. JASON-OS already has the security pipeline; preserve that posture.
- **Don't make memory decay autonomous.** The chief-of-staff `/audit` skill is read-mostly — surfaces findings, the human picks fixes. Memory deletion or merging without explicit human approval is a known anti-pattern.
- **Don't conflate single-operator simplicity with skill-system simplicity.** The ai-chief-of-staff loop is five skills because it's *one person's daily loop*. JASON-OS solves a different problem where one-person-loop simplicity isn't the target. The compactness inspires; it doesn't prescribe.
- **Don't import the Obsidian dependency.** The Obsidian-specific implementation (smart_search.py, MCP wiring, plugin configuration) doesn't transfer; the conceptual patterns it illustrates do. Don't pull in tooling JASON-OS doesn't need.
- **Don't batch-install MCP servers, skills, or hooks.** The author's lesson is concrete: "Add these one at a time. Verify each one works before adding the next." JASON-OS already follows this informally; worth honoring as a stated rule.
- **Don't reach for the heaviest tool first.** Editor-as-CLI insight: "I spent weeks doing MCP gymnastics that the CLI would have replaced in a single command." Reach for the cheapest tool that does the job. JASON-OS skill authors who default to MCP server calls when a Read or Grep would do are paying the cost up-front.
- **Don't dismiss an artifact because the technology is unfamiliar.** This is the meta-lesson from doing this analysis. The Obsidian-specific docs were the most productive single source of JASON-OS-relevant ideas in the entire repo. Specifics inspire by analogy.
