import { clientFor } from '../_helpers.js';
import { formatTable } from '../utils/format.js';

/** `al-orc stations list` — canonical station definitions from the orchestrator. */
export async function listStationsHandler(argv) {
  const { tag, line, json, includeArchived } = argv || {};

  const orc = clientFor();
  const { data } = await orc.stations.list({ tag, line, include_archived: includeArchived });
  const stations = data || [];

  if (json) {
    console.log(JSON.stringify(stations, null, 2));
    return;
  }

  if (stations.length === 0) {
    console.log('No stations found');
    return;
  }

  const rows = stations.map((s) => [
    s.short_code || '—',
    s.id,
    s.name || '—',
    String(s.steps ? s.steps.length : 0),
    ...(includeArchived ? [s.archived || s.archived_at ? 'yes' : '—'] : []),
  ]);
  const headers = ['CODE', 'ID', 'NAME', 'STEPS', ...(includeArchived ? ['ARCHIVED'] : [])];

  console.log(formatTable(headers, rows));
  console.log('');
  console.log(`Total: ${stations.length} stations${includeArchived ? ' (including archived)' : ''}`);
}
