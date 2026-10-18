import { jest } from '@jest/globals';

// Contract for the tags namespace, focusing on the name↔id helpers
// (resolveNames / ensure) that carry the only real branching in the client.
const { alOrc } = await import('../../src/index.js');

function mockFetch(responses) {
  const calls = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init, method: init?.method });
    const body = responses.shift() ?? { data: [] };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) };
  });
  return calls;
}

const CREDS = { api_url: 'https://orchestrator.assemblyline.sh', api_key: 'k', api_secret: 's' };

describe('tags resource namespace (via alOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('resolveNames() maps known names to ids', async () => {
    mockFetch([{ data: [{ id: 't1', name: 'daily' }, { id: 't2', name: 'urgent' }] }]);
    const ids = await alOrc(CREDS).tags.resolveNames(['urgent', 'daily']);
    expect(ids).toEqual(['t2', 't1']);
  });

  it('resolveNames() throws on an unknown name', async () => {
    mockFetch([{ data: [{ id: 't1', name: 'daily' }] }]);
    await expect(alOrc(CREDS).tags.resolveNames(['nope'])).rejects.toThrow('Unknown tag: nope');
  });

  it('ensure() returns an existing tag without creating', async () => {
    const calls = mockFetch([{ data: [{ id: 't1', name: 'daily' }] }]);
    const tag = await alOrc(CREDS).tags.ensure('daily');
    expect(tag).toEqual({ id: 't1', name: 'daily' });
    expect(calls.every((c) => c.method !== 'POST')).toBe(true);
  });

  it('ensure() creates a missing tag', async () => {
    const calls = mockFetch([{ data: [] }, { data: { id: 't9', name: 'new' } }]);
    const tag = await alOrc(CREDS).tags.ensure('new');
    expect(tag).toEqual({ id: 't9', name: 'new' });
    const post = calls.find((c) => c.method === 'POST');
    expect(post.url).toBe('https://orchestrator.assemblyline.sh/api/v1/tags');
    expect(JSON.parse(post.init.body)).toEqual({ name: 'new' });
  });
});
