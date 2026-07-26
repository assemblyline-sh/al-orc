// @ts-check
/**
 * The `tags` resource — every tag endpoint, once, plus two name↔id convenience
 * helpers the CLI's tag-editing flows lean on.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 * @typedef {import('../types/api/Tag.types.js').Tag} Tag
 */

/**
 * @typedef {Object} TagsApi
 * @property {() => Promise<{ data: Tag[], page_context: object|null }>} list
 * @property {(data: object) => Promise<Tag|null>} create
 * @property {(id: string, data: object) => Promise<Tag|null>} update
 * @property {(id: string) => Promise<any>} delete
 * @property {(names: string[]) => Promise<string[]>} resolveNames
 * @property {(name: string) => Promise<Tag>} ensure
 */

/** @param {any} r @returns {any} */
const unwrap = (r) => r?.data ?? null;
/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/**
 * @param {Transport} ctx
 * @returns {TagsApi}
 */
export function buildTags(ctx) {
  /** @type {TagsApi} */
  const api = {
    /** All tags. Returns the `{ data, page_context }` envelope. */
    list: () => ctx.get('/api/v1/tags'),

    /** Create a tag (`{ name, color?, description? }`). Returns the created record. */
    create: (data) => ctx.post('/api/v1/tags', data).then(unwrap),

    /** Update a tag's fields. Returns the updated record. */
    update: (id, data) => ctx.put(`/api/v1/tags/${enc(id)}`, data).then(unwrap),

    /** Delete a tag by id. */
    delete: (id) => ctx.delete(`/api/v1/tags/${enc(id)}`).then(unwrap),

    /** Resolve tag names → ids (throws if any name is unknown). */
    resolveNames: async (names) => {
      const { data = [] } = await api.list();
      const byName = new Map(data.map((t) => [t.name, t.id]));
      return names.map((name) => {
        const id = byName.get(name);
        if (!id) throw new Error(`Unknown tag: ${name}`);
        return id;
      });
    },

    /** Get a tag by name, creating it if it doesn't exist. */
    ensure: async (name) => {
      const { data = [] } = await api.list();
      const existing = data.find((t) => t.name === name);
      if (existing) return existing;
      const created = await api.create({ name });
      if (!created) throw new Error(`Failed to create tag: ${name}`);
      return created;
    },
  };
  return api;
}
