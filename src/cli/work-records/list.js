import { clientFor } from '../_helpers.js';
import { formatTable, formatDate, formatDuration, localTzLabel, formatPaginationHint, truncate } from '../utils/format.js';

/** `fob-orc work-records list` — work records from the orchestrator, filterable. */
export async function listWorkRecordsHandler(argv) {
  const { limit, status, station, tag, json } = argv;

  const orc = clientFor();
  const { data, page_context } = await orc.workRecords.list({ limit, status, station, tag });
  const records = data || [];

  if (json) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  if (records.length === 0) {
    console.log('No work records found');
    return;
  }

  // STATION shows the station id: the API returns `process` as an id, and
  // resolving each to its short_code would cost a request per row. Filtering by
  // station already tells you which one; unfiltered, the id is what
  // `fob orc stations show <id>` takes.
  const rows = records.map((r) => [
    r.id,
    r.process || '—',
    r.status || '—',
    formatDate(r.created_at),
    formatDuration(r.started_at, r.completed_at),
    r.performed_by || '—',
    truncate(r.error, 40),
  ]);

  console.log(formatTable(
    ['ID', 'STATION', 'STATUS', `CREATED (${localTzLabel()})`, 'TOOK', 'BY', 'ERROR'],
    rows,
  ));
  console.log('');
  console.log(`Total: ${records.length} records`);

  const hint = formatPaginationHint(page_context);
  if (hint) console.log(hint);
}
