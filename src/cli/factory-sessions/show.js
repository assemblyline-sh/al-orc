import { clientFor } from '../_helpers.js';
import { formatTable, formatDate, formatField, formatSection, localTzLabel, truncate } from '../utils/format.js';

/** `al-orc factory-sessions show <id>` — one factory session, and what it did. */
export async function showFactorySessionHandler(argv) {
  const { id, tasks, json } = argv;

  const orc = clientFor();
  const session = await orc.factorySessions.get(id);

  if (!session) {
    console.log(`Factory session ${id} not found`);
    return;
  }

  if (json) {
    console.log(JSON.stringify(session, null, 2));
    return;
  }

  console.log(formatSection(`Factory session ${session.id}`));
  console.log(formatField('Factory', session.factory_name || '—', 14));
  console.log(formatField('Location', session.location || '—', 14));
  console.log(formatField('Status', session.status, 14));
  console.log(formatField('Host', session.hostname || '—', 14));
  console.log(formatField('PID', session.pid != null ? String(session.pid) : '—', 14));
  console.log(formatField('Version', session.factory_version || '—', 14));
  console.log(formatField('Directory', session.cwd || '—', 14));
  console.log(formatField('Started', formatDate(session.started_at), 14));
  console.log(formatField('Last seen', formatDate(session.last_seen_at), 14));
  if (session.ended_at) {
    console.log(formatField('Ended', formatDate(session.ended_at), 14));
  }
  console.log(formatField('Tasks', `${session.tasks_completed ?? 0} completed, ${session.tasks_failed ?? 0} failed`, 14));

  const breakdown = session.slug_breakdown || [];
  console.log('');
  console.log(formatSection(`Outcomes by step (${breakdown.length})`));
  if (breakdown.length === 0) {
    console.log('This session never claimed a task.');
  } else {
    console.log(formatTable(
      ['STEP', 'OK', 'FAILED', 'OTHER'],
      breakdown.map((s) => [s.step_slug, String(s.completed), String(s.failed), String(s.other)]),
    ));

    // The stale-deploy signature: some slugs work, others never do. A factory session
    // with bad credentials or a dead upstream fails everything; one whose code
    // predates a station fails only that station's slugs.
    const all_fail = breakdown.filter((s) => s.completed === 0 && s.failed > 0);
    const any_ok = breakdown.filter((s) => s.completed > 0);
    if (all_fail.length > 0 && any_ok.length > 0) {
      console.log('');
      console.log(`!  ${all_fail.length} step(s) never succeeded here while ${any_ok.length} did.`);
      console.log(`   Never succeeded: ${all_fail.map((s) => s.step_slug).join(', ')}`);
      console.log("   A factory session that handles some steps and no others usually predates them — check its version and restart it.");
    }
  }

  if (tasks) {
    const recent = session.recent_tasks || [];
    console.log('');
    console.log(formatSection(`Recent tasks (${recent.length})`));
    if (recent.length === 0) {
      console.log('No tasks.');
    } else {
      console.log(formatTable(
        ['WORK RECORD', 'STEP', 'STATUS', 'TRIES', `CLAIMED (${localTzLabel()})`, 'ERROR'],
        recent.map((t) => [
          t.work_record,
          t.step_slug,
          t.status,
          String(t.retry_count ?? 0),
          formatDate(t.claimed_at),
          truncate(t.error, 60),
        ]),
      ));
    }
  } else {
    console.log('');
    console.log('Use --tasks to list the tasks this session claimed.');
  }
}
