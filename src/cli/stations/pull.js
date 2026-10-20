// @ts-check
import { clientFor } from '../_helpers.js';
import { saveStation, getStationsDir } from '../utils/station-files.js';
import { pullAllLines } from '../lines/pull.js';
import { getLinesDir } from '../utils/line-files.js';

/**
 * Convert dependency IDs to short_codes using an id→short_code map.
 * Values without a match pass through unchanged.
 */
function dependenciesToShortCodes(dependencies, id_to_short_code) {
  if (!dependencies?.length) return dependencies;
  return dependencies.map((dep) => id_to_short_code.get(dep) || dep);
}

/** Normalize a fetched station for local storage: tags → names, deps → short_codes. */
function normalizeForLocal(station, id_to_short_code) {
  if (station.tags) station.tags = station.tags.map((t) => (typeof t === 'string' ? t : t.name));
  station.dependencies = dependenciesToShortCodes(station.dependencies, id_to_short_code);
  return station;
}

/** `al-orc stations pull` — write orchestrator station definitions to `.orchestrator/stations/`. */
export async function pullStationsHandler(argv) {
  const { id, all } = argv;

  if (!id && !all) {
    console.error('Usage: al-orc stations pull <id|short_code>');
    console.error('       al-orc stations pull --all');
    console.error('');
    console.error('Run "al-orc stations list" to see available stations');
    process.exit(1);
  }

  const orc = clientFor();

  if (id) {
    console.log(`Saving to: ${getStationsDir()}/`);
    // Single station — also fetch the list for dependency resolution.
    const [station, all_stations] =await Promise.all([orc.stations.get(id), orc.stations.getAll()]);
    if (!station) {
      console.error(`Station not found: ${id}`);
      process.exit(1);
    }
    const id_to_short_code = new Map(all_stations.filter((s) => s.short_code).map((s) => [s.id, s.short_code]));
    const filepath = saveStation(normalizeForLocal(station, id_to_short_code));
    console.log(`Saved: ${filepath}`);
    return;
  }

  // All stations — lines first, so every station's `line` code resolves locally
  // (the factory session refuses to start on a station whose line file is missing).
  console.log(`Saving to: ${getLinesDir()}/`);
  const line_count = await pullAllLines(orc);
  console.log(`Total: ${line_count} lines pulled`);
  console.log('');
  console.log(`Saving to: ${getStationsDir()}/`);

  const stations = await orc.stations.getAll();
  if (stations.length === 0) {
    console.log('No stations found');
    return;
  }
  const id_to_short_code = new Map(stations.filter((s) => s.short_code).map((s) => [s.id, s.short_code]));

  for (const summary of stations) {
    // Fetch full details (the list may omit fields).
    const full = await orc.stations.get(summary.id);
    const filepath = saveStation(normalizeForLocal(full, id_to_short_code));
    console.log(`Saved: ${filepath}`);
  }
  console.log('');
  console.log(`Total: ${stations.length} stations pulled`);
}
