import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// End-to-end for the pull/push bridges: a mocked orchestrator + a temp working
// dir. Verifies the round-trip is lossless — dependency short_code↔id conversion,
// tag object→name→id handling, and the id/created_at/org/tags payload stripping.

const REMOTE = {
  p1: { id: 'p1', short_code: 'VM3', line: 'VM', name: 'Vendor Match', dependencies: ['p2'], tags: [{ id: 't1', name: 'daily' }] },
  p2: { id: 'p2', short_code: 'AP1', line: 'AP', name: 'AP Intake', dependencies: [] },
};
const LINES = [
  { id: 'l1', code: 'VM', name: 'VM', location: 'alex-laptop1', stations: [] },
  { id: 'l2', code: 'AP', name: 'AP', location: 'nowapps3', stations: [] },
];

function installFetch(calls) {
  global.fetch = jest.fn(async (url, init = {}) => {
    const method = init.method || 'GET';
    const p = url.pathname;
    calls.push({ method, path: p, body: init.body ? JSON.parse(init.body) : undefined });
    let data;
    if (method === 'GET' && p === '/api/v1/lines') data = LINES;
    else if (method === 'PUT' && p.startsWith('/api/v1/lines/')) data = LINES.find((l) => p.endsWith(l.id));
    else if (method === 'GET' && p === '/api/v1/processes') data = Object.values(REMOTE);
    else if (method === 'GET' && p.startsWith('/api/v1/processes/')) data = REMOTE[p.split('/').pop()];
    else if (method === 'GET' && p === '/api/v1/tags') data = [{ id: 't1', name: 'daily' }];
    else if (method === 'PUT' && p.endsWith('/tags')) data = [];
    else data = { id: p.split('/').pop() };
    return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ data }) };
  });
}

const originalCwd = process.cwd();
let pullStationsHandler, pushStationsHandler;

beforeAll(async () => {
  const cfgDir = mkdtempSync(join(tmpdir(), 'orc-cfg-'));
  process.env.FOB_ORC_CONFIG_DIR = cfgDir;
  writeFileSync(
    join(cfgDir, 'config.yml'),
    'current_org: acme\norgs:\n  acme:\n    api_url: https://orchestrator.finopsbricks.com\n    api_key: k\n    api_secret: s\n',
  );
  const work = mkdtempSync(join(tmpdir(), 'orc-work-'));
  process.chdir(work);
  ({ pullStationsHandler } = await import('../../src/cli/stations/pull.js'));
  ({ pushStationsHandler } = await import('../../src/cli/stations/push.js'));
});

afterAll(() => process.chdir(originalCwd));
afterEach(() => jest.restoreAllMocks());

describe('stations pull/push bridge', () => {
  it('pull writes local files with deps as short_codes and tags as names', async () => {
    installFetch([]);
    await pullStationsHandler({ all: true });

    const files = readdirSync('.orchestrator/stations').sort();
    expect(files).toEqual(['AP1__ap_intake.json', 'VM3__vendor_match.json']);
    expect(readdirSync('.orchestrator/lines').sort()).toEqual(['AP.json', 'VM.json']); // lines come along

    const vm3 = JSON.parse(readFileSync('.orchestrator/stations/VM3__vendor_match.json', 'utf8'));
    expect(vm3.dependencies).toEqual(['AP1']); // p2 → AP1
    expect(vm3.tags).toEqual(['daily']); // object → name
  });

  it('push resolves deps back to ids, strips id/tags from payload, and syncs tags separately', async () => {
    const calls = [];
    installFetch(calls);
    await pushStationsHandler({ all: true });

    const put1 = calls.find((c) => c.method === 'PUT' && c.path === '/api/v1/processes/p1');
    expect(put1.body.dependencies).toEqual(['p2']); // AP1 → p2
    expect(put1.body).not.toHaveProperty('id'); // stripped
    expect(put1.body).not.toHaveProperty('tags'); // stripped
    expect(put1.body.line).toBe('VM'); // line travels as its code; the server resolves it

    const tagsPut = calls.find((c) => c.path === '/api/v1/processes/p1/tags');
    expect(tagsPut.body).toEqual({ tags: ['t1'] }); // name 'daily' → id 't1'
  });
});
