import { clientFor } from '../_helpers.js';
import { formatHeader, formatField, formatTable, formatSection, formatDate, formatDuration } from '../utils/format.js';

/** `fob-orc work-records show <id>` — one work record, with optional detail sections. */
export async function showWorkRecordHandler(argv) {
  const { id, report, steps, supportingDocs, activity, all, json } = argv;

  const orc = clientFor();

  const include = [];
  if (report || all) include.push('report');
  if (steps || all) include.push('step_outputs');
  if (supportingDocs || all) include.push('supporting_docs');

  const record = await orc.workRecords.get(id, { include: include.length ? include : undefined });

  if (json) {
    if (activity || all) {
      record.activity = await orc.workRecords.activity(id).catch(() => []);
    }
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (!record) {
    console.error(`Work record not found: ${id}`);
    process.exit(1);
  }

  console.log(formatHeader('Work Record', record.id, record.status));
  console.log('');
  const lw = 14;
  console.log(formatField('Station', record.process || '—', lw));
  console.log(formatField('Status', record.status, lw));
  console.log(formatField('Duration', formatDuration(record.started_at, record.completed_at), lw));
  console.log(formatField('Created', formatDate(record.created_at), lw));
  if (record.started_at) console.log(formatField('Started', formatDate(record.started_at), lw));
  if (record.completed_at) console.log(formatField('Completed', formatDate(record.completed_at), lw));

  const tags = await orc.workRecords.getTags(id).catch(() => []);
  console.log(formatField('Tags', tags.map((t) => t.name).join(', ') || '—', lw));

  if (report || all) {
    console.log(formatSection('Report'));
    console.log(record.report ? (typeof record.report === 'string' ? record.report : JSON.stringify(record.report, null, 2)) : 'No report available.');
  }

  if (steps || all) {
    console.log(formatSection('Step Outputs'));
    const outputs = record.step_outputs || {};
    const slugs = Object.keys(outputs);
    if (slugs.length) {
      for (const slug of slugs) {
        console.log(`\n[${slug}]`);
        const output = outputs[slug];
        console.log(typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output));
      }
    } else {
      console.log('No step outputs.');
    }
  }

  if (supportingDocs || all) {
    const docs = record.supporting_docs || [];
    console.log(formatSection(`Supporting Documents (${docs.length})`));
    if (docs.length) {
      const rows = docs.map((d) => [d.id, d.type || '—', d.title || '—', formatDate(d.created_at)]);
      console.log(formatTable(['ID', 'TYPE', 'TITLE', 'CREATED'], rows));
      console.log('\nUse `fob-orc supporting-docs show <id>` to view content.');
    } else {
      console.log('No supporting documents.');
    }
  }

  if (activity || all) {
    const events = await orc.workRecords.activity(id).catch(() => null);
    console.log(formatSection(`Activity (${events?.length ?? 0})`));
    if (events?.length) {
      // Worker attribution rides in `properties` on the claim/complete/fail
      // events. It was being fetched and dropped, which is why diagnosing a
      // bad worker meant hand-querying the API. `fob orc worker-sessions show
      // <session>` takes it from here.
      const rows = events.map((e) => [
        formatDate(e.created_at),
        e.event || e.type || '—',
        e.properties?.worker_name || '—',
        e.properties?.worker_session_id || '—',
      ]);
      console.log(formatTable(['TIME', 'EVENT', 'WORKER', 'SESSION'], rows));
    } else if (events) {
      console.log('No activity events.');
    } else {
      console.log('Could not load activity.');
    }
  }

  if (!report && !steps && !supportingDocs && !activity && !all) {
    console.log('\nUse --report, --steps, --supporting-docs, --activity, or --all for details.');
  }
}
