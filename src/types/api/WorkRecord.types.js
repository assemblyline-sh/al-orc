// @ts-check
/**
 * A work record — one run of a station, as returned by
 * `/api/v1/work-records`.
 * @typedef {Object} WorkRecord
 * @property {string} id
 * @property {string} [station]  Station id.
 * @property {string} [status]
 * @property {(string|Tag)[]} [tags]
 * @property {Record<string, any>} [report]
 * @property {Record<string, any>[]} [step_outputs]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {string|null} [started_at]
 * @property {string|null} [completed_at]
 * @property {string|null} [performed_by]  Who or what ran it (a factory session, or a user).
 * @property {string|null} [error]
 * @property {WorkRecordActivity[]} [activity]  With `show --activity`.
 * @property {import('./SupportingDoc.types.js').SupportingDoc[]} [supporting_docs]  With `show --supporting-docs`.
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
