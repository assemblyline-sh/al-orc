import { jest } from '@jest/globals';

// Data-layer contract for the work-records namespace. Exercises the real
// fobOrc -> resources/work-records -> http.js path with a mocked global fetch,
// so the caller-param -> API-param mapping is under test: callers say
// `station`, the API contract still says `process`.
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

describe('work-records resource namespace (via fobOrc)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps `station` onto the API `process` param', async () => {
    const calls = mockFetch([{ data: [], page_context: { has_more: false } }]);

    await fobOrc(CREDS).workRecords.list({ station: 'EM0' });

    expect(calls[0].url).toContain('process=EM0');
    expect(calls[0].url).not.toContain('station=');
  });

  it('forwards `line` as-is', async () => {
    const calls = mockFetch([{ data: [], page_context: { has_more: false } }]);

    await fobOrc(CREDS).workRecords.list({ line: 'VM' });

    expect(calls[0].url).toContain('line=VM');
  });

  it('sends station and line together so the API can intersect them', async () => {
    const calls = mockFetch([{ data: [], page_context: { has_more: false } }]);

    await fobOrc(CREDS).workRecords.list({ line: 'VM', station: 'VM3' });

    expect(calls[0].url).toContain('line=VM');
    expect(calls[0].url).toContain('process=VM3');
  });

  it('omits absent filters rather than sending empty values', async () => {
    const calls = mockFetch([{ data: [], page_context: { has_more: false } }]);

    await fobOrc(CREDS).workRecords.list({ status: 'completed' });

    expect(calls[0].url).toContain('status=completed');
    expect(calls[0].url).not.toContain('line=');
    expect(calls[0].url).not.toContain('process=');
    expect(calls[0].url).not.toContain('tag=');
  });

  it('getAll() forwards the same filters while walking pages', async () => {
    const calls = mockFetch([
      { data: [{ id: 'r1' }], page_context: { has_more: false } },
    ]);

    const records = await fobOrc(CREDS).workRecords.getAll({ line: 'VM' });

    expect(records).toEqual([{ id: 'r1' }]);
    expect(calls[0].url).toContain('line=VM');
  });
});
