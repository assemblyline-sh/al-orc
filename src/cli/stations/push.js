// @ts-check
import { clientFor } from '../_helpers.js';
import {
  loadStation,
  listLocalStationIds,
  listAllStationFiles,
  loadStationByFilename,
  finalizeNewStationFile,
  findStationFile,
  getStationsDir,
} from '../utils/station-files.js';
import { pushAllLines } from '../lines/push.js';
import { listAllLineFiles } from '../utils/line-files.js';

/**
 * Build a short_code → ID map from remote stations (once per push session),
 * falling back to local files if the fetch fails. Cached on `cache`.
 */
async function getShortCodeMap(orc, cache) {
  if (cache.map) return cache.map;
  cache.map = new Map();
  try {
    for (const s of await orc.stations.getAll()) {
      if (s.short_code) cache.map.set(s.short_code, s.id);
    }
  } catch {
    for (const id of listLocalStationIds()) {
      const station = loadStation(id);
      if (station?.short_code) cache.map.set(station.short_code, station.id);
    }
  }
  return cache.map;
}

/** Resolve short_codes in a dependencies array to database IDs (unknown values pass through). */
async function resolveDependencies(orc, cache, dependencies) {
  if (!dependencies?.length) return dependencies;
  const map = await getShortCodeMap(orc, cache);
  const resolved = dependencies.map((dep) => map.get(dep) || dep);
  const changed = dependencies.filter((dep, i) => dep !== resolved[i]);
  if (changed.length > 0) {
    console.log(`  Dependencies resolved: ${changed.map((dep) => `${dep} -> ${map.get(dep)}`).join(', ')}`);
  }
  return resolved;
}

/** Map tag names → ids, creating any that don't exist. Returns { ids, created }. */
async function resolveTagNamesCreating(orc, names) {
  const { data = [] } = await orc.tags.list();
  const by_name = new Map(data.map((t) => [t.name, t.id]));
  const ids = [];
  const created = [];
  for (const name of names) {
    let id = by_name.get(name);
    if (!id) {
      const tag = await orc.tags.create({ name });
      id = tag.id;
      by_name.set(name, id);
      created.push(name);
    }
    ids.push(id);
  }
  return { ids, created };
}

/**
 * Sync tags after push. `undefined` = leave untouched; `[]` = clear all;
 * otherwise resolve (auto-creating missing) and replace.
 */
async function syncTags(orc, station_id, tags) {
  if (tags === undefined) return;
  if (tags.length === 0) {
    await orc.stations.setTags(station_id, []);
    console.log('  Tags cleared');
    return;
  }
  const { ids, created } = await resolveTagNamesCreating(orc, tags);
  await orc.stations.setTags(station_id, ids);
  if (created.length > 0) console.log(`  Auto-created tags: ${created.join(', ')}`);
  console.log(`  Tags synced: ${tags.join(', ')}`);
}

/**
 * Push one station file — create (no `id`) or update (has `id`). With `force`, a
 * 404 on update falls back to create-with-same-id (promoting across environments).
 */
async function pushByFilename(orc, cache, filename, { force = false } = {}) {
  const station = loadStationByFilename(filename);
  if (!station) {
    console.error(`Station file not found: ${filename}`);
    process.exit(1);
  }

  // `location` moved to the line (orchestrator D3); the API rejects it on a
  // station. Drop it here so an un-repulled file still pushes, and say so.
  if (station.location !== undefined) {
    console.log(`  Ignoring "location" in ${filename} — location now lives on line "${station.line}" (.orchestrator/lines/)`);
    delete station.location;
  }
  if (!station.line) {
    throw new Error(`${filename}: station has no "line". Every station is on a line; add "line": "<CODE>" and push the line file first.`);
  }

  if (!station.id) {
    const { created_at, org, tags, ...createData } = station;
    createData.dependencies = await resolveDependencies(orc, cache, createData.dependencies);
    const created = await orc.stations.create(createData);
    const newPath = finalizeNewStationFile(filename, created);
    console.log(`Created: ${created.id} -> ${newPath}`);
    await syncTags(orc, created.id, tags);
    return;
  }

  const { id, created_at, org, tags, ...updateData } = station;
  updateData.dependencies = await resolveDependencies(orc, cache, updateData.dependencies);

  try {
    await orc.stations.update(id, updateData);
    console.log(`Updated: ${id}`);
    await syncTags(orc, id, tags);
  } catch (err) {
    if (err.status !== 404) throw err;
    if (!force) {
      const label = station.short_code ? `station "${station.short_code}" (id: ${id})` : `station with id "${id}"`;
      throw new Error(
        `${label} does not exist in the orchestrator. Re-run with --force to create it remotely with this id ` +
          `(use this when promoting a config from one environment to another).`,
      );
    }
    console.log(`  Not visible to this org (${id}), creating with --force...`);
    let created;
    try {
      created = await orc.stations.create({ id, ...updateData });
    } catch (createErr) {
      if (createErr.status === 409) {
        const label = station.short_code ? `station "${station.short_code}"` : 'station';
        throw new Error(
          `Cannot create ${label} with id "${id}" — that id is already used by another org in the orchestrator ` +
            `(ids are globally unique across the multi-tenant database). Either change the id in the local file to a ` +
            `different alphanumeric (1-24 chars), or remove the "id" field entirely to let the orchestrator generate ` +
            `a fresh one — the file will be rewritten with the new id after push.`,
        );
      }
      throw createErr;
    }
    const newPath = finalizeNewStationFile(filename, created);
    console.log(`Created: ${created.id} -> ${newPath}`);
    await syncTags(orc, created.id, tags);
  }
}

/** `al-orc stations push` — create/update orchestrator stations from local files. */
export async function pushStationsHandler(argv) {
  const { id, all, force } = argv;

  if (!id && !all) {
    console.error('Usage: al-orc stations push <filename>      (create or update based on content)');
    console.error('       al-orc stations push <id|short_code>  (update by station ID or short_code)');
    console.error('       al-orc stations push --all');
    console.error('');
    console.error('Run "al-orc stations list" to see available stations');
    process.exit(1);
  }

  const orc = clientFor();
  const cache = {};
  console.log(`Reading from: ${getStationsDir()}/`);

  if (id) {
    const filename = id.endsWith('.json') ? id : `${id}.json`;
    if (loadStationByFilename(filename)) {
      await pushByFilename(orc, cache, filename, { force });
    } else {
      const filepath = findStationFile(id);
      if (!filepath) {
        console.error(`station not found locally: ${id}`);
        console.error('Use a filename (e.g. AP1__document_intake.json) or a station ID/short_code');
        process.exit(1);
      }
      await pushByFilename(orc, cache, filepath, { force });
    }
    return;
  }

  // Lines first: a new station's `line` code must already exist server-side.
  if (listAllLineFiles().length > 0) {
    const { created, updated } = await pushAllLines(orc);
    console.log(`Lines: ${updated} updated, ${created} created`);
    console.log('');
  }

  const allPaths = listAllStationFiles();
  if (allPaths.length === 0) {
    console.log('No local stations found');
    console.log('Run "al-orc stations pull --all" first, or create a new station file');
    return;
  }

  let updatedCount = 0;
  let createdCount = 0;
  for (const filepath of allPaths) {
    const has_id =!!loadStationByFilename(filepath).id;
    await pushByFilename(orc, cache, filepath, { force });
    if (has_id)updatedCount++;
    else createdCount++;
  }

  console.log('');
  const parts = [];
  if (updatedCount > 0) parts.push(`${updatedCount} updated`);
  if (createdCount > 0) parts.push(`${createdCount} created`);
  console.log(`Total: ${parts.join(', ')}`);
}
