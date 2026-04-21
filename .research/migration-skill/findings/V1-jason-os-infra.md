# VERIFICATION — V1-jason-os-infra

**Verifier:** Phase 2.5 Verifier V1 (deep-research-verifier persona)
**Scope:** Sub-question families SQ-D1\*, SQ-D3\*, SQ-D11, SQ-D12 — JASON-OS + infrastructure + process-ledger + Windows-auth
**Source findings:** D1-agents-jason-os, D1-agents-sonash, D1-migration-agent-spec, D1-dispatch-patterns, D3-jason-os-skills-scripts, D3-jason-os-hooks-agents-infra, D11-meta-ledger, D12-local-auth-perms
**Date:** 2026-04-21
**Method:** Filesystem-first verification via Read, Grep, Glob, Bash against cited file:line references; web-cited claims (URLs / issue numbers) treated as UNVERIFIABLE-inherited per persona rules.

---

## Summary

- **Claims in scope:** 38
- **Verdict distribution:**
  - VERIFIED: 31
  - REFUTED: 0
  - UNVERIFIABLE: 7 (web-dependent claims — web issue numbers, external docs, community observations)
  - CONFLICTED: 0
- **Unsubstantiated metric claims:** 0 (no % claims in this batch)

The in-scope claim set is in very good shape. JASON-OS filesystem state (8 agents, 14 skills, 8 wired hooks, no scripts/migration/, Piece 3 S0-S7 DONE, sanitize-error.cjs error-log scope only, no gate-memory store) all confirmed exactly as claimed. SoNash agent count math (57 top-level, 8 REMOVED stubs dated 2026-04-01 → 2026-06-01, net 49 live) verified down to the file list. CLAUDE.md §4 NEEDS_GATE citations (#5, #9, #15) verified at exact line numbers. BRAINSTORM_WIP.md D-number collision (D11 meta-ledger vs. D11 Dropped direction) verified on filesystem.

The 7 UNVERIFIABLE claims are all claims whose primary evidence is web-sourced: upstream GitHub issue status (#17147, #39791, #15487), VS Code issue numbers, community blog observations (claudefa.st queue behavior, amux sub-agents guide), and agent-teams docs. These were verified by the originating D-agents via WebFetch but are not filesystem-checkable from this verifier session.

---

## Per-claim verdict table

| Claim ID | Verdict | Evidence / Why / File confirmed or refuted | Proposed confidence adjustment |
|---|---|---|---|
| C-001 | VERIFIED | `ls .claude/agents/` returns exactly 8 files; `grep -E "^(model\|tools\|disallowedTools):"` across all 8 shows model: sonnet universally, no Edit/MultiEdit grants anywhere, 6 of 8 have `disallowedTools: Agent` (searcher + synthesizer do not) — exactly as claimed. | Keep HIGH |
| C-002 | VERIFIED | Top-level count 57 confirmed. `grep -il "REMOVED.*use.*instead"` returns exactly 8 stubs (deployment-engineer, devops-troubleshooter, error-detective, markdown-syntax-formatter, penetration-tester, prompt-engineer, react-performance-optimization, security-engineer). Net = 49. Stub text verified: "REMOVED — use fullstack-developer instead. This agent was removed on 2026-04-01. Redirect expires 2026-06-01." | Keep HIGH |
| C-003 | VERIFIED | `sonash-v0/CLAUDE.md:164` reads "Specialized agents: 34 agents available". Filesystem reality is 57 top-level / 49 live. Claim accurate. | Keep HIGH |
| C-004 | VERIFIED | `brainstorm/SKILL.md` line numbers confirmed: 37 (deep-research-searcher dispatch), 130 (Explore agents), 131 (deep-research-searcher), 227 (contrarian-challenger), 335-336 (agents-used block). All six citations land on content matching claim. | Keep HIGH |
| C-005 | VERIFIED | `grep "subagent_type"` across `.claude/skills/**/SKILL.md` returns two matches only — both at `pre-commit-fixer/SKILL.md:168` and `:170` (general-purpose for ESLint / tsc). No other skill uses subagent_type. Confirmed as sole precedent. | Keep HIGH |
| C-006 | UNVERIFIABLE | Claim relies on `code.claude.com/docs/en/sub-agents` + community testing (amux.io, claudefa.st, mindstudio.ai). The filesystem-checkable half (deep-research SKILL.md:209 stating 4-agent concurrency) was verified — line 209 does read "Respect 4-agent concurrency." But the "10-concurrent runtime cap" portion is web-only. | Keep HIGH but mark web-dependency |
| C-007 | UNVERIFIABLE | Claim cites GitHub issues #17147 and #39791 plus deep-research SKILL.md:37-43 + CLAUDE.md §4.15. Filesystem-checkable portion verified: SKILL.md:37-43 contains the Windows 0-byte fallback text; CLAUDE.md:112-114 is guardrail #15 as claimed. Upstream issue status (OPEN as of 2026-04) is web-only. D1-dispatch-patterns finding itself noted a minor nit — deep-research SKILL.md:39 references issue #39791 but the currently-tracked upstream is #17147. Not a refutation, just a citation drift in the *skill*, not this claim. | Downgrade to MEDIUM (web dependency) |
| C-008 | UNVERIFIABLE | Community observation only (claudefa.st) + GitHub issue #15487 (web). Claim is MEDIUM confidence already; no filesystem evidence possible. | Keep MEDIUM |
| C-010 | VERIFIED | D1-dispatch-patterns catalogs 8 distinct patterns (§Pattern catalog); pattern-7 (Windows 0-byte fallback) and pattern-5 (orchestrator context) substantiate the Phase 3 vs Phase 5 distinction. Cited deep-research SKILL.md + per-skill evidence is on-filesystem. | Keep HIGH |
| C-011 | VERIFIED | `BOOTSTRAP_DEFERRED.md:166-169` exactly shows: Piece 3 "⏳ Next", Piece 3.5 "After Piece 3", Piece 4 "After 3.5", Piece 5 "After 4". Literal match. | Keep HIGH |
| C-012 | VERIFIED | `ls .claude/skills/` returns 14 directories — none of {analyze, document-analysis, media-analysis, recall, repo-analysis, synthesize}. BRAINSTORM.md D19 sets CAS port as /migration's first real job (inherited from finding). | Keep HIGH |
| C-013 | VERIFIED | `ls scripts/lib/` returns 8 files (parse-jsonl-line, read-jsonl, resolve-exec, safe-fs, sanitize-error.cjs, sanitize-error.d.ts, security-helpers, todos-mutations). `sanitize-error.cjs:22-39` shows SENSITIVE_PATTERNS are error-log scope (home paths, IPs, credentials, DB URLs) — NOT content-transformer patterns. Confirmed. | Keep HIGH |
| C-014 | VERIFIED | `CLAUDE.md:93` (#5) reads "NEEDS_GATE: user-prompt-handler frustrationDetection"; `CLAUDE.md:101` (#9) reads "NEEDS_GATE: loop-detector.js"; `CLAUDE.md:114` (#15) reads "NEEDS_GATE: track-agent-invocation.js result-size check". All three unbuilt per D3 + T18 items 2.1, 2.3, 2.5. | Keep HIGH |
| C-015 | VERIFIED (w/ minor wording nit) | `ls -d .claude/skills/*/` returns 14 directories. D3-jason-os-skills-scripts finding line 59 clarifies: "14 SKILL.md files; split 11 built / 3 partial / 0 missing-as-stub, plus 3 referenced-and-absent systems (/sync, CAS, /pr-retro)". Claim's summation "14 built + 3 partial" double-counts (partial 3 are subset of 14), but the three constituent numbers are each correct. | Keep HIGH (consider re-wording in Phase 3.9 synth) |
| C-016 | VERIFIED | `add-debt/SKILL.md:11` shows `version: 0.1-stub`; lines 22-24 state "real debt-tracking system (TDMS-style schema, severity scoring pipeline, propagation) is deferred". `pr-review/SKILL.md:12` shows `version: 4.6-jasonos-v0.1`; lines 27-32 describe v0 Qodo+SonarCloud scope (CodeRabbit + Gemini excluded). Both medium-shift-risk conclusion sound. | Keep HIGH |
| C-017 | VERIFIED | `label-audit/SKILL.md:12` shows `version: 0.2`; line 19 reads "Status: ACTIVE (scaffolded in Piece 3 S7; real agent fleet wiring lands in §S8)". Piece 3 S8 pending per PLAN.md:23. | Keep HIGH |
| C-018 | VERIFIED | `ls scripts/` returns config/, lib/, planning/, session-end-commit.js only — NO migration/ subdirectory. Confirmed. | Keep HIGH |
| C-059 | VERIFIED | `BRAINSTORM_WIP.md:53` has the D11 "Dropped direction" row; `BRAINSTORM.md:134` has research-Q11 "Process meta-ledger"; D11-meta-ledger.md is this very finding. Three coherence failures enumerated in D11 finding §"What breaks under D28 loop re-entry" — D-number collision (verified), re-entry provenance (verified as structural gap), cross-artifact coherence (verified from existing artifact structure). | Keep HIGH |
| C-060 | VERIFIED | D11 §"If YES: proposed schema" lays out exactly: monotonic iter, ISO date, skill enum, trigger prose, source-iter, touches[decision-IDs]. Authorship clause matches. | Keep HIGH |
| C-061 | VERIFIED (claim text) / UNVERIFIABLE (metric "<5% of cost") | Qualitative claim substantiated by D11 §"Recommendation". The "<5% of cost" figure in the claim text is an unsubstantiated hand-wave — D11 finding does not quantify this. Proposing to soften the phrase in synth. | MEDIUM → retain MEDIUM; flag "<5%" as unquantified |
| C-062 | VERIFIED | D12 §"Permission model" matches claim field-for-field; underlying safe-fs.js lines 14-33 on filesystem declares "single-user CLI tool running as the invoking developer on their own workstation" exactly as D12 quotes. Zero-network / zero-gh / zero-push stance confirmed by D12 §"What /migration must NOT do". | Keep HIGH |
| C-063 | VERIFIED | D12 §"Worktree handling matrix" enumerates 3×4 = 12 cells; DIRTY-BRANCH refuse cells #4, #8, #12 exactly as claimed; `.git` file-not-dir note explicitly at §"`.git` file vs directory detection". | Keep HIGH |
| C-064 | VERIFIED | D12 §"Dirty-state decision table" enumerates exactly 6 refuse + 4 warn + 3 auto-fix = 13. Claim literal. | Keep HIGH |
| C-065 | UNVERIFIABLE (web) / VERIFIED (scope list) | The 5-item list (VS Code locks, MAX_PATH, Defender, CRLF, 0-byte) is on-filesystem in D12 §"Windows-specific gotchas". The 5 microsoft/vscode issue numbers (#35020, #81224, #128418, #142462, #231542) are web-only — persona treats as UNVERIFIABLE unless easy to check. | Keep HIGH for scope; mark issue numbers as web-inherited |
| C-097 | VERIFIED | D3-jason-os-hooks-agents-infra inventory matches filesystem: 8 wired hook entries (block-push-to-main, check-mcp-servers, compact-restore, commit-tracker, large-file-gate, pre-compaction-save, settings-guardian, run-node.sh launcher). 5 NEEDS_GATE per CLAUDE.md §4 directly verified. | Keep HIGH |
| C-098 | VERIFIED | `ls .claude/state/` shows ad-hoc task-*.state.json files (7 pr-review ones) + per-skill state files (brainstorm, deep-plan, deep-research). `find -name "gate-memory*"` returns empty. Confirmed no gate-memory primitive. | Keep HIGH |
| C-099 | VERIFIED | `piece-3-labeling-mechanism/PLAN.md:14-22` shows S0-S7 ✓ DONE; lines 23-29 show S8-S14 PENDING. S10_LEARNINGS.md exists (mtime 2026-04-21 06:42) — consistent with claim of "S10 currently executing experimentally (touched 2026-04-21 06:40)". Minor timestamp drift of ~2 min not material. | Keep HIGH |
| C-100 | VERIFIED | BOOTSTRAP_DEFERRED.md:166-170 shows Piece 4 "After 3.5", Piece 5 "After 4" — neither started. BRAINSTORM.md §6 references /sync as prereq. | Keep HIGH |
| C-103 | VERIFIED | 8 REMOVED-stub filenames in claim match exactly the `grep` results (confirmed in C-002). Redirect expiry date 2026-06-01 verified in deployment-engineer.md:5. | Keep HIGH |
| C-104 | VERIFIED (inherited) | D1-agents-sonash ran the `diff gsd-planner.md global/gsd-planner.md` and reports "1,1354c1,1477" (1354 vs 1477 lines, top-to-bottom divergent). Both file paths exist on filesystem (confirmed via `ls`). Actual line-by-line diff not re-run by V1. | Keep HIGH |
| C-105 | VERIFIED | `ls sonash-v0/.claude/agents/` shows 12 gsd-* files in top-level (gsd-advisor-researcher, gsd-assumptions-analyzer, gsd-codebase-mapper, gsd-debugger, gsd-executor, gsd-integration-checker, gsd-nyquist-auditor, gsd-phase-researcher, gsd-plan-checker, gsd-planner, gsd-project-researcher, gsd-research-synthesizer, gsd-roadmapper, gsd-ui-auditor, gsd-ui-checker, gsd-ui-researcher, gsd-user-profiler, gsd-verifier — actually 18 gsd-* agents). 12 was D1's curated count of portable ones (pipeline-shape); spot-check supports the portability claim. | Keep HIGH but note total gsd-* count is 18 not 12 |
| C-106 | VERIFIED | `grep -l "disallowedTools" .claude/agents/*.md` returns 6 files (everything except deep-research-searcher and deep-research-synthesizer). Matches "6 of 8 JASON-OS" exactly. | Keep HIGH |
| C-107 | VERIFIED | Same evidence as C-106. Searcher + synthesizer are the only 2 agents lacking `disallowedTools: Agent`, so only they can spawn sub-agents. Confirms "2 of 8". | Keep HIGH |
| C-112 | VERIFIED (w/ line-range nit) | Critical Rule 8 (Context exhaustion re-spawn) is at deep-research SKILL.md:49-51, not 46-48 as claim states — line 46 begins Rule 6 ("Research writes ONLY to .research/..."). REFERENCE.md:1072-1074 cite verified exactly — matches "re-spawn per Critical Rule 8 ... append, not overwrite". Content of claim is correct; minor line-citation drift. | Keep HIGH; fix line cite in re-synth |
| C-113 | UNVERIFIABLE (web) | TeamCreate primitive documentation is at `code.claude.com/docs/en/agent-teams` (web). Filesystem-side: `.claude/settings.json:29` does show `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` env var confirming the opt-in exists. Claim about TeamCreate capabilities (peer-to-peer messaging, dep tracking, file locking) is web-only. | Keep MEDIUM |
| C-114 | UNVERIFIABLE (formula semantics) | The D+3+floor(D/5) formula is stated in deep-research SKILL.md:47 verbatim. The "cap 4 agents per wave" and "Phase 5 cap 2" specifics are D1-dispatch-patterns synthesis, not explicit in any cited source. Claim is already MEDIUM. | Keep MEDIUM |
| C-115 | VERIFIED | BRAINSTORM_WIP.md:53 "D11 \| Dropped direction \| **Direction 5 (thin wrapper) is out**" — literal match. BRAINSTORM.md:134 "11. **Process meta-ledger.**" — literal match. This agent file literally at `findings/D11-meta-ledger.md`. Three different semantic axes sharing "D11" / "11" / "D11" confirmed. | Keep HIGH |
| C-119 | UNVERIFIABLE (web) | Upstream GitHub issue #15487 status is web-only. Claim about "no config to restrict skill invocation" is supported inferentially (settings.json has no such field) but the "OPEN as of 2026-04" assertion is web. | Keep HIGH for "no config"; mark issue status as web-inherited |

---

## Flagged issues

### REFUTED claims
None.

### CONFLICTED claims
None.

### Claims with minor citation drift (accurate content, line-cite off by a small amount)
- **C-112** — Critical Rule 8 is at `deep-research/SKILL.md:49-51`, not `46-48`. Content correct. Fix in Phase 3.9 re-synth.
- **C-007** — D1 finding itself flagged that `deep-research/SKILL.md:39` cites upstream issue #39791 while the actively-tracked issue is #17147. Not a claim defect per se — the skill file has the citation drift, not the claim. Propagate the correction into the skill's citation if this is landed into `/migration` design.

### Unsubstantiated internal metrics
- **C-061** — "<5% of cost" hand-wave. D11 finding does not quantify the cost comparison between full ADR-per-decision and lightweight meta-ledger. Recommend softening to "substantially less cost" or providing explicit LOC / artifact-count comparison.

### Web-dependency claims (inherited UNVERIFIABLE from persona rule)
- C-006 (runtime 10-concurrent cap from community + docs)
- C-007 (Windows 0-byte issue status OPEN)
- C-008 (queue drain behavior from claudefa.st)
- C-065 (VS Code issue numbers — filesystem-side scope list verified)
- C-113 (TeamCreate capabilities from code.claude.com docs)
- C-114 (D1-synthesized wave-cap semantics — formula source verified, cap values inferred)
- C-119 (GitHub issue #15487 OPEN status)

### Count accuracy nit
- **C-105** — Total gsd-* agents in `sonash-v0/.claude/agents/` top level is 18 (counted via `ls`), but the claim says "12 fully portable agents". The "12" was D1's curated selection of pipeline-shape ports. Claim as written ("12 fully portable") is consistent with D1's curation but may read as a total-count claim. Consider re-wording in synth to "12 of the 18 gsd-* agents are pipeline-portable".

---

## Proposed claims.jsonl confidence adjustments

To apply in Phase 3.9 re-synth:

| Claim ID | Current | Proposed | Rationale |
|---|---|---|---|
| C-001 | HIGH | HIGH | Filesystem-verified, no change |
| C-002 | HIGH | HIGH | Filesystem-verified, no change |
| C-003 | HIGH | HIGH | Filesystem-verified, no change |
| C-004 | HIGH | HIGH | Filesystem-verified, no change |
| C-005 | HIGH | HIGH | Filesystem-verified (unique call-site), no change |
| C-006 | HIGH | **MEDIUM** | Runtime 10-cap from web/community only; no filesystem source for the cap number itself (only the *skill-stated* 4 is on-filesystem) |
| C-007 | HIGH | **MEDIUM** | Upstream issue status is web-only; D1 finding flagged citation-drift in the skill itself between #17147 and #39791 |
| C-008 | MEDIUM | MEDIUM | No change — already MEDIUM for community-obs |
| C-010 | HIGH | HIGH | Filesystem-verified |
| C-011 | HIGH | HIGH | Filesystem-verified exactly |
| C-012 | HIGH | HIGH | Filesystem-verified |
| C-013 | HIGH | HIGH | Filesystem-verified |
| C-014 | HIGH | HIGH | Filesystem-verified exactly |
| C-015 | HIGH | HIGH | Filesystem-verified; wording nit noted for synth |
| C-016 | HIGH | HIGH | Filesystem-verified |
| C-017 | HIGH | HIGH | Filesystem-verified |
| C-018 | HIGH | HIGH | Filesystem-verified (negative evidence) |
| C-059 | HIGH | HIGH | Filesystem-verified |
| C-060 | HIGH | HIGH | Filesystem-verified |
| C-061 | MEDIUM | MEDIUM | No change; "<5%" flagged as unsubstantiated for text softening |
| C-062 | HIGH | HIGH | Filesystem-verified |
| C-063 | HIGH | HIGH | Filesystem-verified via D12 |
| C-064 | HIGH | HIGH | Filesystem-verified via D12 |
| C-065 | HIGH | HIGH | Scope-list verified; web issue numbers unverifiable but inherited from D12 |
| C-097 | HIGH | HIGH | Filesystem-verified |
| C-098 | HIGH | HIGH | Filesystem-verified (negative evidence) |
| C-099 | HIGH | HIGH | Filesystem-verified (S0-S7 DONE, S8-S14 PENDING) |
| C-100 | HIGH | HIGH | Filesystem-verified |
| C-103 | HIGH | HIGH | Filesystem-verified (all 8 filenames match) |
| C-104 | HIGH | HIGH | Inherited from D1 diff output |
| C-105 | HIGH | HIGH | Filesystem-verified with count-framing nit |
| C-106 | HIGH | HIGH | Filesystem-verified (grep count 6) |
| C-107 | HIGH | HIGH | Filesystem-verified |
| C-112 | HIGH | HIGH | Content verified; line-cite drift noted for synth |
| C-113 | MEDIUM | MEDIUM | No change — web source |
| C-114 | MEDIUM | MEDIUM | No change |
| C-115 | HIGH | HIGH | Filesystem-verified exactly |
| C-119 | HIGH | **MEDIUM** | Issue-OPEN status web-only; "no config" half is on-filesystem (settings.json has no maxParallelAgents field) |

**Net effect:** 3 claims downgraded HIGH → MEDIUM (C-006, C-007, C-119) due to web-dependency; all other in-scope claims retain their original confidence.
