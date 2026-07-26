import { clientFor } from '../_helpers.js';

/** `fob-orc work-records cancel <id>` — cancel a running or pending work record. */
export async function cancelWorkRecordHandler(argv) {
  const { id, json } = argv;

  const record = await clientFor().workRecords.cancel(id);

  if (json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  console.log(`Cancelled work record ${record?.id ?? id}`);
  if (record?.status) console.log(`Status:   ${record.status}`);
  if (record?.process) console.log(`Station:  ${record.process}`);
}
