/**
 * Local station + station-scenario file cache — the bridge between the
 * orchestrator (remote truth) and the working tree.
 *
 * Station files live in:  .orchestrator/stations/<short_code>__<name>.json
 * Station scenarios in:   .orchestrator/scenarios/stations/<short_code>/<name>.json
 *
 * Line membership is encoded by the `line` field inside each JSON, not by folder
 * hierarchy. (Ported from cli-fob for the al-orc pull/push/run bridges; the
 * step scenarios live in lib-factory's `factory` command.)
 */

import fs from 'node:fs';
import path from 'node:path';

const STATIONS_DIR = '.orchestrator/stations';
const SCENARIOS_DIR = '.orchestrator/scenarios';

/** All station JSON file paths under `.orchestrator/stations/`. */
function getAllStationFilePaths() {
  if (!fs.existsSync(STATIONS_DIR)) return [];
  const paths = [];
  for (const f of fs.readdirSync(STATIONS_DIR)) {
    if (f.endsWith('.json')) paths.push(path.join(STATIONS_DIR, f));
  }
  return paths;
}

/** "Update Rules" → "update_rules" */
function nameToSnakeCase(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Filename: short_code (or id) prefix + snake_case name. */
function buildFilename(station) {
  const snakeName = nameToSnakeCase(station.name || 'unnamed');
  const prefix = station.short_code || station.id;
  return `${prefix}__${snakeName}.json`;
}

/** Find a station file by ID or short_code (filename prefix, then JSON `id`). */
export function findStationFile(identifier) {
  const all = getAllStationFilePaths();
  for (const p of all) {
    if (path.basename(p).startsWith(`${identifier}__`)) return p;
  }
  for (const p of all) {
    try {
      if (JSON.parse(fs.readFileSync(p, 'utf8')).id === identifier) return p;
    } catch {
      // skip malformed files
    }
  }
  return null;
}

/** Save a station locally, removing any existing file(s) for it first. */
export function saveStation(station) {
  const toRemove = new Set();
  const existingById = findStationFile(station.id);
  if (existingById) toRemove.add(existingById);
  if (station.short_code) {
    const existingByCode = findStationFile(station.short_code);
    if (existingByCode) toRemove.add(existingByCode);
  }
  for (const f of toRemove) fs.unlinkSync(f);

  if (!fs.existsSync(STATIONS_DIR)) fs.mkdirSync(STATIONS_DIR, { recursive: true });

  const filepath = path.join(STATIONS_DIR, buildFilename(station));
  fs.writeFileSync(filepath, JSON.stringify(station, null, 2));
  return filepath;
}

/** Load a station file by ID or short_code. */
export function loadStation(identifier) {
  const filepath = findStationFile(identifier);
  return filepath ? JSON.parse(fs.readFileSync(filepath, 'utf8')) : null;
}

/** All station JSON file paths. */
export function listAllStationFiles() {
  return getAllStationFilePaths();
}

/** IDs from every local station file that carries one. */
export function listLocalStationIds() {
  const ids = [];
  for (const p of getAllStationFilePaths()) {
    try {
      const content = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (content.id) ids.push(content.id);
    } catch {
      // skip malformed files
    }
  }
  return ids;
}

/** Load a station from a bare filename or a relative path. */
export function loadStationByFilename(arg) {
  if (arg.includes(path.sep) || arg.includes('/')) {
    return fs.existsSync(arg) ? JSON.parse(fs.readFileSync(arg, 'utf8')) : null;
  }
  for (const filepath of getAllStationFilePaths()) {
    if (path.basename(filepath) === arg) return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return null;
}

/** Write the server-assigned id into a new station file and rename to standard form. */
export function finalizeNewStationFile(originalArg, station) {
  let originalPath;
  if (originalArg.includes(path.sep) || originalArg.includes('/')) {
    originalPath = originalArg;
  } else {
    originalPath =
      getAllStationFilePaths().find((p) => path.basename(p) === originalArg) ||
      path.join(STATIONS_DIR, originalArg);
  }
  if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
  if (!fs.existsSync(STATIONS_DIR)) fs.mkdirSync(STATIONS_DIR, { recursive: true });

  const newPath = path.join(STATIONS_DIR, buildFilename(station));
  fs.writeFileSync(newPath, JSON.stringify(station, null, 2));
  return newPath;
}

/** Path of the local stations directory (shown in pull/push output). */
export function getStationsDir() {
  return STATIONS_DIR;
}

// --- Station scenarios (flat key→value override maps applied to a whole run) ---

function getScenarioDirForStation(stationShortCode) {
  return path.join(SCENARIOS_DIR, 'stations', stationShortCode);
}

/** Scenario names available for a station (without .json). */
export function listStationScenarios(stationShortCode) {
  const dir = getScenarioDirForStation(stationShortCode);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
}

/** Load a station scenario (flat key→value map), or null. */
export function loadStationScenario(stationShortCode, scenarioName) {
  const filepath = path.join(getScenarioDirForStation(stationShortCode), `${scenarioName}.json`);
  return fs.existsSync(filepath) ? JSON.parse(fs.readFileSync(filepath, 'utf8')) : null;
}
