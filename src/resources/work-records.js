// @ts-check
/**
 * The `work-records` resource — every orchestrator work-record endpoint, once.
 *
 * The `station` filter is sent to the API as `?process=` (the API contract still
 * says "process"); callers pass `station` and this layer maps it.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 * @typedef {import('../types/api/WorkRecord.types.js').WorkRecord} WorkRecord
 * @typedef {import('../types/api/WorkRecord.types.js').WorkRecordActivity} WorkRecordActivity
 * @typedef {import('../types/api/Tag.types.js').Tag} Tag
 */

/**
 * @typedef {Object} WorkRecordsApi
 * @property {(params?: { limit?: number, status?: string, station?: string, line?: string, tag?: string }) => Promise<{ data: WorkRecord[], page_context: object|null }>} list
 * @property {(params?: { status?: string, station?: string, line?: string, tag?: string }) => Promise<WorkRecord[]>} getAll
 * @property {(id: string, opts?: { include?: string[] }) => Promise<WorkRecord|null>} get
 * @property {(id: string) => Promise<WorkRecordActivity[]>} activity
 * @property {(id: string) => Promise<any>} cancel
 * @property {(id: string) => Promise<Tag[]>} getTags
 * @property {(id: string, tagIds: string[]) => Promise<any>} setTags
 */

/** @param {any} r @returns {any} */
const unwrap = (r) => r?.data ?? null;
/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/** Map caller params → API search params (`station` → `process`).
 * `station` accepts an id or a short_code; the API resolves either. `line` is
 * passed through as-is and matches every station on that line.
 * @param {{ limit?: number, status?: string, station?: string, line?: string, tag?: string }} [params] */
function toSearchParams({ limit, status, station, line, tag } = {}) {
  /** @type {Record<string, any>} */
  const sp = {};
  if (limit) sp.limit = limit;
  if (status) sp.status = status;
  if (station) sp.process = station;
  if (line) sp.line = line;
  if (tag) sp.tag = tag;
  return sp;
}

/**
 * @param {Transport} ctx
 * @returns {WorkRecordsApi}
 */
export function buildWorkRecords(ctx) {
  return {
    /** One page of work records. Returns the `{ data, page_context }` envelope. */
    list: (params = {}) => ctx.get('/api/v1/work-records', { searchParams: toSearchParams(params) }),

    /** Every matching work record, walking pagination. Returns a flat array. */
    getAll: async (params = {}) =>
      (await ctx.getAll('/api/v1/work-records', { searchParams: toSearchParams(params) })).data,

    /** One work record. `include` pulls optional blocks: 'report', 'step_outputs', 'supporting_docs'. */
    get: (id, { include } = {}) =>
      ctx
        .get(`/api/v1/work-records/${enc(id)}`, include?.length ? { searchParams: { include: include.join(',') } } : undefined)
        .then(unwrap),

    /** Activity events for a work record. */
    activity: (id) => ctx.get(`/api/v1/work-records/${enc(id)}/activity`).then((r) => r?.data ?? []),

    /** Cancel a running or pending work record. */
    cancel: (id) => ctx.post(`/api/v1/work-records/${enc(id)}/cancel`).then(unwrap),

    /** Current tags on a work record. */
    getTags: (id) => ctx.get(`/api/v1/work-records/${enc(id)}/tags`).then((r) => r?.data ?? []),

    /** Replace a work record's tags (full set, by tag id). */
    setTags: (id, tagIds) => ctx.put(`/api/v1/work-records/${enc(id)}/tags`, { tags: tagIds }).then(unwrap),
  };
}
