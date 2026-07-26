import { clientFor } from '../_helpers.js';

// yargs auto-fills these on every argv; everything else is a candidate override.
const YARGS_KEYS = new Set(['_', '$0', 'help', 'version', 'h', 'v', 'profile', 'org']);
// Flags this command owns explicitly — not treated as step overrides.
const COMMAND_KEYS = new Set(['id', 'item', 'json']);

/**
 * Build the step-override map from direct CLI flags. Any flag that isn't a
 * reserved/known key becomes a per-run override, shallow-merged into every
 * step's config server-side.
 *
 * (Scenario-file overrides — `--scenario` reading `.orchestrator/scenarios/` —
 *  arrive with the pull/push bridge work, which brings the local station-file util.)
 */
function buildStepOverrides(argv) {
  const overrides = {};
  for (const [k, v] of Object.entries(argv)) {
    if (YARGS_KEYS.has(k) || COMMAND_KEYS.has(k)) continue;
    if (k.includes('-')) continue; // skip kebab dupes; underscore form is canonical
    overrides[k] = v;
  }
  return overrides;
}

/** `fob-orc stations run <id>` — trigger an orchestrator run; returns a work record id. */
export async function runStationHandler(argv) {
  const { id, item, json } = argv;
  const overrides = buildStepOverrides(argv);
  const hasOverrides = Object.keys(overrides).length > 0;

  const orc = clientFor();
  const result = await orc.stations.run(id, { item, overrides: hasOverrides ? overrides : undefined });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (hasOverrides) {
    const line = Object.entries(overrides).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
    console.log(`Overrides:   ${line}`);
  }
  console.log(`Triggered:   ${id}`);
  console.log(`Work Record: ${result?.work_record_id ?? '—'}`);
  console.log('');
  console.log(`Use \`fob-orc work-records show ${result?.work_record_id ?? '<id>'}\` to check status.`);
}
