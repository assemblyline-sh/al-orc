/**
 * Local line file cache — `.orchestrator/lines/<CODE>.json`, one per line.
 *
 * A line file carries what the factory needs to route (`code`, `location`) and
 * what people need to recognise it (`name`, `description`). Station files
 * reference their line by `code`; `@assemblyline/lib-factory` joins the two to decide
 * which stations this factory session serves.
 */

import fs from 'node:fs';
import path from 'node:path';

const LINES_DIR = '.orchestrator/lines';

/** Fields worth persisting locally, in a stable order. */
const LOCAL_FIELDS = ['id', 'code', 'name', 'description', 'location'];

/** Path of the local lines directory (shown in pull/push output). */
export function getLinesDir() {
  return LINES_DIR;
}

/** All line JSON file paths under `.orchestrator/lines/`. */
export function listAllLineFiles() {
  if (!fs.existsSync(LINES_DIR)) return [];
  return fs
    .readdirSync(LINES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(LINES_DIR, f));
}

/** Every local line, parsed. Malformed files are skipped. */
export function listLocalLines() {
  const lines = [];
  for (const filepath of listAllLineFiles()) {
    try {
      lines.push({ filepath, data: JSON.parse(fs.readFileSync(filepath, 'utf8')) });
    } catch {
      // skip malformed files
    }
  }
  return lines;
}

/** Find a line file by code or id. */
export function findLineFile(identifier) {
  const direct = path.join(LINES_DIR, `${identifier}.json`);
  if (fs.existsSync(direct)) return direct;
  for (const { filepath, data } of listLocalLines()) {
    if (data.id === identifier || data.code === identifier) return filepath;
  }
  return null;
}

/** Load a line file by code or id. */
export function loadLine(identifier) {
  const filepath = findLineFile(identifier);
  return filepath ? JSON.parse(fs.readFileSync(filepath, 'utf8')) : null;
}

/** Load a line from a bare filename or a relative path. */
export function loadLineByFilename(arg) {
  const filepath = arg.includes('/') || arg.includes(path.sep) ? arg : path.join(LINES_DIR, arg);
  return fs.existsSync(filepath) ? JSON.parse(fs.readFileSync(filepath, 'utf8')) : null;
}

/**
 * Save a line locally as `<code>.json`, removing any stale file for the same
 * line (a renamed code leaves its old filename behind otherwise).
 */
export function saveLine(line) {
  if (!fs.existsSync(LINES_DIR)) fs.mkdirSync(LINES_DIR, { recursive: true });

  const stale = findLineFile(line.id);
  const filepath = path.join(LINES_DIR, `${line.code}.json`);
  if (stale && stale !== filepath) fs.unlinkSync(stale);

  const local = {};
  for (const field of LOCAL_FIELDS) {
    if (line[field] !== undefined) local[field] = line[field];
  }
  fs.writeFileSync(filepath, JSON.stringify(local, null, 2));
  return filepath;
}
