import { jest } from '@jest/globals';

// Data-layer contract for the stations namespace. Exercises the real
// alOrc -> resources/stations -> http.js path with a mocked global fetch (no
// module mocks), so URL building (the /processes/* API contract), credential
// binding, category-based return shapes, and pagination are all under test.
const { alOrc } = await import('../../src/index.js');

/** Queue fetch responses; each call shifts the next. Records requests. */
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

describe('stations resource namespace (via alOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('get() returns the unwrapped record and hits the /processes/* contract path', async () => {
    const calls = mockFetch([{ data: { id: 'p1', name: 'VendorMatch' } }]);
    const station = await alOrc(CREDS).stations.get('p1');
    expect(station).toEqual({ id: 'p1', name: 'VendorMatch' });
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/stations/p1');
  });

  it('list() returns the { data, page_context } envelope and forwards filters', async () => {
    const calls = mockFetch([{ data: [{ id: 'p1' }], page_context: { has_more: false } }]);
    const res = await alOrc(CREDS).stations.list({ tag: 'daily', include_archived: true });
    expect(res.data).toEqual([{ id: 'p1' }]);
    expect(calls[0].url).toContain('tag=daily');
    expect(calls[0].url).toContain('include_archived=true');
  });

  it('getAll() flattens pages into a plain array', async () => {
    mockFetch([
      { data: [{ id: 'p1' }, { id: 'p2' }], page_context: { has_more: true } },
      { data: [{ id: 'p3' }], page_context: { has_more: false } },
    ]);
    const all = await alOrc(CREDS).stations.getAll();
    expect(all.map((s) => s.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('create() POSTs to /api/v1/stations and returns the created record', async () => {
    const calls = mockFetch([{ data: { id: 'p9', name: 'New' } }]);
    const created = await alOrc(CREDS).stations.create({ name: 'New' });
    expect(created).toEqual({ id: 'p9', name: 'New' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/stations');
    expect(JSON.parse(calls[0].init.body)).toEqual({ name: 'New' });
  });

  it('archive() POSTs to the canonical /stations/* surface (not /processes/*)', async () => {
    const calls = mockFetch([{ data: { id: 'p1', archived: true } }]);
    await alOrc(CREDS).stations.archive('p1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/stations/p1/archive');
  });

  it('run() POSTs step_overrides and returns { work_record_id }', async () => {
    const calls = mockFetch([{ data: { work_record_id: 'wr9' } }]);
    const res = await alOrc(CREDS).stations.run('VM3', { overrides: { dry_run: true } });
    expect(res).toEqual({ work_record_id: 'wr9' });
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/stations/VM3/run');
    expect(JSON.parse(calls[0].init.body)).toEqual({ step_overrides: { dry_run: true } });
  });

  it('binds credentials per client (multi-org)', async () => {
    const calls = mockFetch([{ data: { id: 'p1' } }, { data: { id: 'p1' } }]);
    await alOrc({ ...CREDS, api_key: 'orgA' }).stations.get('p1');
    await alOrc({ ...CREDS, api_key: 'orgB' }).stations.get('p1');
    expect(calls[0].init.headers['api-key']).toBe('orgA');
    expect(calls[1].init.headers['api-key']).toBe('orgB');
  });
});

describe('work-records resource namespace (via alOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('list() sends the station filter as ?station=', async () => {
    const calls = mockFetch([{ data: [{ id: 'wr1' }], page_context: { has_more: false } }]);
    await alOrc(CREDS).workRecords.list({ station: 'p1', status: 'running' });
    expect(calls[0].url).toContain('station=p1');
    expect(calls[0].url).toContain('status=running');
    expect(calls[0].url).not.toContain('process=');
  });

  it('cancel() POSTs to the cancel path', async () => {
    const calls = mockFetch([{ data: { id: 'wr1', status: 'cancelled' } }]);
    await alOrc(CREDS).workRecords.cancel('wr1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.assemblyline.sh/api/v1/work-records/wr1/cancel');
  });
});
