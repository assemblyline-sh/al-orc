// @ts-check
import { clientFor } from '../_helpers.js';
import { formatTable, formatDate, formatDuration, localTzLabel, formatPaginationHint, truncate } from '../utils/format.js';
import { buildStationLabelMap, stationLabel } from '../utils/station-labels.js';

/** `al-orc work-records list` — work records from the orchestrator, filterable. */
export async function listWorkRecordsHandler(argv) {
  const { page, limit, status, station, line, tag, json } = argv;

  const orc = clientFor();
  const { data, page_context } = await orc.workRecords.list({ page, limit, status, station, line, tag });
  const records = data || [];

  if (json) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  if (records.length === 0) {
    console.log('No work records found');
    return;
  }

  // STATION shows the short_code (`EM3`), not the raw station id the API
  // returns. One stations.getAll() builds the whole map, so the label costs a
  // single request for the table rather than one per row. Unresolved ids print
  // as-is — still what `al-orc stations show <id>` takes.
  const labels = await buildStationLabelMap(orc);

  const rows = records.map((r) => [
    r.id,
    stationLabel(r.station, labels),
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
