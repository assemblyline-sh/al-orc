import { jest } from '@jest/globals';

// `me()` and `checkConnection()` both read GET /api/v1/me — never the factory
// session poll, which could claim a pending step.
const { alOrc } = await import('../../src/index.js');

const ME = { org: { id: 'o1', name: 'Acme' }, api_key: { id: 'k1', name: 'laptop', key: 'al_abc' } };
const CREDS = { api_url: 'https://orchestrator.assemblyline.sh', api_key: 'k', api_secret: 's' };

/** @param {{ ok: boolean, status: number, body: object }[]} responses */
function mockFetch(responses) {
  const calls = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), method: init?.method });
    const r = responses.shift();
    return { ok: r.ok, status: r.status, statusText: r.ok ? 'OK' : 'Unauthorized', text: async () => JSON.stringify(r.body) };
  });
  return calls;
}

describe('me and checkConnection', () => {
  afterEach(() => jest.restoreAllMocks());

  it('me() returns the org and key from /api/v1/me', async () => {
    const calls = mockFetch([{ ok: true, status: 200, body: { data: ME } }]);
    expect(await alOrc(CREDS).me()).toEqual(ME);
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/me');
  });

  it('checkConnection() reports the org and never polls for work', async () => {
    const calls = mockFetch([{ ok: true, status: 200, body: { data: ME } }]);
    expect(await alOrc(CREDS).checkConnection()).toEqual({ connected: true, org: ME.org, api_key: ME.api_key });
    expect(calls.map((c) => c.url).join(' ')).not.toContain('/poll');
  });

  it('checkConnection() returns the status instead of throwing on bad credentials', async () => {
    mockFetch([{ ok: false, status: 401, body: { error: { message: 'Invalid API key' } } }]);
    const result = await alOrc(CREDS).checkConnection();
    expect(result.connected).toBe(false);
    expect(result.status).toBe(401);
  });
});
