// @ts-check
/**
 * `al-orc login` — get an API key without copying one from the settings page. Starts a login
 * request on the Orchestrator, opens the approve page in the browser (or prints its URL), polls
 * until the user approves, then saves the key as a profile and makes it current.
 */
import { hostname } from 'node:os';
import { spawn } from 'node:child_process';
import { addOrg, useOrg } from './config-store.js';

const POLL_INTERVAL_MS = 2000;

/**
 * @param {string} url
 * @param {Object} body
 */
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data, error: json.error };
}

/** Best effort: the URL is always printed too, for SSH sessions and headless machines. */
function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  } catch {
    // printed URL is the fallback
  }
}

/**
 * Poll /api/cli/token until the request is approved or expires.
 * @param {{ api_url: string, device_code: string, expires_in: number, interval_ms?: number }} args
 * @returns {Promise<{ org: { id: string, name: string|null }, api_key: string, api_secret: string }>}
 */
export async function pollForKey({ api_url, device_code, expires_in, interval_ms = POLL_INTERVAL_MS }) {
  const deadline = Date.now() + expires_in * 1000;
  while (Date.now() < deadline) {
    const { status, data, error } = await postJson(`${api_url}/api/cli/token`, { device_code });
    if (status === 200 && data?.status === 'approved') return data;
    if (status !== 200) throw new Error(error?.message || `Login failed (HTTP ${status}). Run \`al-orc login\` again.`);
    await new Promise((resolve) => setTimeout(resolve, interval_ms));
  }
  throw new Error('Login request expired. Run `al-orc login` again.');
}

/** Profile name from the org name, e.g. "Alex's org" → "alex-s-org". */
function profileName(org) {
  return (org.name || org.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || org.id;
}

export async function loginHandler(argv) {
  const api_url = argv.apiUrl.replace(/\/+$/, '');
  const start = await postJson(`${api_url}/api/cli/login`, { name: `al-orc on ${hostname()}` });
  if (start.status !== 201) {
    throw new Error(start.error?.message || `Could not start a login on ${api_url} (HTTP ${start.status}).`);
  }
  const { device_code, verification_url, expires_in } = start.data;

  console.log('Approve this sign-in in your browser:');
  console.log(`  ${verification_url}`);
  if (argv.browser) openBrowser(verification_url);
  console.log('Waiting for approval…');

  const { org, api_key, api_secret } = await pollForKey({ api_url, device_code, expires_in });
  const name = argv.name || profileName(org);
  addOrg(name, { api_url, api_key, api_secret });
  useOrg(name);
  console.log(`Signed in to ${org.name ?? org.id}. Saved as profile '${name}' (now current).`);
}
