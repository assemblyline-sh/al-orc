// @ts-check
import { clientFor } from '../_helpers.js';
import { formatTable, formatPaginationHint } from '../utils/format.js';

/** `al-orc lines list` — lines from the orchestrator, with their station codes. */
export async function listLinesHandler(argv) {
  const { location, json, includeArchived, page, limit } = argv || {};

  const orc = clientFor();
  const { data, page_context } = await orc.lines.list({ location, include_archived: includeArchived, page, limit });
  const lines = data || [];

  if (json) {
    console.log(JSON.stringify(lines, null, 2));
    return;
  }

  if (lines.length === 0) {
    console.log('No lines found');
    return;
  }

  const rows = lines.map((l) => [
    l.code,
    l.name === l.code ? '—' : l.name || '—',
    l.location || '—',
    String(l.stations?.length ?? 0),
    (l.stations || []).map((s) => s.short_code || s.id).join(', ') || '—',
    ...(includeArchived ? [l.archived_at ? 'yes' : '—'] : []),
  ]);
  const headers = ['CODE', 'NAME', 'LOCATION', 'STATIONS', 'MEMBERS', ...(includeArchived ? ['ARCHIVED'] : [])];

  console.log(formatTable(headers, rows));
  console.log('');
  const station_total = lines.reduce((n, l) => n + (l.stations?.length ?? 0), 0);
  console.log(`Total: ${lines.length} lines, ${station_total} stations`);

  const hint = formatPaginationHint(page_context);
  if (hint) console.log(hint);
}
