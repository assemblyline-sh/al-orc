// @ts-check
/**
 * A station, as returned by `/api/v1/stations`.
 * @typedef {Object} Station
 * @property {string} id
 * @property {string} name
 * @property {string} [short_code]
 * @property {string} line              Line code. The line owns the location; a station has none of its own.
 * @property {string} [description]
 * @property {StationStep[]} [steps]
 * @property {(string|{ id: string, short_code?: string })[]} [dependencies]  Station ids or short_codes this one depends on (or station objects).
 * @property {(string|Tag)[]} [tags]
 * @property {string} [applies_to]
 * @property {boolean} [archived]
 * @property {string|null} [archived_at]
 * @property {string} [created_at]
 */

/**
 * One step within a station definition.
 * @typedef {Object} StationStep
 * @property {string} slug
 * @property {Record<string, any>} [config]
 */

/**
 * The result of triggering a station run.
 * @typedef {Object} StationRunResult
 * @property {string} work_record_id
 */

/**
 * @typedef {import('./Tag.types.js').Tag} Tag
 */

export {};
