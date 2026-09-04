import { clientFor } from '../_helpers.js';
import { listAllLineFiles, loadLineByFilename, findLineFile, saveLine, getLinesDir } from '../utils/line-files.js';

/**
 * Push one line file — create (no `id`) or update (has `id`). On create the
 * file is rewritten with the server-assigned id.
 */
async function pushLineFile(orc, filepath) {
  const line = loadLineByFilename(filepath);
  if (!line) {
    console.error(`Line file not found: ${filepath}`);
    process.exit(1);
  }
  if (!line.code || !line.location) {
    throw new Error(`${filepath}: a line file needs at least "code" and "location"`);
  }

  const { id, stations, created_at, archived_at, ...data } = line;

  if (!id) {
    const created = await orc.lines.create(data);
    console.log(`Created: ${created.id} -> ${saveLine(created)}`);
    return { created: true };
  }

  const updated = await orc.lines.update(id, data);
  console.log(`Updated: ${updated.code} (${id})`);
  return { created: false };
}

/**
 * Push every local line file. Shared with `stations push --all`, which pushes
 * lines first so a new station's `line` code already exists server-side.
 * @returns {Promise<{ created: number, updated: number }>}
 */
export async function pushAllLines(orc) {
  const totals = { created: 0, updated: 0 };
  for (const filepath of listAllLineFiles()) {
    const { created } = await pushLineFile(orc, filepath);
    if (created) totals.created++;
    else totals.updated++;
  }
  return totals;
}

/** `fob-orc lines push` — create/update orchestrator lines from local files. */
export async function pushLinesHandler(argv) {
  const { id, all } = argv;

  if (!id && !all) {
    console.error('Usage: fob-orc lines push <filename|code|id>');
    console.error('       fob-orc lines push --all');
    process.exit(1);
  }

  const orc = clientFor();
  console.log(`Reading from: ${getLinesDir()}/`);

  if (id) {
    const filepath = id.endsWith('.json') ? id : findLineFile(id);
    if (!filepath) {
      console.error(`line not found locally: ${id}`);
      console.error('Use a filename (e.g. VM.json) or a line code/ID');
      process.exit(1);
    }
    await pushLineFile(orc, filepath);
    return;
  }

  if (listAllLineFiles().length === 0) {
    console.log('No local lines found');
    console.log('Run "fob-orc lines pull --all" first, or create a line file in .orchestrator/lines/');
    return;
  }

  const { created, updated } = await pushAllLines(orc);
  console.log('');
  const parts = [];
  if (updated > 0) parts.push(`${updated} updated`);
  if (created > 0) parts.push(`${created} created`);
  console.log(`Total: ${parts.join(', ')}`);
}
