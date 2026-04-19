#!/usr/bin/env node
// Validation harness for schema-v1.json (Step 7 of Piece 2 PLAN.md).
// Tests representative positive + negative records against the schema.
// Exit 0 on all-pass, 1 on any failure.

const fs = require('node:fs');
const path = require('node:path');

let Ajv;
try {
  Ajv = require('ajv');
} catch {
  console.error('FAIL: ajv not installed. Run `npm install ajv` in repo root.');
  process.exit(2);
}

const SCHEMA_DIR = __dirname;
const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'schema-v1.json'), 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const results = [];

function test(label, record, shouldPass) {
  const valid = validate(record);
  const pass = valid === shouldPass;
  results.push({ label, expected: shouldPass ? 'pass' : 'fail', actual: valid ? 'pass' : 'fail', ok: pass, errors: valid ? null : validate.errors });
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

// Positive test 5 — composite record (now with dep fields post-H3 fix)
test('pos5-composite', {
  name: 'deep-research-workflow',
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
  reference_layout: 'none',
  supports_parallel: true,
  fallback_available: false,
}, false);

// Negative test 3 — skill missing required per-type extensions
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
  // no reference_layout / supports_parallel / fallback_available
}, false);

// Report
let pass = 0, fail = 0;
console.log('\n=== schema-v1.json validation tests ===\n');
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${r.label}  expected=${r.expected} actual=${r.actual}`);
  if (!r.ok && r.errors) {
    for (const e of r.errors.slice(0, 3)) {
      console.log(`        - ${e.instancePath || '(root)'} ${e.message}`);
    }
  }
  if (r.ok) pass++; else fail++;
}

console.log(`\nTotals: ${pass} pass, ${fail} fail (of ${results.length} total)`);
process.exit(fail > 0 ? 1 : 0);
