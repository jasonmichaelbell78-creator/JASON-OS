# V1a: Claims C-001 to C-012

## C-001: VERIFIED
- Claim: session-begin skill is identical to SoNash v2.0 but cannot execute core context-loading because SESSION_CONTEXT.md is absent from JASON-OS
- Evidence: diff of both repos skill files exits 0 (byte-for-byte identical). SESSION_CONTEXT.md confirmed absent from JASON-OS root.
- Confidence: HIGH | Method: filesystem | Files: JASON-OS/.claude/skills/session-begin/SKILL.md (identical to SoNash); JASON-OS root (SESSION_CONTEXT.md ABSENT)

## C-002: VERIFIED
- Claim: session-end skill entirely absent; BOOTSTRAP_DEFERRED.md records reason as Phase 3 npm script dependency
- Evidence: JASON-OS .claude/skills/ has 9 skills, session-end not listed. BOOTSTRAP_DEFERRED.md:12-28 names npm run reviews:sync, run-ecosystem-health.js, consolidate-all.js, generate-metrics.js as blockers.
- Confidence: HIGH | Method: filesystem | File: /c/Users/jbell/.local/bin/JASON-OS/.planning/jason-os/BOOTSTRAP_DEFERRED.md:12-28

## C-003: REFUTED (partial)
- Claim: SoNash has 20+ production hooks across all 6 event types; JASON-OS has 3 active hooks across 2 event types (PreToolUse only)
- Evidence: SoNash settings.json: 28 command hooks across 7 event types (verified). JASON-OS: 3 PreToolUse matchers PLUS 1 SessionStart hook = 2 event types, but NOT PreToolUse only. The parenthetical PreToolUse only is wrong; SessionStart (check-mcp-servers.js) is also active. Core gap (3 vs 28 hooks; 2 vs 7 event types) is real.
- Confidence: HIGH | Method: filesystem | File: /c/Users/jbell/.local/bin/JASON-OS/.claude/settings.json:36-79

## C-004: VERIFIED
- Claim: SoNash statusline (Go binary) writes bridge file /tmp/claude-ctx-{session_id}.json that gsd-context-monitor.js reads; two-hook coordination absent from JASON-OS
- Evidence: gsd-statusline.js:36-47 writes os.tmpdir()/claude-ctx-SESSION.json via writeFileSync. gsd-context-monitor.js:4,63 reads same path. JASON-OS statusline-command.sh exists but has no bridge write; neither hook file is in JASON-OS hooks dir.
- Confidence: HIGH | Method: filesystem | Files: sonash-v0/.claude/hooks/gsd-statusline.js:36-47; gsd-context-monitor.js:63

## C-005: VERIFIED
- Claim: SoNash has 3-layer compaction defense (commit-tracker, pre-compaction-save, compact-restore); JASON-OS has none of the three
- Evidence: pre-compaction-save.js, compact-restore.js, commit-tracker.js all confirmed in sonash-v0/.claude/hooks/. SoNash settings.json has PreCompact event + SessionStart compact-restore matcher. JASON-OS settings.json has no PreCompact key; none of these hook files are present.
- Confidence: HIGH | Method: filesystem

## C-006: CONFLICTED
- Claim: JASON-OS MEMORY.md has 25 feedback entries (vs SoNash 11); only 1 project file vs SoNash 28
- Evidence: JASON-OS: 25 feedback_*.md files (CORRECT), 1 project_*.md file (CORRECT). SoNash: 37 feedback_*.md files (NOT 11 as claimed), 27 project_*.md files (~28 is acceptable rounding). SoNash feedback baseline off by 3x.
- Confidence: HIGH for actual counts | Method: filesystem
- Conflicts: [{ sourceA: claims.jsonl states SoNash has 11 feedback entries, sourceB: filesystem ls shows 37 feedback_*.md in sonash-v0 memory, type: Misinformation - SoNash feedback undercounted 3x }]

## C-007: VERIFIED
- Claim: /todo and /checkpoint skills identical between repos; JASON-OS lacks session-start hook that surfaces todo count on startup
- Evidence: diff todo/SKILL.md exits 0; diff checkpoint/SKILL.md exits 0. sonash-v0/.claude/hooks/session-start.js EXISTS; JASON-OS equivalent ABSENT. SoNash settings.json:33-38 registers session-start.js under SessionStart; JASON-OS SessionStart only runs check-mcp-servers.js.
- Confidence: HIGH | Method: filesystem

## C-008: VERIFIED
- Claim: SoNash trigger architecture has 6 strata; JASON-OS has only 2 (CLAUDE.md table + PreToolUse guards)
- Evidence: SoNash covers: CLAUDE.md PRE-TASK table + UserPromptSubmit NLP handler + PreToolUse (6 matchers) + PostToolUse cascades (10 matchers) + PostToolUseFailure loop detector + 17 agents with PROACTIVELY clauses. JASON-OS has only CLAUDE.md table + PreToolUse (3 matchers). All 6 claimed strata confirmed present in SoNash, absent in JASON-OS.
- Confidence: HIGH | Method: filesystem | Files: sonash-v0/.claude/settings.json:71-306; JASON-OS/.claude/settings.json:48-79

## C-009: VERIFIED
- Claim: user-prompt-handler.js ~720 LOC fires on every user message and dispatches 6 sub-functions
- Evidence: File is 718 lines (~720 accurate). Registered under UserPromptSubmit in settings.json:271-281. Six run* functions confirmed: runGuardrails (line 644), runFrustrationDetection (657), runAlerts (44), runAnalyze (145 - skill-directive emission), runSessionEnd (442), runPlanSuggestion (519 - plan complexity). All dispatched at lines 704-709.
- Confidence: HIGH | Method: filesystem | File: sonash-v0/.claude/hooks/user-prompt-handler.js:44,145,442,519,644,657,704-709

## C-010: VERIFIED
- Claim: SoNash PostToolUse has 9-10 matchers; cross-hook state loop: track-agent-invocation writes .session-agents.json which pre-commit-agent-compliance reads to block commits
- Evidence: awk count of PostToolUse matchers = 10. track-agent-invocation.js:57 defines STATE_FILE = .claude/hooks/.session-agents.json and writes it at line 159. pre-commit-agent-compliance.js:51 reads same path to gate commits.
- Confidence: HIGH | Method: filesystem | Files: sonash-v0/.claude/hooks/track-agent-invocation.js:57,159; pre-commit-agent-compliance.js:51

## C-011: VERIFIED
- Claim: loop-detector.js hashes normalized failures, warns after 3 identical in 20-minute window; JASON-OS has no equivalent
- Evidence: loop-detector.js:14-16 documents SHA-256 hash + 3-hit/20-min logic. Lines 51-52 set WINDOW_MS = 20*60*1000, TRIGGER_COUNT = 3. Registered in SoNash settings.json:293-306 under PostToolUseFailure. JASON-OS settings.json has no PostToolUseFailure key; loop-detector.js absent from JASON-OS hooks.
- Confidence: HIGH | Method: filesystem | File: sonash-v0/.claude/hooks/loop-detector.js:14-16,51-52

## C-012: VERIFIED
- Claim: 17 SoNash agents have PROACTIVELY clauses; 0 of JASON-OS 8 agents do
- Evidence: grep -rl PROACTIVELY in sonash-v0/.claude/agents/ returns exactly 17 files. Same grep in JASON-OS/.claude/agents/ returns 0 results. JASON-OS has 8 agent files confirmed.
- Confidence: HIGH | Method: filesystem

---

VERIFIED: 10, REFUTED: 0, UNVERIFIABLE: 0, CONFLICTED: 2

Notes:
- C-003: Core gap is real (2 vs 7 event types, 3 vs 28 hooks). Sub-claim PreToolUse only is wrong -- SessionStart is also wired. Marked REFUTED on the specific parenthetical; synthesizer should treat architecture gap as confirmed but correct the characterization.
- C-006: Insight (knows HOW but not WHAT) is valid. Project file asymmetry (1 vs 27) confirmed. Feedback baseline wrong (11 claimed, 37 actual in SoNash). Synthesizer should use actual counts.