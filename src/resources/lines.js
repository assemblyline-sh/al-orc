// @ts-check
/**
 * The `lines` resource — every line endpoint, defined once.
 *
 * Lines live at the canonical `/api/v1/lines` surface (there was never a
 * "process"-era path for them). `id` in every signature accepts a line id or
 * its code — the orchestrator resolves either.
 *
 * Return shapes: single-record ops return the unwrapped record; `list` returns
 * the raw `{ data, page_context }` envelope; `getAll` returns a flat array.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 * @typedef {import('../types/api/Line.types.js').Line} Line
 */

/**
 * @typedef {Object} LinesApi
 * @property {(params?: { location?: string, include_archived?: boolean }) => Promise<{ data: Line[], page_context: object|null }>} list
 * @property {(params?: { location?: string, include_archived?: boolean }) => Promise<Line[]>} getAll
 * @property {(id: string) => Promise<Line|null>} get
 * @property {(data: object) => Promise<Line|null>} create
 * @property {(id: string, data: object) => Promise<Line|null>} update
 * @property {(id: string) => Promise<any>} delete
 */

/** @param {any} r @returns {any} */
const unwrap = (r) => r?.data ?? null;
/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/**
 * @param {Transport} ctx
 * @returns {LinesApi}
 */
export function buildLines(ctx) {
  return {
    /** One page of lines. Returns the `{ data, page_context }` envelope. */
    list: (params = {}) => ctx.get('/api/v1/lines', { searchParams: params }),

    /** Every line, walking pagination. Returns a flat array. */
    getAll: async (params = {}) => (await ctx.getAll('/api/v1/lines', { searchParams: params })).data,

    /** One line by id or code, or null if absent. */
    get: (id) => ctx.get(`/api/v1/lines/${enc(id)}`).then(unwrap),

    /** Create a line (`{ code, location, name?, description? }`). Returns the created record. */
    create: (data) => ctx.post('/api/v1/lines', data).then(unwrap),

    /** Update line fields (PUT). Returns the updated record. */
    update: (id, data) => ctx.put(`/api/v1/lines/${enc(id)}`, data).then(unwrap),

    /** Delete a line. Refused by the server while stations are still on it. */
    delete: (id) => ctx.delete(`/api/v1/lines/${enc(id)}`).then(unwrap),
  };
}
