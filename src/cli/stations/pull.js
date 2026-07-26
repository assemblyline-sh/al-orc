import { clientFor } from '../_helpers.js';
import { saveStation, getStationsDir } from '../utils/station-files.js';

/**
 * Convert dependency IDs to short_codes using an id→short_code map.
 * Values without a match pass through unchanged.
 */
function dependenciesToShortCodes(dependencies, idToShortCode) {
  if (!dependencies?.length) return dependencies;
  return dependencies.map((dep) => idToShortCode.get(dep) || dep);
}

/** Normalize a fetched station for local storage: tags → names, deps → short_codes. */
function normalizeForLocal(station, idToShortCode) {
  if (station.tags) station.tags = station.tags.map((t) => (typeof t === 'string' ? t : t.name));
  station.dependencies = dependenciesToShortCodes(station.dependencies, idToShortCode);
  return station;
}

/** `fob-orc stations pull` — write orchestrator station definitions to `.orchestrator/stations/`. */
export async function pullStationsHandler(argv) {
  const { id, all } = argv;

  if (!id && !all) {
    console.error('Usage: fob-orc stations pull <id|short_code>');
    console.error('       fob-orc stations pull --all');
    console.error('');
    console.error('Run "fob-orc stations list" to see available stations');
    process.exit(1);
  }

  const orc = clientFor();
  console.log(`Saving to: ${getStationsDir()}/`);

  if (id) {
    // Single station — also fetch the list for dependency resolution.
    const [station, allStations] = await Promise.all([orc.stations.get(id), orc.stations.getAll()]);
    if (!station) {
      console.error(`Station not found: ${id}`);
      process.exit(1);
    }
    const idToShortCode = new Map(allStations.filter((s) => s.short_code).map((s) => [s.id, s.short_code]));
    const filepath = saveStation(normalizeForLocal(station, idToShortCode));
    console.log(`Saved: ${filepath}`);
    return;
  }

  // All stations.
  const stations = await orc.stations.getAll();
  if (stations.length === 0) {
    console.log('No stations found');
    return;
  }
  const idToShortCode = new Map(stations.filter((s) => s.short_code).map((s) => [s.id, s.short_code]));

  for (const summary of stations) {
    // Fetch full details (the list may omit fields).
    const full = await orc.stations.get(summary.id);
    const filepath = saveStation(normalizeForLocal(full, idToShortCode));
    console.log(`Saved: ${filepath}`);
  }
  console.log('');
  console.log(`Total: ${stations.length} stations pulled`);
}
