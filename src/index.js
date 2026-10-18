// @ts-check
/**
 * @assemblyline/al-orc — the importable orchestrator client.
 *
 * Construct a client with credentials bound once, then call resource namespaces:
 *
 *   import { alOrc } from '@assemblyline/al-orc';
 *   const orc = alOrc({ api_key, api_secret });   // api_url optional (defaults to the hosted origin)
 *   const { data } = await orc.stations.list();
 *   const lines = await orc.lines.getAll();
 *   const wr = await orc.stations.run(id, { overrides: { dry_run: true } });
 *
 * The `al-orc` CLI builds the same client and calls these same namespaces — so
 * the CLI and the library can never drift: every endpoint is defined once, in
 * src/resources/.
 *
 * Code serving several orgs constructs one client per org: `alOrc(orgACreds)`,
 * `alOrc(orgBCreds)`.
 */

import { createTransport, apiGet } from './http.js';
import { buildLines } from './resources/lines.js';
import { buildStations } from './resources/stations.js';
import { buildWorkRecords } from './resources/work-records.js';
import { buildTags } from './resources/tags.js';
import { buildSupportingDocs } from './resources/supporting-docs.js';
import { buildFactorySessions } from './resources/factory-sessions.js';

/**
 * @typedef {import('./types/general/index.js').Credentials} Credentials
 * @typedef {import('./resources/lines.js').LinesApi} LinesApi
 * @typedef {import('./resources/stations.js').StationsApi} StationsApi
 * @typedef {import('./resources/work-records.js').WorkRecordsApi} WorkRecordsApi
 * @typedef {import('./resources/tags.js').TagsApi} TagsApi
 * @typedef {import('./resources/supporting-docs.js').SupportingDocsApi} SupportingDocsApi
 * @typedef {import('./resources/factory-sessions.js').FactorySessionsApi} FactorySessionsApi
 */

/**
 * Who the credentials belong to, from `GET /api/v1/me`.
 * @typedef {Object} Me
 * @property {{ id: string, name: string }} org
 * @property {{ id: string, name: string, key: string }} api_key
 */

/**
 * The orchestrator client. Explicit (not inferred) so callers — CLI handlers and
 * factories alike — get a checked, autocompleted surface.
 * @typedef {Object} OrcClient
 * @property {LinesApi} lines
 * @property {StationsApi} stations
 * @property {WorkRecordsApi} workRecords
 * @property {TagsApi} tags
 * @property {SupportingDocsApi} supportingDocs
 * @property {FactorySessionsApi} factorySessions
 * @property {() => Promise<Me|null>} me
 * @property {() => Promise<{ connected: boolean, org?: Me['org'], api_key?: Me['api_key'], status?: number, error?: string }>} checkConnection
 */

/**
 * @param {Credentials} credentials  Required: `{ api_key, api_secret }`. Optional
 *   `api_url` (origin-only) overrides the default hosted endpoint; optional
 *   `location` is sent as `X-Location`. The library never reads these from the
 *   environment — inject them explicitly.
 * @returns {OrcClient}
 */
export function alOrc(credentials) {
  const ctx = createTransport(credentials);
  return {
    lines: buildLines(ctx),
    stations: buildStations(ctx),
    workRecords: buildWorkRecords(ctx),
    tags: buildTags(ctx),
    supportingDocs: buildSupportingDocs(ctx),
    factorySessions: buildFactorySessions(ctx),
    /** The org and API key these credentials belong to. */
    me: () => ctx.get('/api/v1/me').then((r) => r?.data ?? null),
    /** Check the credentials against the orchestrator; never throws and never claims work. */
    checkConnection: async () => {
      try {
        const { data } = await apiGet('/api/v1/me', { credentials });
        return { connected: true, org: data?.org, api_key: data?.api_key };
      } catch (/** @type {any} */ error) {
        return { connected: false, status: error?.status, error: error?.message };
      }
    },
  };
}

// Transport primitives — an escape hatch for one-off calls the namespaces don't cover.
export {
  ApiError,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiGetAll,
  apiGetStream,
  buildAuthedUrl,
  createTransport,
  MAX_ALL_ROWS,
  DEFAULT_API_URL,
} from './http.js';
