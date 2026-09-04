// @ts-check
/**
 * The `stations` resource — every station endpoint, defined once.
 *
 * The orchestrator API/DB still says "process": CRUD lives under
 * `/api/v1/processes/*` (the API contract). Archive/unarchive are net-new and
 * use the canonical `/api/v1/stations/*` surface. Only the JS names say "station".
 *
 * Return shapes: single-record ops return the unwrapped record; `list` returns
 * the raw `{ data, page_context }` envelope; `getAll` returns a flat array.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 * @typedef {import('../types/api/Station.types.js').Station} Station
 * @typedef {import('../types/api/Station.types.js').StationRunResult} StationRunResult
 * @typedef {import('../types/api/Tag.types.js').Tag} Tag
 */

/**
 * The station client surface. Explicit (not inferred) so callers get real
 * checking; `buildStations`'s `@returns` binds it, so `tsc` verifies the impl.
 * @typedef {Object} StationsApi
 * @property {(params?: { tag?: string, line?: string, include_archived?: boolean }) => Promise<{ data: Station[], page_context: object|null }>} list
 * @property {(params?: { tag?: string, line?: string, include_archived?: boolean }) => Promise<Station[]>} getAll
 * @property {(id: string) => Promise<Station|null>} get
 * @property {(data: object) => Promise<Station|null>} create
 * @property {(id: string, data: object) => Promise<Station|null>} update
 * @property {(id: string, opts?: { cascade?: boolean }) => Promise<any>} delete
 * @property {(id: string) => Promise<Station|null>} archive
 * @property {(id: string) => Promise<Station|null>} unarchive
 * @property {(id: string, opts?: { item?: string, overrides?: Record<string, any> }) => Promise<StationRunResult|null>} run
 * @property {(id: string) => Promise<Tag[]>} getTags
 * @property {(id: string, tagIds: string[]) => Promise<any>} setTags
 */

/** Unwrap a single-record response body; null if there's no data.
 * @param {any} r
 * @returns {any} */
const unwrap = (r) => r?.data ?? null;

/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/**
 * @param {Transport} ctx
 * @returns {StationsApi}
 */
export function buildStations(ctx) {
  return {
    /** One page of stations. Returns the `{ data, page_context }` envelope. */
    list: (params = {}) => ctx.get('/api/v1/processes', { searchParams: params }),

    /** Every station, walking pagination. Returns a flat array (capped at MAX_ALL_ROWS). */
    getAll: async (params = {}) => (await ctx.getAll('/api/v1/processes', { searchParams: params })).data,

    /** One station by id, or null if absent. */
    get: (id) => ctx.get(`/api/v1/processes/${enc(id)}`).then(unwrap),

    /** Create a station (`data` uses API field names). Returns the created record. */
    create: (data) => ctx.post('/api/v1/processes', data).then(unwrap),

    /** Update station fields (PUT). Returns the updated record. */
    update: (id, data) => ctx.put(`/api/v1/processes/${enc(id)}`, data).then(unwrap),

    /** Delete a station. `cascade` also removes linked work records (server support pending). */
    delete: (id, { cascade } = {}) =>
      ctx.delete(`/api/v1/processes/${enc(id)}`, cascade ? { searchParams: { cascade: true } } : undefined).then(unwrap),

    /** Archive — preserves history, hides from default list, blocks execution. Canonical /stations/* surface. */
    archive: (id) => ctx.post(`/api/v1/stations/${enc(id)}/archive`).then(unwrap),

    /** Unarchive — undoes archive. Canonical /stations/* surface. */
    unarchive: (id) => ctx.post(`/api/v1/stations/${enc(id)}/unarchive`).then(unwrap),

    /**
     * Trigger a station run. `overrides` are shallow-merged into every step's
     * config server-side. Returns `{ work_record_id }`.
     * (`item` is legacy — the item object is being deprecated on the orchestrator.)
     */
    run: (id, { item, overrides } = {}) => {
      const body = {};
      if (item) body.item_id = item;
      if (overrides && Object.keys(overrides).length > 0) body.step_overrides = overrides;
      return ctx.post(`/api/v1/processes/${enc(id)}/run`, body).then(unwrap);
    },

    /** Current tags on a station. */
    getTags: (id) => ctx.get(`/api/v1/processes/${enc(id)}/tags`).then((r) => r?.data ?? []),

    /** Replace a station's tags (full set, by tag id). */
    setTags: (id, tagIds) => ctx.put(`/api/v1/processes/${enc(id)}/tags`, { tags: tagIds }).then(unwrap),
  };
}
