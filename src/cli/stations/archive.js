import { clientFor } from '../_helpers.js';

/** `fob-orc stations archive <id>` — hide from default list, preserve history, block execution. */
export async function archiveStationHandler(argv) {
  const { id, json } = argv;
  const station = await clientFor().stations.archive(id);
  if (json) {
    console.log(JSON.stringify(station, null, 2));
    return;
  }
  console.log(`Archived station ${id}.`);
}

/** `fob-orc stations unarchive <id>` — undo archive. */
export async function unarchiveStationHandler(argv) {
  const { id, json } = argv;
  const station = await clientFor().stations.unarchive(id);
  if (json) {
    console.log(JSON.stringify(station, null, 2));
    return;
  }
  console.log(`Unarchived station ${id}.`);
}
