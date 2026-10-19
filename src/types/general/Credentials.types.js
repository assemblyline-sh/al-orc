// @ts-check
/**
 * Orchestrator API credentials, passed explicitly to `alOrc(...)`. The library
 * never reads these from the environment — the caller injects them.
 * @typedef {Object} Credentials
 * @property {string} api_key
 * @property {string} api_secret
 * @property {string} [api_url]  Origin-only base URL (no /api/v1). Defaults to https://orchestrator.assemblyline.sh.
 */

/**
 * Options accepted by the transport request methods.
 * @typedef {Object} RequestOptions
 * @property {Credentials} [credentials]
 * @property {Record<string, any>} [searchParams]
 */

export {};
