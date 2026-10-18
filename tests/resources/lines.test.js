import { jest } from '@jest/globals';

// Data-layer contract for the lines namespace: URL building against the
// canonical /api/v1/lines surface, unwrapping, and pagination flattening.
const { alOrc } = await import('../../src/index.js');

function mockFetch(responses) {
  const calls = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init, method: init?.method });
    const body = responses.shift() ?? { data: [], page_context: { has_more: false } };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) };
  });
  return calls;
}

const CREDS = { api_url: 'https://orchestrator.assemblyline.sh', api_key: 'k', api_secret: 's' };

describe('lines resource namespace (via alOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('get() accepts a code and hits /api/v1/lines/<code>', async () => {
    const calls = mockFetch([{ data: { id: 'l1', code: 'VM', location: 'dev-laptop1' } }]);
    const line = await alOrc(CREDS).lines.get('VM');
    expect(line).toEqual({ id: 'l1', code: 'VM', location: 'dev-laptop1' });
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/lines/VM');
  });

  it('list() forwards location and include_archived', async () => {
    const calls = mockFetch([{ data: [], page_context: { has_more: false } }]);
    await alOrc(CREDS).lines.list({ location: 'acme', include_archived: true });
    expect(calls[0].url).toContain('location=acme');
    expect(calls[0].url).toContain('include_archived=true');
  });

  it('getAll() flattens pages', async () => {
    mockFetch([
      { data: [{ id: 'l1' }], page_context: { has_more: true } },
      { data: [{ id: 'l2' }], page_context: { has_more: false } },
    ]);
    const all = await alOrc(CREDS).lines.getAll();
    expect(all.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  it('create() POSTs and update() PUTs by code', async () => {
    const calls = mockFetch([{ data: { id: 'l9', code: 'EM' } }, { data: { id: 'l9', code: 'EM', location: 'x' } }]);
    await alOrc(CREDS).lines.create({ code: 'EM', location: 'dev-laptop1' });
    await alOrc(CREDS).lines.update('EM', { location: 'x' });
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'https://orchestrator.assemblyline.sh/api/v1/lines' });
    expect(JSON.parse(calls[0].init.body)).toEqual({ code: 'EM', location: 'dev-laptop1' });
    expect(calls[1]).toMatchObject({ method: 'PUT', url: 'https://orchestrator.assemblyline.sh/api/v1/lines/EM' });
  });
});
