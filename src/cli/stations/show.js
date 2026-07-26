import { clientFor } from '../_helpers.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate } from '../utils/format.js';

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

  console.log(formatHeader('Station', station.id));
  const lw = 14;
  console.log(formatField('Name', station.name, lw));
  if (station.short_code) console.log(formatField('Short Code', station.short_code, lw));
  if (station.line) console.log(formatField('Line', station.line, lw));

  const tags = station.tags?.map((t) => (typeof t === 'string' ? t : t.name)).join(', ');
  if (tags) console.log(formatField('Tags', tags, lw));

  const deps = station.dependencies?.length
    ? station.dependencies.map((d) => (typeof d === 'string' ? d : d.short_code || d.id)).join(', ')
    : 'none';
  console.log(formatField('Dependencies', deps, lw));

  if (station.steps?.length) {
    console.log(`\nSteps (${station.steps.length}):`);
    station.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.slug}`));
  }

  if (workRecords || all) {
    const records = await orc.workRecords.list({ station: station.id, limit: 10 }).then((r) => r.data || []);
    console.log(formatSection(`Recent Work Records (${records.length})`));
    if (records.length > 0) {
      const rows = records.map((r) => [r.id, r.status || '—', formatDate(r.created_at)]);
      console.log(formatTable(['ID', 'STATUS', 'CREATED'], rows));
      console.log(`\nUse \`fob-orc work-records list --station ${station.id}\` for the full list.`);
    } else {
      console.log('No work records found.');
    }
  } else {
    console.log('\nUse --work-records or --all for linked entities.');
  }
}
