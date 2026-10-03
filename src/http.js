// @ts-check
/**
 * Orchestrator API transport.
 *
 * PURE: credentials come from the `credentials` argument only — this module
 * never reads `process.env` or the CLI config file. Callers resolve creds their
 * own way (the CLI from its config profiles, workers from their own env) and
 * inject them.
 *
 * Base URL is origin-only (e.g. https://orchestrator.finopsbricks.com/); the
 * /api/v1 prefix is carried in the paths passed by the resource layer.
 *
 * Note: the orchestrator HTTP API and database still use the term "process".
 * URL path strings (`/api/v1/processes/...`) keep that wording — it is the API
 * contract. Only the JS-side namespace/method names use "station".
 */

/**
 * @typedef {import('./types/general/index.js').Credentials} Credentials
 * @typedef {import('./types/general/index.js').RequestOptions} RequestOptions
 * @typedef {import('./types/general/index.js').Transport} Transport
 */

/**
 * Row ceiling for auto-paginated fetches (`apiGetAll` / `ctx.getAll`). Exported
 * so the CLI can flag a truncated bulk result — `getAll` returns a plain array,
 * so `rows.length >= MAX_ALL_ROWS` is the signal that the cap was hit.
 */
export const MAX_ALL_ROWS = 15000;

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, status?: number }} [opts]
   */
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Origin the client talks to when the caller doesn't supply `api_url`. */
export const DEFAULT_API_URL = 'https://orchestrator.finopsbricks.com';

/**
 * Resolve credentials from the explicit argument only — this module never reads
 * `process.env`. Callers
 * pass `{ api_key, api_secret }` (required) and optionally `api_url` (defaults to
 * the hosted origin) and `location` (sent as `X-Location`).
 * @param {Credentials} credentials
 * @returns {{ api_url: string, api_key: string, api_secret: string, location?: string }}
 */
function resolveCreds(credentials) {
  const api_url = credentials?.api_url ?? DEFAULT_API_URL;
  const api_key = credentials?.api_key;
  const api_secret = credentials?.api_secret;
  if (!api_key || !api_secret) {
    throw new ApiError(
      'Missing orchestrator credentials: pass { api_key, api_secret } to fobOrc() ' +
        `(api_url optional, defaults to ${DEFAULT_API_URL}).`,
      { code: 'NO_CREDENTIALS' },
    );
  }
  return { api_url, api_key, api_secret, location: credentials?.location };
}

/** @param {{ api_key: string, api_secret: string, location?: string }} creds */
function authHeaders(creds) {
  /** @type {Record<string, string>} */
  const headers = {
    'api-key': creds.api_key,
    'api-secret': creds.api_secret,
    accept: 'application/json',
  };
  if (creds.location) headers['X-Location'] = creds.location;
  return headers;
}

function buildUrl(baseUrl, path, searchParams) {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const url = new URL(path.replace(/^\//, ''), base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

/**
 * @param {string} method
 * @param {string} path
 * @param {any} [body]
 * @param {RequestOptions} [options]
 */
async function apiRequest(method, path, body, { credentials, searchParams } = {}) {
  const creds = resolveCreds(credentials);
  const url = buildUrl(creds.api_url, path, searchParams);

  const headers = authHeaders(creds);
  const init = { method, headers };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const text = await response.text();

  let respBody = null;
  if (text) {
    try {
      respBody = JSON.parse(text);
    } catch {
      // Non-JSON body. On error responses surface the raw text; on success it's a protocol violation.
      if (!response.ok) {
        throw new ApiError(`${response.status} ${response.statusText}: ${text.slice(0, 200)}`, {
          code: 'HTTP_ERROR',
          status: response.status,
        });
      }
      throw new ApiError(
        `Invalid JSON response (status ${response.status}): ${text.slice(0, 200)}`,
        { code: 'INVALID_RESPONSE', status: response.status },
      );
    }
  }

  if (!response.ok) {
    const code = respBody?.error?.code || 'HTTP_ERROR';
    const message = respBody?.error?.message || respBody?.message || `${response.status} ${response.statusText}`;
    throw new ApiError(message, { code, status: response.status });
  }

  return respBody;
}

export function apiGet(path, options) {
  return apiRequest('GET', path, undefined, options);
}

export function apiPost(path, body, options) {
  return apiRequest('POST', path, body ?? {}, options);
}

export function apiPut(path, body, options) {
  return apiRequest('PUT', path, body ?? {}, options);
}

export function apiPatch(path, body, options) {
  return apiRequest('PATCH', path, body ?? {}, options);
}

export function apiDelete(path, options) {
  return apiRequest('DELETE', path, undefined, options);
}

/**
 * Build the fully-resolved request URL (no credentials embedded). For commands
 * that show or hand off the URL the CLI would hit.
 * @param {string} path
 * @param {RequestOptions} [options]
 */
export function buildAuthedUrl(path, { credentials, searchParams } = {}) {
  const creds = resolveCreds(credentials);
  return buildUrl(creds.api_url, path, searchParams);
}

/**
 * GET a binary response with auth headers. Returns the raw Response + resolved
 * URL so the caller can stream the body (e.g. supporting-doc downloads). Throws
 * ApiError on non-2xx (parsing a JSON error envelope if present).
 * @param {string} path
 * @param {{ credentials?: Credentials }} [options]
 * @returns {Promise<{ response: Response, url: URL }>}
 */
export async function apiGetStream(path, { credentials } = {}) {
  const creds = resolveCreds(credentials);
  const url = buildUrl(creds.api_url, path);

  const response = await fetch(url, { method: 'GET', headers: authHeaders(creds) });

  if (!response.ok) {
    const text = await response.text();
    let respBody = null;
    if (text) {
      try { respBody = JSON.parse(text); } catch { /* non-JSON error body */ }
    }
    const code = respBody?.error?.code || 'HTTP_ERROR';
    const message = respBody?.error?.message || respBody?.message || `${response.status} ${response.statusText}`;
    throw new ApiError(message, { code, status: response.status });
  }
  return { response, url };
}

/**
 * Auto-paginating GET. Walks `page_context.has_more`, concatenating each page's
 * `data` array. Endpoints that return everything in one shot (no `has_more`)
 * simply stop after the first page. Caps at `maxRows` and reports `truncated`.
 *
 * @returns {Promise<{ data: any[], page_context: object|null, truncated: boolean }>}
 */
export async function apiGetAll(path, options = {}, { maxRows = MAX_ALL_ROWS, pageSize = 500 } = {}) {
  const baseParams = { ...(options.searchParams ?? {}) };
  delete baseParams.page;
  delete baseParams.limit;

  const all = [];
  let page = 1;
  let pageContext = null;
  let truncated = false;

  while (true) {
    const result = await apiGet(path, {
      ...options,
      searchParams: { ...baseParams, page, limit: pageSize },
    });
    const rows = result?.data ?? [];
    pageContext = result?.page_context ?? null;

    if (all.length + rows.length > maxRows) {
      all.push(...rows.slice(0, maxRows - all.length));
      truncated = true;
      break;
    }
    all.push(...rows);

    if (!pageContext?.has_more) break;
    page++;
  }

  return { data: all, page_context: pageContext, truncated };
}

/**
 * Bind credentials once and return a transport whose methods no longer take a
 * `credentials` argument. This is the seam the resource layer builds on: the
 * `fobOrc(credentials)` factory calls this, then hands the resulting `ctx` to
 * each `buildX(ctx)` so action files stay credential-free and pure.
 *
 * @param {Credentials} [credentials]
 * @returns {Transport}
 */
export function createTransport(credentials) {
  return {
    get: (path, options) => apiGet(path, { ...options, credentials }),
    post: (path, body, options) => apiPost(path, body, { ...options, credentials }),
    put: (path, body, options) => apiPut(path, body, { ...options, credentials }),
    patch: (path, body, options) => apiPatch(path, body, { ...options, credentials }),
    delete: (path, options) => apiDelete(path, { ...options, credentials }),
    getAll: (path, options, pageOpts) => apiGetAll(path, { ...options, credentials }, pageOpts),
    getStream: (path) => apiGetStream(path, { credentials }),
    buildUrl: (path, options) => buildAuthedUrl(path, { ...options, credentials }),
  };
}
