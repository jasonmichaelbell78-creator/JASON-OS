#!/usr/bin/env node
// Auto-generate enums.json from schema-v1.json (Piece 3 structural-fix D3.5).
// Values live in the schema; descriptions + decision refs live here.
// Exit 0 on success; 1 on drift-detected when --check is passed; 2 on I/O error.

const fs = require('node:fs');
const path = require('node:path');

const { sanitizeError } = require('../../../scripts/lib/sanitize-error.cjs');

const SCHEMA_DIR = __dirname;
const SCHEMA_PATH = path.join(SCHEMA_DIR, 'schema-v1.json');
const OUT_PATH = path.join(SCHEMA_DIR, 'enums.json');

const SCHEMA_VERSION = '1.3';

// Output-key → {source definition in schema, human-facing metadata}.
// `source` names the schema `definitions.<source>.enum` array. Multiple
// output keys may alias the same schema definition (source_scope +
// runtime_scope both alias enum_scope).
const METADATA = {
  type: {
    source: 'enum_type',
    description: 'File-kind classification for every record in the sync registry.',
    decision_ref: 'D15; Piece 3 structural-fix D3.1 (git-hook, test)',
  },
  source_scope: {
    source: 'enum_scope',
    description: "Where the file's code/definition belongs.",
    decision_ref: 'D20',
  },
  runtime_scope: {
    source: 'enum_scope',
    description: "Where the file's runtime effects land (same enum as source_scope).",
    decision_ref: 'D20',
  },
  portability: {
    source: 'enum_portability',
    description: 'What the sync tool does with this file when crossing repos.',
    decision_ref: 'D21',
  },
  status: {
    source: 'enum_status',
    description:
      'Lifecycle state of the file. `partial` is a transient Piece 3 state (added in v1.1) for records whose async understanding-field fill is still in flight — valid in the live catalog, rejected at commit time by the pre-commit validator.',
    decision_ref: 'D22; Piece 3 D11',
  },
  hook_event: {
    source: 'enum_hook_event',
    description: 'Claude Code event that fires a hook.',
    decision_ref: 'Group P3',
  },
  git_hook_event: {
    source: 'enum_git_hook_event',
    description:
      'Git-native hook trigger (distinct namespace from Claude Code hook events). Paired with type=git-hook per Piece 3 structural-fix D3.3.',
    decision_ref: 'Piece 3 structural-fix D3.3',
  },
  dependency_hardness: {
    source: 'enum_dependency_hardness',
    description: 'Whether a dependency is strictly required or optional.',
    decision_ref: 'D23',
  },
  dependency_kind: {
    source: 'enum_dependency_kind',
    description: 'How one file depends on another file in the registry.',
    decision_ref: 'D23',
  },
  state_file_access: {
    source: 'enum_state_file_access',
    description: 'Access mode for a state-file path used by a file.',
    decision_ref: 'D28',
  },
  data_contract_role: {
    source: 'enum_data_contract_role',
    description: 'What a file does with respect to a given data contract.',
    decision_ref: 'D30',
  },
  agent_runtime_lifecycle: {
    source: 'enum_agent_runtime_lifecycle',
    description: 'How long an agent instance persists at runtime.',
    decision_ref: 'Group P2',
  },
  reference_layout: {
    source: 'enum_reference_layout',
    description: "Layout convention for a skill's companion reference docs.",
    decision_ref: 'Group P1',
  },
  memory_type: {
    source: 'enum_memory_type',
    description: 'Category of a memory or canonical-memory file.',
    decision_ref: 'Group P4',
  },
  canonical_staleness_category: {
    source: 'enum_canonical_staleness_category',
    description: 'Drift state of a canonical-memory file versus its user-home counterpart.',
    decision_ref: 'Group P4',
  },
  module_system: {
    source: 'enum_module_system',
    description: 'JavaScript module system used by a script (cannot be inferred from extension alone).',
    decision_ref: 'Group P5 scripts',
  },
  tool_language: {
    source: 'enum_tool_language',
    description: 'Primary language of a tool or tool-file.',
    decision_ref: 'Group P5 tools',
  },
  session_type: {
    source: 'enum_session_type',
    description: 'Kind of research-session directory.',
    decision_ref: 'Group P6',
  },
  research_depth: {
    source: 'enum_research_depth',
    description: 'Depth tier of a research session.',
    decision_ref: 'Group P6',
  },
  plan_scope: {
    source: 'enum_plan_scope',
    description: 'Scope/kind of a plan or planning-artifact document.',
    decision_ref: 'Group P6',
  },
  exit_code_action: {
    source: 'enum_exit_code_action',
    description: "What a hook's exit code signals to Claude Code (distinct from continue_on_error).",
    decision_ref: 'Group P3',
  },
  port_strategy: {
    source: 'enum_port_strategy',
    description: 'Whether all components of a composite must travel together or partial ports are acceptable.',
    decision_ref: 'D31',
  },
  port_status: {
    source: 'enum_port_status',
    description: 'Cross-repo port state of a file at last migration.',
    decision_ref: 'D32',
  },
};

function loadSchema() {
  try {
    const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL: could not read/parse schema-v1.json: ${sanitizeError(err)}`);
    process.exit(2);
  }
}

function build(schema) {
  const definitions = schema.definitions || {};
  const out = {
    schema_version: SCHEMA_VERSION,
    $comment: 'AUTO-GENERATED from schema-v1.json by build-enums.js. Do not edit by hand — run `node .claude/sync/schema/build-enums.js` after any schema enum change.',
    enums: {},
  };

  const schemaEnumKeys = new Set(
    Object.keys(definitions).filter((k) => k.startsWith('enum_'))
  );
  const metadataSources = new Set(Object.values(METADATA).map((m) => m.source));

  for (const key of schemaEnumKeys) {
    if (!metadataSources.has(key)) {
      console.error(
        `FAIL: schema defines ${key} but no METADATA entry in build-enums.js references it. Add an entry to METADATA or drop the definition.`
      );
      process.exit(2);
    }
  }
  for (const [outKey, meta] of Object.entries(METADATA)) {
    if (!schemaEnumKeys.has(meta.source)) {
      console.error(
        `FAIL: METADATA references schema definition ${meta.source} (for output key ${outKey}) but schema has no such enum_*. Check spelling or remove METADATA entry.`
      );
      process.exit(2);
    }
  }

  for (const [outKey, meta] of Object.entries(METADATA)) {
    const def = definitions[meta.source];
    const values = Array.isArray(def.enum) ? def.enum.slice() : null;
    if (!values) {
      console.error(`FAIL: schema definition ${meta.source} has no .enum array.`);
      process.exit(2);
    }
    out.enums[outKey] = {
      values,
      description: meta.description,
      decision_ref: meta.decision_ref,
    };
  }

  return out;
}

function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const schema = loadSchema();
  const generated = build(schema);
  const generatedText = JSON.stringify(generated, null, 2) + '\n';

  if (checkMode) {
    let existing;
    try {
      existing = fs.readFileSync(OUT_PATH, 'utf-8');
    } catch (err) {
      console.error(`FAIL: --check mode: could not read existing enums.json: ${sanitizeError(err)}`);
      process.exit(2);
    }
    if (existing !== generatedText) {
      console.error(
        'FAIL: enums.json is out of sync with schema-v1.json. Run `node .claude/sync/schema/build-enums.js` and commit the result.'
      );
      process.exit(1);
    }
    console.log('OK: enums.json matches schema-v1.json.');
    process.exit(0);
  }

  try {
    fs.writeFileSync(OUT_PATH, generatedText);
  } catch (err) {
    console.error(`FAIL: could not write enums.json: ${sanitizeError(err)}`);
    process.exit(2);
  }
  console.log(`Wrote ${OUT_PATH} (${Object.keys(generated.enums).length} enum keys, schema_version ${SCHEMA_VERSION}).`);
}

main();
