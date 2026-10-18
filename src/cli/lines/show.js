import { clientFor } from '../_helpers.js';
import { formatHeader, formatField, formatTable, formatSection } from '../utils/format.js';

/** `al-orc lines show <code|id>` — one line's definition and its stations. */
export async function showLineHandler(argv) {
  const { id, json } = argv;

  const orc = clientFor();
  const line = await orc.lines.get(id);

  if (json) {
    console.log(JSON.stringify(line, null, 2));
    return;
  }

  if (!line) {
    console.error(`Line not found: ${id}`);
    process.exit(1);
  }

  console.log(formatHeader('Line', line.code));
  const lw = 14;
  console.log(formatField('Name', line.name, lw));
  console.log(formatField('ID', line.id, lw));
  console.log(formatField('Location', line.location, lw));
  if (line.description) console.log(formatField('Description', line.description, lw));
  if (line.archived_at) console.log(formatField('Archived', line.archived_at, lw));

  const stations = line.stations || [];
  console.log(formatSection(`Stations (${stations.length})`));
  if (stations.length === 0) {
    console.log('  (none — push station files with "line": "' + line.code + '")');
    return;
  }
  console.log(formatTable(['CODE', 'ID', 'NAME'], stations.map((s) => [s.short_code || '—', s.id, s.name || '—'])));
}
