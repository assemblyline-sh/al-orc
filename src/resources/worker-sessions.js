// @ts-check
/**
 * The `worker-sessions` resource — one row per worker process start.
 *
 * A session is the unit of worker debugging: `worker_name` is only
 * `{location}/{hostname}` and repeats across restarts, so the session id is
 * the sole stable handle on a particular running process.
 *
 * Return shapes follow the house convention: `list` returns the raw
 * `{ data, page_context }` envelope, `getAll` a flat array, `get` the
 * unwrapped record.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 */

/**
 * @typedef {Object} WorkerSession
 * @property {string} id
 * @property {string} worker_name
 * @property {string} location
 * @property {'active'|'expired'|'disconnected'} status
 * @property {string|null} hostname
 * @property {number|null} pid
 * @property {string|null} cwd
 * @property {string|null} worker_version
 * @property {string} started_at
 * @property {string} last_seen_at
 * @property {string|null} ended_at
 * @property {number} tasks_completed
 * @property {number} tasks_failed
 */

/**
 * @typedef {Object} SlugOutcome
 * @property {string} step_slug
 * @property {number} completed
 * @property {number} failed
 * @property {number} other
 */

/**
 * @typedef {WorkerSession & {
 *   slug_breakdown: SlugOutcome[],
 *   recent_tasks: Array<{ id: string, work_record: string, step_slug: string, status: string,
 *                         retry_count: number, error: string|null,
 *                         claimed_at: string|null, completed_at: string|null }>
 * }} WorkerSessionDetail
 */

/**
 * The worker-sessions client surface. Explicit (not inferred) so callers get
 * real checking; `buildWorkerSessions`'s `@returns` binds it, so `tsc`
 * verifies the impl.
 * @typedef {Object} WorkerSessionsApi
 * @property {(params?: { status?: string, location?: string, worker_name?: string, limit?: number }) => Promise<{ data: WorkerSession[], page_context: object|null }>} list
 * @property {(params?: { status?: string, location?: string, worker_name?: string }) => Promise<WorkerSession[]>} getAll
 * @property {(id: string) => Promise<WorkerSessionDetail|null>} get
 */

/** Unwrap a single-record response body; null if there's no data.
 * @param {any} r
 * @returns {any} */
const unwrap = (r) => r?.data ?? null;

/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/**
 * @param {Transport} ctx
 * @returns {WorkerSessionsApi}
 */
export function buildWorkerSessions(ctx) {
  return {
    /** One page of sessions, newest-seen first. Returns the `{ data, page_context }` envelope. */
    list: (params = {}) => ctx.get('/api/v1/worker-sessions', { searchParams: params }),

    /** Every session, walking pagination. Returns a flat array (capped at MAX_ALL_ROWS). */
    getAll: async (params = {}) =>
      (await ctx.getAll('/api/v1/worker-sessions', { searchParams: params })).data,

    /** One session by id, with its per-slug outcome breakdown and recent tasks. Null if absent. */
    get: (id) => ctx.get(`/api/v1/worker-sessions/${enc(id)}`).then(unwrap),
  };
}
