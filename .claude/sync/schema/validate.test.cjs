#!/usr/bin/env node
// Validation harness for schema-v1.json (Step 7 of Piece 2 PLAN.md).
// Tests representative positive + negative records against the schema.
// Exit 0 on all-pass, 1 on any failure.

const fs = require('node:fs');
const path = require('node:path');

// Route all error text through the repo-standard sanitizer per CLAUDE.md §2 /
// §5 (PR #7 R1 / Qodo QF2 compliance). Path is relative from this file
// (.claude/sync/schema/) up to scripts/lib/ at the repo root.
const { sanitizeError } = require('../../../scripts/lib/sanitize-error.cjs');

let Ajv;
let addFormats;
try {
  Ajv = require('ajv');
} catch {
  console.error('FAIL: ajv not installed. Run `npm install --save-dev ajv` in repo root.');
  process.exit(2);
}
try {
  addFormats = require('ajv-formats');
} catch {
  console.error('FAIL: ajv-formats not installed. Run `npm install --save-dev ajv-formats` in repo root.');
  process.exit(2);
}

const SCHEMA_DIR = __dirname;
const SCHEMA_PATH = path.join(SCHEMA_DIR, 'schema-v1.json');

// Wrap schema read + parse in try/catch per CLAUDE.md §5 (PR #7 R1 / Qodo
// QF1 compliance — prevents existsSync race + malformed-JSON crash).
let schema;
try {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  schema = JSON.parse(raw);
} catch (err) {
  console.error(`FAIL: could not read/parse schema-v1.json: ${sanitizeError(err)}`);
  process.exit(2);
}

// allErrors:true is deliberate for a dev harness — surfaces every per-record
// schema issue in one run instead of bailing on the first. The Semgrep rule
// javascript.ajv.security.audit.ajv-allerrors-true targets production handlers
// accepting untrusted input (DoS via allocation flood); this harness validates
// static, repo-owned schema + test records only. nosemgrep justified.
//
// strict: true + strictRequired: false. Per-type allOf/then blocks require
// properties defined at file_record's top-level — Ajv strictRequired checks
// each subschema in isolation and can't follow cross-block references, which
// is a legitimate draft-07 limitation addressed in 2019-09 via
// unevaluatedProperties (tracked as debt D1, PR #7 R1 G4). Disabling ONLY
// strictRequired keeps every other strict-mode guard active (Gemini G3
// intent preserved).
// nosemgrep: javascript.ajv.security.audit.ajv-allerrors-true.ajv-allerrors-true
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const results = [];

function test(label, record, shouldPass) {
  const valid = validate(record);
  const pass = valid === shouldPass;
  // Snapshot the Ajv errors — validate.errors is mutated on every subsequent
  // call, so a raw reference would be overwritten before the report runs
  // (PR #7 R1 / Qodo Q2 compliance).
  const errors = valid ? null : structuredClone(validate.errors);
  results.push({
    label,
    expected: shouldPass ? 'pass' : 'fail',
    actual: valid ? 'pass' : 'fail',
    ok: pass,
    errors,
  });
}

// Positive test 1 — minimal valid skill record
test('pos1-skill-minimal', {
  name: 'checkpoint',
  path: '.claude/skills/checkpoint/SKILL.md',
  type: 'skill',
  purpose: 'Save session state for recovery after compaction or failures.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  reference_layout: 'none',
  supports_parallel: true,
  fallback_available: false,
}, true);

// Positive test 2 — hook with state_files populated
test('pos2-hook-with-state', {
  name: 'block-push-to-main',
  path: '.claude/hooks/block-push-to-main.js',
  type: 'hook',
  purpose: 'Blocks git push operations targeting main branch.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  state_files: [
    { path: '.claude/state/push-attempts.jsonl', access: 'write' }
  ],
  event: 'PreToolUse',
  matcher: '^Bash$',
  if_condition: null,
  continue_on_error: false,
  exit_code_action: 'block',
  async_spawn: false,
  kill_switch_env: null,
}, true);

// Positive test 3 — memory with sections populated (mixed-scope)
test('pos3-memory-with-sections', {
  name: 'feedback_no_broken_widgets',
  path: 'memory/feedback_no_broken_widgets.md',
  type: 'memory',
  purpose: 'Dashboard tabs/features ship complete or not at all.',
  source_scope: 'user',
  runtime_scope: 'user',
  portability: 'sanitize-then-portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  sections: [
    {
      heading: 'Rule',
      last_known_lines: '1-10',
      scope: 'universal',
      portability: 'portable',
      purpose: 'No incomplete features.',
      sanitize_fields: [],
      notes: '',
    },
    {
      heading: 'Example: SoNash Dashboard Tabs',
      last_known_lines: '12-30',
      scope: 'project',
      portability: 'not-portable',
      purpose: 'SoNash-specific dashboard illustration.',
      sanitize_fields: [],
      notes: '',
    }
  ],
  memory_type: 'feedback',
  tenet_number: null,
  has_canonical: false,
  append_only: false,
  recency_signal: null,
  canonical_staleness_category: 'fresh',
}, true);

// Positive test 4 — file with migration_metadata populated
test('pos4-file-with-migration', {
  name: 'checkpoint',
  path: '.claude/skills/checkpoint/SKILL.md',
  type: 'skill',
  purpose: 'Save session state for recovery after compaction or failures.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  migration_metadata: {
    context_skills: [],
    dropped_in_port: [],
    stripped_in_port: [],
    version_delta_from_canonical: 'v1.0 → v1.0 (in-sync)',
    port_status: 'ported',
  },
  reference_layout: 'none',
  supports_parallel: true,
  fallback_available: false,
}, true);

// Positive test 5 — composite record (now with `type: composite` per G2 fix)
test('pos5-composite', {
  name: 'deep-research-workflow',
  type: 'composite',
  purpose: 'Multi-agent research engine with dispute resolution and verification.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'sanitize-then-portable',
  status: 'active',
  notes: '',
  workflow_family: 'deep-research',
  gsd_phase: null,
  port_strategy: 'atomic',
  component_units: [
    { name: 'deep-research', path: '.claude/skills/deep-research/', role: 'orchestrator-skill' },
    { name: 'deep-research-searcher', path: '.claude/agents/deep-research-searcher.md', role: 'agent' }
  ],
  dependencies: [
    { name: 'convergence-loop', hardness: 'hard', kind: 'reference' }
  ],
  tool_deps: [
    { name: 'gemini-cli', hardness: 'soft' }
  ],
  mcp_dependencies: [
    { name: 'mcp__context7__query-docs', hardness: 'soft' }
  ],
}, true);

// Negative test 1 — missing required `name`
test('neg1-missing-name', {
  path: '.claude/skills/broken/SKILL.md',
  type: 'skill',
  purpose: 'Broken record.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
}, false);

// Negative test 2 — bad enum value for `status`
test('neg2-bad-status-enum', {
  name: 'bad',
  path: '.claude/skills/bad/SKILL.md',
  type: 'skill',
  purpose: 'Bad.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'pending', // not in the 8-value enum
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  reference_layout: 'none',
  supports_parallel: true,
  fallback_available: false,
}, false);

// Negative test 3 — skill missing required per-type extensions (after G4 fix,
// type-conditional allOf block requires reference_layout/supports_parallel/
// fallback_available to be present for type=skill)
test('neg3-skill-missing-extensions', {
  name: 'missing-ext',
  path: '.claude/skills/missing-ext/SKILL.md',
  type: 'skill',
  purpose: 'Missing skill extensions.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  // no reference_layout / supports_parallel / fallback_available
}, false);

// --- v1.3 (Piece 3 structural-fix) additions ---

// Positive test 6 — git-hook with required git_hook_event (D3.1 + D3.3)
test('pos6-git-hook', {
  name: 'pre-commit',
  path: '.husky/pre-commit',
  type: 'git-hook',
  purpose: 'Husky pre-commit gate — runs gitleaks + catalog validator.',
  source_scope: 'project',
  runtime_scope: 'project',
  portability: 'not-portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  git_hook_event: 'pre-commit',
}, true);

// Positive test 7 — test type, no required extensions (D3.1 + D4.6)
test('pos7-test', {
  name: 'smoke.test.js',
  path: '.claude/sync/label/lib/__tests__/smoke.test.js',
  type: 'test',
  purpose: 'Smoke coverage for derive.js heuristic rules.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
}, true);

// Positive test 8 — hook-lib no longer requires the 7 event fields (D2.5 split)
test('pos8-hook-lib-no-events', {
  name: 'symlink-guard',
  path: '.claude/hooks/lib/symlink-guard.js',
  type: 'hook-lib',
  purpose: 'Symlink-safety primitive for atomic writes.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  // NO event/matcher/if_condition/continue_on_error/exit_code_action/async_spawn/kill_switch_env
  // — v1.3 (D2.5) makes these NOT required for hook-lib.
}, true);

// Positive test 9 — record with optional top-level confidence object (D2.2)
test('pos9-confidence', {
  name: 'block-push-to-main',
  path: '.claude/hooks/block-push-to-main.js',
  type: 'hook',
  purpose: 'PreToolUse Bash gate blocking git push to main.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  event: 'PreToolUse',
  matcher: '^Bash$',
  if_condition: null,
  continue_on_error: false,
  exit_code_action: 'block',
  async_spawn: false,
  kill_switch_env: null,
  confidence: {
    overall: 0.95,
    type_classification: 1.0,
    portability: 0.8,
  },
}, true);

// Negative test 4 — git-hook missing required git_hook_event (D3.3 enforcement)
test('neg4-git-hook-missing-event', {
  name: 'pre-commit',
  path: '.husky/pre-commit',
  type: 'git-hook',
  purpose: 'Husky pre-commit gate.',
  source_scope: 'project',
  runtime_scope: 'project',
  portability: 'not-portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  // git_hook_event missing → must fail per D3.3
}, false);

// Negative test 5 — confidence value outside [0,1] must fail (D2.2)
test('neg5-confidence-out-of-range', {
  name: 'bad-confidence',
  path: '.claude/hooks/bad.js',
  type: 'hook',
  purpose: 'Bad confidence range.',
  source_scope: 'universal',
  runtime_scope: 'project',
  portability: 'portable',
  status: 'active',
  notes: '',
  dependencies: [],
  external_services: [],
  tool_deps: [],
  mcp_dependencies: [],
  required_secrets: [],
  event: 'PreToolUse',
  matcher: '^Bash$',
  if_condition: null,
  continue_on_error: false,
  exit_code_action: 'block',
  async_spawn: false,
  kill_switch_env: null,
  confidence: {
    overall: 1.5,   // > 1 → must fail
  },
}, false);

// Report
let pass = 0, fail = 0;
console.log('\n=== schema-v1.json validation tests ===\n');
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${r.label}  expected=${r.expected} actual=${r.actual}`);
  if (!r.ok && r.errors) {
    for (const e of r.errors.slice(0, 3)) {
      // Route Ajv error text through the repo sanitizer — paths/values in
      // error.message can leak host context per CLAUDE.md §2 / §5
      // (PR #7 R1 / Qodo QF2 compliance).
      const msg = sanitizeError(e.message || 'unknown');
      console.log(`        - ${e.instancePath || '(root)'} ${msg}`);
    }
  }
  if (r.ok) pass++; else fail++;
}

console.log(`\nTotals: ${pass} pass, ${fail} fail (of ${results.length} total)`);
process.exit(fail > 0 ? 1 : 0);
