/**
 * A work record — one run of a station against an item, as returned by
 * `/api/v1/work-records`.
 * @typedef {Object} WorkRecord
 * @property {string} id
 * @property {string} [process]  Station id (the API field keeps "process" wording).
 * @property {string} [status]
 * @property {(string|Tag)[]} [tags]
 * @property {Record<string, any>} [item_snapshot]
 * @property {Record<string, any>} [report]
 * @property {Record<string, any>[]} [step_outputs]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * One activity event on a work record.
 * @typedef {Object} WorkRecordActivity
 * @property {string} [type]
 * @property {string} [message]
 * @property {string} [created_at]
 */

/**
 * @typedef {import('./Tag.types.js').Tag} Tag
 */

export {};
