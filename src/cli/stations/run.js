import { clientFor } from '../_helpers.js';
import { loadStation, loadStationScenario, listStationScenarios } from '../utils/station-files.js';

// yargs auto-fills these on every argv; everything else is a candidate override.
const YARGS_KEYS = new Set(['_', '$0', 'help', 'version', 'h', 'v', 'profile', 'org']);
// Flags this command owns explicitly — not treated as step overrides.
const COMMAND_KEYS = new Set(['id', 'scenario', 'json']);

/**
 * Build the merged step-override map: a local scenario file (if any) applied
 * first, then direct CLI flags (which win on conflict). Any flag that isn't a
 * reserved/known key becomes a per-run override, shallow-merged into every
 * step's config server-side.
 */
function buildStepOverrides(argv, station) {
  const overrides = {};
  const fromScenario = [];
  const fromCli = [];

  if (argv.scenario) {
    const shortCode = station?.short_code || station?.id || argv.id;
    const scenario = loadStationScenario(shortCode, argv.scenario);
    if (scenario === null) {
      const available = listStationScenarios(shortCode);
      const hint = available.length
        ? `Available scenarios for ${shortCode}: ${available.join(', ')}`
        : `No scenarios defined under .orchestrator/scenarios/stations/${shortCode}/`;
      throw new Error(`Scenario not found: ${argv.scenario}\n${hint}`);
    }
    for (const [k, v] of Object.entries(scenario)) {
      overrides[k] = v;
      fromScenario.push(k);
    }
  }

  for (const [k, v] of Object.entries(argv)) {
    if (YARGS_KEYS.has(k) || COMMAND_KEYS.has(k)) continue;
    if (k.includes('-')) continue; // skip kebab dupes; underscore form is canonical
    overrides[k] = v;
    fromCli.push(k);
  }

  return { overrides, fromScenario, fromCli };
}

function formatOverridesLine(overrides, fromScenario, fromCli, scenarioName) {
  return Object.entries(overrides)
    .map(([k, v]) => {
      const sources = [];
      if (fromScenario.includes(k)) sources.push(`scenario ${scenarioName}`);
      if (fromCli.includes(k)) sources.push('CLI');
      return `${k}=${JSON.stringify(v)} (${sources.join(' + ')})`;
    })
    .join(', ');
}

/** `al-orc stations run <id>` — trigger an orchestrator run; returns a work record id. */
export async function runStationHandler(argv) {
  const { id, scenario, json } = argv;

  // A local station file is only needed to resolve short_code for scenario lookup.
  const station = loadStation(id);
  if (!station && scenario) {
    console.error(`Error: --scenario requires a local station definition for ${id}.`);
    console.error(`Run "al-orc stations pull ${id}" first.`);
    process.exit(1);
  }

  const { overrides, fromScenario, fromCli } = buildStepOverrides(argv, station);
  const hasOverrides = Object.keys(overrides).length > 0;

  const orc = clientFor();
  const result = await orc.stations.run(id, { overrides: hasOverrides ? overrides : undefined });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (hasOverrides) {
    console.log(`Overrides:   ${formatOverridesLine(overrides, fromScenario, fromCli, scenario)}`);
  }
  console.log(`Triggered:   ${id}`);
  console.log(`Work Record: ${result?.work_record_id ?? '—'}`);
  console.log('');
  console.log(`Use \`al-orc work-records show ${result?.work_record_id ?? '<id>'}\` to check status.`);
}
