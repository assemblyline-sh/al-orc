import { jest } from '@jest/globals';

// Data-layer contract for the stations namespace. Exercises the real
// fobOrc -> resources/stations -> http.js path with a mocked global fetch (no
// module mocks), so URL building (the /processes/* API contract), credential
// binding, category-based return shapes, and pagination are all under test.
const { fobOrc } = await import('../../src/index.js');

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

const CREDS = { api_url: 'https://orchestrator.finopsbricks.com', api_key: 'k', api_secret: 's' };

describe('stations resource namespace (via fobOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('get() returns the unwrapped record and hits the /processes/* contract path', async () => {
    const calls = mockFetch([{ data: { id: 'p1', name: 'VendorMatch' } }]);
    const station = await fobOrc(CREDS).stations.get('p1');
    expect(station).toEqual({ id: 'p1', name: 'VendorMatch' });
    expect(calls[0].url).toBe('https://orchestrator.finopsbricks.com/api/v1/processes/p1');
  });

  it('list() returns the { data, page_context } envelope and forwards filters', async () => {
    const calls = mockFetch([{ data: [{ id: 'p1' }], page_context: { has_more: false } }]);
    const res = await fobOrc(CREDS).stations.list({ tag: 'daily', include_archived: true });
    expect(res.data).toEqual([{ id: 'p1' }]);
    expect(calls[0].url).toContain('tag=daily');
    expect(calls[0].url).toContain('include_archived=true');
  });

  it('getAll() flattens pages into a plain array', async () => {
    mockFetch([
      { data: [{ id: 'p1' }, { id: 'p2' }], page_context: { has_more: true } },
      { data: [{ id: 'p3' }], page_context: { has_more: false } },
    ]);
    const all = await fobOrc(CREDS).stations.getAll();
    expect(all.map((s) => s.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('create() POSTs to /api/v1/processes and returns the created record', async () => {
    const calls = mockFetch([{ data: { id: 'p9', name: 'New' } }]);
    const created = await fobOrc(CREDS).stations.create({ name: 'New' });
    expect(created).toEqual({ id: 'p9', name: 'New' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.finopsbricks.com/api/v1/processes');
    expect(JSON.parse(calls[0].init.body)).toEqual({ name: 'New' });
  });

  it('archive() POSTs to the canonical /stations/* surface (not /processes/*)', async () => {
    const calls = mockFetch([{ data: { id: 'p1', archived: true } }]);
    await fobOrc(CREDS).stations.archive('p1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.finopsbricks.com/api/v1/stations/p1/archive');
  });

  it('run() POSTs step_overrides and returns { work_record_id }', async () => {
    const calls = mockFetch([{ data: { work_record_id: 'wr9' } }]);
    const res = await fobOrc(CREDS).stations.run('VM3', { overrides: { dry_run: true } });
    expect(res).toEqual({ work_record_id: 'wr9' });
    expect(calls[0].url).toBe('https://orchestrator.finopsbricks.com/api/v1/processes/VM3/run');
    expect(JSON.parse(calls[0].init.body)).toEqual({ step_overrides: { dry_run: true } });
  });

  it('binds credentials per client (multi-org)', async () => {
    const calls = mockFetch([{ data: { id: 'p1' } }, { data: { id: 'p1' } }]);
    await fobOrc({ ...CREDS, api_key: 'orgA' }).stations.get('p1');
    await fobOrc({ ...CREDS, api_key: 'orgB' }).stations.get('p1');
    expect(calls[0].init.headers['api-key']).toBe('orgA');
    expect(calls[1].init.headers['api-key']).toBe('orgB');
  });
});

describe('work-records resource namespace (via fobOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('list() maps the station filter to the ?process= API param', async () => {
    const calls = mockFetch([{ data: [{ id: 'wr1' }], page_context: { has_more: false } }]);
    await fobOrc(CREDS).workRecords.list({ station: 'p1', status: 'running' });
    expect(calls[0].url).toContain('process=p1');
    expect(calls[0].url).toContain('status=running');
    expect(calls[0].url).not.toContain('station=');
  });

  it('cancel() POSTs to the cancel path', async () => {
    const calls = mockFetch([{ data: { id: 'wr1', status: 'cancelled' } }]);
    await fobOrc(CREDS).workRecords.cancel('wr1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://orchestrator.finopsbricks.com/api/v1/work-records/wr1/cancel');
  });
});
