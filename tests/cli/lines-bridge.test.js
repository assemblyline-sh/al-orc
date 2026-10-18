import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// End-to-end for the lines pull/push bridge and its coupling to stations:
// `stations pull --all` pulls lines first; `stations push --all` pushes lines
// first and strips a stale per-station `location`.

const LINES = {
  l1: { id: 'l1', code: 'VM', name: 'Voice memos', description: null, location: 'dev-laptop1', stations: [{ id: 'p1', short_code: 'VM3', name: 'Vendor Match' }] },
};
const STATIONS = {
  p1: { id: 'p1', short_code: 'VM3', line: 'VM', name: 'Vendor Match', dependencies: [] },
};

function installFetch(calls) {
  global.fetch = jest.fn(async (url, init = {}) => {
    const method = init.method || 'GET';
    const p = url.pathname;
    calls.push({ method, path: p, body: init.body ? JSON.parse(init.body) : undefined });
    let data;
    if (method === 'GET' && p === '/api/v1/lines') data = Object.values(LINES);
    else if (method === 'GET' && p.startsWith('/api/v1/lines/')) data = Object.values(LINES).find((l) => l.code === p.split('/').pop());
    else if (method === 'POST' && p === '/api/v1/lines') data = { id: 'l_new', ...init.body && JSON.parse(init.body) };
    else if (method === 'PUT' && p.startsWith('/api/v1/lines/')) data = { ...LINES.l1, ...JSON.parse(init.body) };
    else if (method === 'GET' && p === '/api/v1/stations') data = Object.values(STATIONS);
    else if (method === 'GET' && p.startsWith('/api/v1/stations/')) data = STATIONS[p.split('/').pop()];
    else if (method === 'GET' && p === '/api/v1/tags') data = [];
    else data = { id: p.split('/').pop() };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ data }) };
  });
}

const originalCwd = process.cwd();
let pullLinesHandler, pushLinesHandler, pullStationsHandler, pushStationsHandler;

beforeAll(async () => {
  const cfgDir = mkdtempSync(join(tmpdir(), 'orc-cfg-'));
  process.env.AL_ORC_CONFIG_DIR = cfgDir;
  writeFileSync(
    join(cfgDir, 'config.yml'),
    'current_org: acme\norgs:\n  acme:\n    api_url: https://orchestrator.assemblyline.sh\n    api_key: k\n    api_secret: s\n',
  );
  process.chdir(mkdtempSync(join(tmpdir(), 'orc-work-')));
  ({ pullLinesHandler } = await import('../../src/cli/lines/pull.js'));
  ({ pushLinesHandler } = await import('../../src/cli/lines/push.js'));
  ({ pullStationsHandler } = await import('../../src/cli/stations/pull.js'));
  ({ pushStationsHandler } = await import('../../src/cli/stations/push.js'));
});

afterAll(() => process.chdir(originalCwd));
afterEach(() => jest.restoreAllMocks());

describe('lines pull/push bridge', () => {
  it('pull writes <CODE>.json with only the local fields (no stations list)', async () => {
    installFetch([]);
    await pullLinesHandler({ all: true });

    expect(readdirSync('.orchestrator/lines')).toEqual(['VM.json']);
    const vm = JSON.parse(readFileSync('.orchestrator/lines/VM.json', 'utf8'));
    expect(vm).toEqual({ id: 'l1', code: 'VM', name: 'Voice memos', description: null, location: 'dev-laptop1' });
  });

  it('push updates a line with an id and creates one without, rewriting the file with the new id', async () => {
    const calls = [];
    installFetch(calls);
    mkdirSync('.orchestrator/lines', { recursive: true });
    writeFileSync('.orchestrator/lines/EM.json', JSON.stringify({ code: 'EM', name: 'Email', location: 'dev-laptop1' }));

    await pushLinesHandler({ all: true });

    const put = calls.find((c) => c.method === 'PUT' && c.path === '/api/v1/lines/l1');
    expect(put.body).toEqual({ code: 'VM', name: 'Voice memos', description: null, location: 'dev-laptop1' });
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/v1/lines');
    expect(post.body).toEqual({ code: 'EM', name: 'Email', location: 'dev-laptop1' });
    expect(JSON.parse(readFileSync('.orchestrator/lines/EM.json', 'utf8')).id).toBe('l_new');
  });

  it('stations pull --all pulls lines first, and station files carry line but never location', async () => {
    installFetch([]);
    await pullStationsHandler({ all: true });

    expect(existsSync('.orchestrator/lines/VM.json')).toBe(true);
    const vm3 = JSON.parse(readFileSync('.orchestrator/stations/VM3__vendor_match.json', 'utf8'));
    expect(vm3.line).toBe('VM');
    expect(vm3).not.toHaveProperty('location');
  });

  it('stations push --all pushes lines before stations and strips a stale station location', async () => {
    const calls = [];
    installFetch(calls);
    const file = '.orchestrator/stations/VM3__vendor_match.json';
    const station = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...station, location: 'dev-laptop' }));

    await pushStationsHandler({ all: true });

    const first_line_call = calls.findIndex((c) => c.path.startsWith('/api/v1/lines') && c.method !== 'GET');
    const first_station_call = calls.findIndex((c) => c.path.startsWith('/api/v1/stations') && c.method !== 'GET');
    expect(first_line_call).toBeGreaterThanOrEqual(0);
    expect(first_line_call).toBeLessThan(first_station_call);

    const put = calls.find((c) => c.method === 'PUT' && c.path === '/api/v1/stations/p1');
    expect(put.body).not.toHaveProperty('location');
    expect(put.body.line).toBe('VM');
  });

  it('stations push refuses a station file with no line', async () => {
    installFetch([]);
    writeFileSync('.orchestrator/stations/ZZ1__nope.json', JSON.stringify({ short_code: 'ZZ1', name: 'nope', steps: [] }));

    await expect(pushStationsHandler({ id: 'ZZ1__nope.json' })).rejects.toThrow(/has no "line"/);
  });
});
