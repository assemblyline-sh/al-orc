/**
 * A line, as returned by `/api/v1/lines`. A sequence of stations that runs at
 * exactly one worker location; the line owns `location`, stations inherit it.
 * @typedef {Object} Line
 * @property {string} id
 * @property {string} code            Operator-facing handle, unique per org (`VM`, `BK-SR`).
 * @property {string} name
 * @property {string} [description]
 * @property {string} location        Worker location serving every station on the line.
 * @property {LineStationRef[]} [stations]  Live stations on the line (read-only, server-derived).
 * @property {string} [created_at]
 * @property {string|null} [archived_at]
 */

/**
 * @typedef {Object} LineStationRef
 * @property {string} id
 * @property {string|null} short_code
 * @property {string} name
 */

export {};
