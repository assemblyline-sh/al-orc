// @ts-check
/**
 * A supporting document, as returned by `/api/v1/supporting-docs/{id}`
 * (metadata; `content` present for markdown docs).
 * @typedef {Object} SupportingDoc
 * @property {string} id
 * @property {string} [name]
 * @property {string} [type]
 * @property {string} [mime_type]
 * @property {string} [content]
 * @property {string} [url]
 * @property {string} [title]
 * @property {string} [filename]
 * @property {number} [size_bytes]
 * @property {string} [step_slug]  The step that produced it.
 * @property {string} [work_record_id]
 * @property {string} [created_at]
 */

export {};
