import { jest } from '@jest/globals';

// Contract for the worker-sessions namespace, plus the collision detector that
// carries the only real branching on the CLI side.
const { fobOrc } = await import('../../src/index.js');
const { findLocationCollisions } = await import('../../src/cli/worker-sessions/list.js');

function mockFetch(responses) {
  const calls = [];
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url: String(url), init, method: init?.method });
    const body = responses.shift() ?? { data: [] };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body) };
  });
  return calls;
}

const CREDS = { api_url: 'https://orchestrator.finopsbricks.com', api_key: 'k', api_secret: 's' };

describe('workerSessions resource namespace (via fobOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('list() hits /api/v1/worker-sessions and returns the envelope', async () => {
    const calls = mockFetch([{ data: [{ id: 'OJz4vMuKJ096' }], page_context: { total: 1 } }]);
    const res = await fobOrc(CREDS).workerSessions.list();

    expect(calls[0].url).toContain('/api/v1/worker-sessions');
    expect(res.data).toEqual([{ id: 'OJz4vMuKJ096' }]);
    expect(res.page_context).toEqual({ total: 1 });
  });

  it('list() passes filters through as query params', async () => {
    const calls = mockFetch([{ data: [] }]);
    await fobOrc(CREDS).workerSessions.list({ status: 'active', location: 'dev-laptop1' });

    expect(calls[0].url).toContain('status=active');
    expect(calls[0].url).toContain('location=dev-laptop1');
  });

  it('get() unwraps the single record', async () => {
    mockFetch([{ data: { id: '8ctRxo4aXw4J', slug_breakdown: [] } }]);
    const session = await fobOrc(CREDS).workerSessions.get('8ctRxo4aXw4J');

    expect(session.id).toBe('8ctRxo4aXw4J');
  });

  it('get() encodes the id', async () => {
    const calls = mockFetch([{ data: null }]);
    await fobOrc(CREDS).workerSessions.get('a/b');

    expect(calls[0].url).toContain('/api/v1/worker-sessions/a%2Fb');
  });
});

describe('findLocationCollisions', () => {
  const active = (id, location, extra = {}) => ({
    id, location, status: 'active', worker_version: '0.32.0', cwd: '/w', ...extra,
  });

  it('is silent for one worker per location', () => {
    expect(findLocationCollisions([
      active('a', 'dev-laptop1'),
      active('b', 'acme'),
    ])).toEqual([]);
  });

  it('flags the 2026-08-11 incident: two versions on one location', () => {
    const found = findLocationCollisions([
      active('OJz4vMuKJ096', 'dev-laptop1', { worker_version: '0.32.0', cwd: '/home/dev/w' }),
      active('8ctRxo4aXw4J', 'dev-laptop1', { worker_version: '0.25.0', cwd: '/home/dev/w' }),
    ]);

    expect(found).toHaveLength(1);
    expect(found[0].location).toBe('dev-laptop1');
    expect(found[0].count).toBe(2);
    expect(found[0].versions.sort()).toEqual(['0.25.0', '0.32.0']);
  });

  it('ignores expired sessions — only concurrent workers collide', () => {
    expect(findLocationCollisions([
      active('a', 'dev-laptop1'),
      { id: 'b', location: 'dev-laptop1', status: 'expired', worker_version: '0.25.0' },
    ])).toEqual([]);
  });

  it('still reports same-version workers sharing a location', () => {
    // Legitimate scale-out in principle, but never intended under D1 — and
    // differing cwds would still split workpiece bundles across filesystems.
    const found = findLocationCollisions([
      active('a', 'shared', { cwd: '/one' }),
      active('b', 'shared', { cwd: '/two' }),
    ]);

    expect(found).toHaveLength(1);
    expect(found[0].versions).toEqual(['0.32.0']);
    expect(found[0].cwds.sort()).toEqual(['/one', '/two']);
  });
});
