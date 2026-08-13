import { clientFor } from '../_helpers.js';
import { buildStationLabelMap, stationLabel } from '../utils/station-labels.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate, formatDuration, localTzLabel, truncate } from '../utils/format.js';

/** `fob-orc stations show <id>` — one station's definition, optionally with recent work records. */
export async function showStationHandler(argv) {
  const { id, workRecords, all, json } = argv;

  const orc = clientFor();
  const station = await orc.stations.get(id);

  if (json) {
    console.log(JSON.stringify(station, null, 2));
    return;
  }

  if (!station) {
    console.error(`Station not found: ${id}`);
    process.exit(1);
  }

  console.log(formatHeader('Station', station.short_code || station.id));
  const lw = 14;
  console.log(formatField('Name', station.name, lw));
  console.log(formatField('ID', station.id, lw));
  if (station.short_code) console.log(formatField('Short Code', station.short_code, lw));
  if (station.line) console.log(formatField('Line', station.line, lw));

  const tags = station.tags?.map((t) => (typeof t === 'string' ? t : t.name)).join(', ');
  if (tags) console.log(formatField('Tags', tags, lw));

  // `dependencies` comes back as bare station ids, so each needs resolving to a
  // short_code — printing them verbatim shows opaque ids where the reader
  // expects `EM0`. Best-effort: an unresolvable ref falls through unchanged.
  let deps = 'none';
  if (station.dependencies?.length) {
    const labels = await buildStationLabelMap(orc);
    deps = station.dependencies
      .map((d) => (typeof d === 'string' ? stationLabel(d, labels) : d.short_code || stationLabel(d.id, labels)))
      .join(', ');
  }
  console.log(formatField('Dependencies', deps, lw));

  if (station.steps?.length) {
    console.log(`\nSteps (${station.steps.length}):`);
    station.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.slug}`));
  }

  if (workRecords || all) {
    const records = await orc.workRecords.list({ station: station.id, limit: 10 }).then((r) => r.data || []);
    console.log(formatSection(`Recent Work Records (${records.length})`));
    if (records.length > 0) {
      // No STATION column — this section is already scoped to one station.
      const rows = records.map((r) => [
        r.id,
        r.status || '—',
        formatDate(r.created_at),
        formatDuration(r.started_at, r.completed_at),
        r.performed_by || '—',
        truncate(r.error, 40),
      ]);
      console.log(formatTable(
        ['ID', 'STATUS', `CREATED (${localTzLabel()})`, 'TOOK', 'BY', 'ERROR'],
        rows,
      ));
      // `--station` takes an id or a short_code — suggest the readable form.
      console.log(`\nUse \`fob-orc work-records list --station ${station.short_code || station.id}\` for the full list.`);
    } else {
      console.log('No work records found.');
    }
  } else {
    console.log('\nUse --work-records or --all for linked entities.');
  }
}
