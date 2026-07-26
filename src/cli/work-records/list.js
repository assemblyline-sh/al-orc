import { clientFor } from '../_helpers.js';
import { formatTable, formatDate } from '../utils/format.js';

/** `fob-orc work-records list` — work records from the orchestrator, filterable. */
export async function listWorkRecordsHandler(argv) {
  const { limit, status, station, tag, json } = argv;

  const orc = clientFor();
  const { data } = await orc.workRecords.list({ limit, status, station, tag });
  const records = data || [];

  if (json) {
    console.log(JSON.stringify(records, null, 2));
    return;
  }

  if (records.length === 0) {
    console.log('No work records found');
    return;
  }

  const rows = records.map((r) => [r.id, r.status || '—', formatDate(r.created_at)]);
  console.log(formatTable(['ID', 'STATUS', 'CREATED'], rows));
  console.log('');
  console.log(`Total: ${records.length} records`);
}
