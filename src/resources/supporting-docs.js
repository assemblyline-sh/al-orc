// @ts-check
/**
 * The `supporting-docs` resource — metadata fetch + a binary download stream.
 *
 * `downloadStream` stays pure (no filesystem): it returns the raw Response so
 * the CLI handler writes the bytes. This keeps the client importable anywhere.
 */

/**
 * @typedef {import('../types/general/index.js').Transport} Transport
 * @typedef {import('../types/api/SupportingDoc.types.js').SupportingDoc} SupportingDoc
 */

/**
 * @typedef {Object} SupportingDocsApi
 * @property {(id: string) => Promise<SupportingDoc|null>} get
 * @property {(id: string) => Promise<{ response: Response, url: URL }>} downloadStream
 */

/** @param {any} r @returns {any} */
const unwrap = (r) => r?.data ?? null;
/** @param {string} s */
const enc = (s) => encodeURIComponent(s);

/**
 * @param {Transport} ctx
 * @returns {SupportingDocsApi}
 */
export function buildSupportingDocs(ctx) {
  return {
    /** Document metadata (+ `content` for markdown docs). */
    get: (id) => ctx.get(`/api/v1/supporting-docs/${enc(id)}`).then(unwrap),

    /** Open the binary download as a stream; the caller writes it to disk. */
    downloadStream: (id) => ctx.getStream(`/api/v1/supporting-docs/${enc(id)}/download`),
  };
}
