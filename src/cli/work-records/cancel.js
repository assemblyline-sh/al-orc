// @ts-check
import { clientFor } from '../_helpers.js';
import { buildStationLabelMap, stationLabel } from '../utils/station-labels.js';

/** `al-orc work-records cancel <id>` — cancel a running or pending work record. */
export async function cancelWorkRecordHandler(argv) {
  const { id, json } = argv;

  const orc = clientFor();
  const record = await orc.workRecords.cancel(id);

  if (json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  console.log(`Cancelled work record ${record?.id ?? id}`);
  if (record?.status) console.log(`Status:   ${record.status}`);
  if (record?.station) {
    // `station` is the station id; show its short_code when it resolves —
    // matches `work-records list` / `show` in this CLI.
    const labels = await buildStationLabelMap(orc);
    console.log(`Station:  ${stationLabel(record.station, labels)}`);
  }
}
