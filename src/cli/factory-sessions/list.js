import { clientFor } from '../_helpers.js';
import { formatTable, formatDate, localTzLabel } from '../utils/format.js';

/**
 * Group active sessions by location and flag the ones that disagree.
 *
 * More than one factory session at a location is legitimate scale-out on its own, but
 * if they run different code or out of different directories they are not
 * interchangeable — and the orchestrator hands each task to whoever polls
 * first. That is the 2026-08-11 failure mode: two factory sessions on `dev-laptop1`,
 * one without the EM steps, so EM runs failed at random.
 *
 * D1 (one active session per org+location) now refuses the second session, so
 * this should be empty on a healthy fleet. It stays because historical rows
 * still show it, and because a refused session is only refused at *session
 * creation* — anything already active when D1 shipped kept running.
 *
 * @param {any[]} sessions
 * @returns {Array<{ location: string, count: number, versions: string[], cwds: string[] }>}
 */
export function findLocationCollisions(sessions) {
  /** @type {Record<string, any[]>} */
  const by_location = {};
  for (const s of sessions) {
    if (s.status !== 'active') continue;
    (by_location[s.location] ||= []).push(s);
  }

  const collisions = [];
  for (const [location, group] of Object.entries(by_location)) {
    if (group.length < 2) continue;
    const versions = [...new Set(group.map((s) => s.factory_version).filter(Boolean))];
    const cwds = [...new Set(group.map((s) => s.cwd).filter(Boolean))];
    collisions.push({ location, count: group.length, versions, cwds });
  }
  return collisions;
}

/** `al-orc factory-sessions list` — factory sessions the orchestrator knows about. */
export async function listFactorySessionsHandler(argv) {
  const { limit, status, location, stale, json } = argv;

  const orc = clientFor();
  const { data } = await orc.factorySessions.list({ limit, status, location });
  let sessions = data || [];

  // --stale is a client-side view over the same rows: anything not currently
  // active. Kept out of the API because "stale" is a judgement, not a column.
  if (stale) {
    sessions = sessions.filter((s) => s.status !== 'active');
  }

  if (json) {
    console.log(JSON.stringify(sessions, null, 2));
    return;
  }

  if (sessions.length === 0) {
    console.log('No factory sessions found');
    return;
  }

  const rows = sessions.map((s) => [
    s.id,
    s.factory_name || '—',
    s.hostname || '—',
    s.pid != null ? String(s.pid) : '—',
    s.factory_version || '—',
    s.status,
    String(s.tasks_completed ?? 0),
    String(s.tasks_failed ?? 0),
    formatDate(s.last_seen_at),
  ]);

  console.log(formatTable(
    ['SESSION', 'FACTORY_NAME', 'HOST', 'PID', 'VER', 'STATUS', 'TASKS', 'FAIL', `LAST SEEN (${localTzLabel()})`],
    rows,
  ));
  console.log('');
  console.log(`Total: ${sessions.length} sessions`);

  for (const c of findLocationCollisions(sessions)) {
    console.log('');
    console.log(`!  ${c.count} active sessions share location '${c.location}'`);
    if (c.versions.length > 1) {
      console.log(`   Running different factory versions (${c.versions.join(', ')}).`);
      console.log('   Tasks go to whichever polls first — version skew fails nondeterministically.');
    } else if (c.cwds.length > 1) {
      console.log(`   Running from different directories (${c.cwds.join(', ')}).`);
      console.log('   Workpiece bundles live under each cwd, so a run split across them loses its files.');
    }
  }
}
