// @ts-check
import { clientFor } from '../_helpers.js';
import { formatTable, formatPaginationHint } from '../utils/format.js';

/** `al-orc stations list` — canonical station definitions from the orchestrator. */
export async function listStationsHandler(argv) {
  const { tag, line, json, includeArchived, page, limit } = argv || {};

  const orc = clientFor();
  const { data, page_context } = await orc.stations.list({ tag, line, include_archived: includeArchived, page, limit });
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

  const hint = formatPaginationHint(page_context);
  if (hint) console.log(hint);
}
