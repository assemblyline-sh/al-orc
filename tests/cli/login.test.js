// `al-orc login` polls /api/cli/token until the request is approved, and stops on expiry.
const { pollForKey } = await import('../../src/cli/login.js');

/** @param {Array<{ status: number, body: Object }>} replies */
function fetchReplying(replies) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const { status, body } = replies.shift();
    return { status, json: async () => body };
  };
  return calls;
}

describe('pollForKey', () => {
  it('waits while pending and returns the key once approved', async () => {
    const approved = { status: 'approved', org: { id: 'org_me', name: "Alex's org" }, api_key: 'al_k', api_secret: 's' };
    const calls = fetchReplying([
      { status: 200, body: { data: { status: 'pending' } } },
      { status: 200, body: { data: approved } },
    ]);
    const result = await pollForKey({ api_url: 'https://orch.test', device_code: 'dc', expires_in: 60, interval_ms: 0 });
    expect(result).toEqual(approved);
    expect(calls).toEqual([
      { url: 'https://orch.test/api/cli/token', body: { device_code: 'dc' } },
      { url: 'https://orch.test/api/cli/token', body: { device_code: 'dc' } },
    ]);
  });

  it("stops with the server's message when the request is gone", async () => {
    fetchReplying([{ status: 410, body: { error: { code: 'EXPIRED', message: 'This login request has expired or was already used' } } }]);
    await expect(pollForKey({ api_url: 'https://orch.test', device_code: 'dc', expires_in: 60, interval_ms: 0 }))
      .rejects.toThrow(/expired or was already used/);
  });

  it('gives up when its own deadline passes', async () => {
    fetchReplying([]);
    await expect(pollForKey({ api_url: 'https://orch.test', device_code: 'dc', expires_in: 0, interval_ms: 0 }))
      .rejects.toThrow(/expired/);
  });
});
