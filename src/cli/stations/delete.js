import { clientFor } from '../_helpers.js';

/** `fob-orc stations delete <id>` — permanently delete a station. */
export async function deleteStationHandler(argv) {
  const { id, cascade } = argv;
  await clientFor().stations.delete(id, { cascade });
  console.log(`Deleted station ${id}${cascade ? ' (cascade)' : ''}.`);
}
