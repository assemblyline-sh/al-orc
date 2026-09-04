import { clientFor } from '../_helpers.js';
import { saveLine, getLinesDir } from '../utils/line-files.js';

/**
 * Write every line to `.orchestrator/lines/`. Shared with `stations pull --all`,
 * which pulls lines first so a worker never has station files whose line it
 * cannot resolve.
 * @returns {Promise<number>} lines written
 */
export async function pullAllLines(orc) {
  const lines = await orc.lines.getAll({ include_archived: true });
  for (const line of lines) {
    console.log(`Saved: ${saveLine(line)}`);
  }
  return lines.length;
}

/** `fob-orc lines pull` — write orchestrator line definitions to `.orchestrator/lines/`. */
export async function pullLinesHandler(argv) {
  const { id, all } = argv;

  if (!id && !all) {
    console.error('Usage: fob-orc lines pull <code|id>');
    console.error('       fob-orc lines pull --all');
    console.error('');
    console.error('Run "fob-orc lines list" to see available lines');
    process.exit(1);
  }

  const orc = clientFor();
  console.log(`Saving to: ${getLinesDir()}/`);

  if (id) {
    const line = await orc.lines.get(id);
    if (!line) {
      console.error(`Line not found: ${id}`);
      process.exit(1);
    }
    console.log(`Saved: ${saveLine(line)}`);
    return;
  }

  const count = await pullAllLines(orc);
  console.log('');
  console.log(`Total: ${count} lines pulled`);
}
