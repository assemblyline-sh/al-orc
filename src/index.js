// @ts-check
/**
 * @finopsbricks/fob-orc — the importable orchestrator client.
 *
 * Construct a client with credentials bound once, then call resource namespaces:
 *
 *   import { fobOrc } from '@finopsbricks/fob-orc';
 *   const orc = fobOrc({ api_key, api_secret });   // api_url optional (defaults to the hosted origin)
 *   const { data } = await orc.stations.list();
 *   const wr = await orc.stations.run(id, { overrides: { dry_run: true } });
 *
 * The `fob-orc` CLI builds the same client and calls these same namespaces — so
 * the CLI and the library can never drift: every endpoint is defined once, in
 * src/resources/.
 *
 * Multi-tenant workers construct one client per org: `fobOrc(orgACreds)`,
 * `fobOrc(orgBCreds)`.
 */

import { createTransport, apiGet } from './http.js';
import { buildStations } from './resources/stations.js';
import { buildWorkRecords } from './resources/work-records.js';
import { buildTags } from './resources/tags.js';
import { buildSupportingDocs } from './resources/supporting-docs.js';
import { buildWorkerSessions } from './resources/worker-sessions.js';

/**
 * @typedef {import('./types/general/index.js').Credentials} Credentials
 * @typedef {import('./resources/stations.js').StationsApi} StationsApi
 * @typedef {import('./resources/work-records.js').WorkRecordsApi} WorkRecordsApi
 * @typedef {import('./resources/tags.js').TagsApi} TagsApi
 * @typedef {import('./resources/supporting-docs.js').SupportingDocsApi} SupportingDocsApi
 * @typedef {import('./resources/worker-sessions.js').WorkerSessionsApi} WorkerSessionsApi
 */

/**
 * The orchestrator client. Explicit (not inferred) so callers — CLI handlers and
 * workers alike — get a checked, autocompleted surface.
 * @typedef {Object} OrcClient
 * @property {StationsApi} stations
 * @property {WorkRecordsApi} workRecords
 * @property {TagsApi} tags
 * @property {SupportingDocsApi} supportingDocs
 * @property {WorkerSessionsApi} workerSessions
 * @property {() => Promise<{ connected: boolean, status?: number, error?: string }>} checkConnection
 */

/**
 * @param {Credentials} credentials  Required: `{ api_key, api_secret }`. Optional
 *   `api_url` (origin-only) overrides the default hosted endpoint; optional
 *   `location` is sent as `X-Location`. The library never reads these from the
 *   environment — inject them explicitly.
 * @returns {OrcClient}
 */
export function fobOrc(credentials) {
  const ctx = createTransport(credentials);
  return {
    stations: buildStations(ctx),
    workRecords: buildWorkRecords(ctx),
    tags: buildTags(ctx),
    supportingDocs: buildSupportingDocs(ctx),
    workerSessions: buildWorkerSessions(ctx),
    /** Probe the orchestrator's worker-poll endpoint; never throws. */
    checkConnection: async () => {
      try {
        await apiGet('/api/worker/poll', { credentials });
        return { connected: true };
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
