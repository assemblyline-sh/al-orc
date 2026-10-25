// @ts-check
/**
 * `al-orc login` — get API keys without copying them from the settings page. Starts a login
 * request on the Orchestrator (sending the key ids of the existing profiles, so the approve
 * page shows those orgs as already connected), opens the approve page in the browser (or
 * prints its URL), polls until the user picks orgs and approves, then saves one profile per
 * org. The current profile changes only when there was none.
 */
import { hostname } from 'node:os';
import { spawn } from 'node:child_process';
import { addOrg, loadConfig } from './config-store.js';

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
 * @returns {Promise<{ keys: Array<{ org: { id: string, name: string }, api_key: string, api_secret: string }> }>}
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

/**
 * Profile name from the org name ("Alex's org" → "alex-s-org"). A name already used by a profile
 * gets the org id appended, so an existing profile is never overwritten.
 * @param {{ id: string, name: string }} org
 * @param {Set<string>} taken
 */
export function profileName(org, taken) {
  const base = (org.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || org.id;
  return taken.has(base) ? `${base}-${org.id}` : base;
}

export async function loginHandler(argv) {
  const api_url = argv.apiUrl.replace(/\/+$/, '');
  const cfg = loadConfig();
  const known_keys = Object.values(cfg.orgs).map((o) => o.api_key).filter(Boolean);
  const start = await postJson(`${api_url}/api/cli/login`, { name: `al-orc on ${hostname()}`, known_keys });
  if (start.status !== 201) {
    throw new Error(start.error?.message || `Could not start a login on ${api_url} (HTTP ${start.status}).`);
  }
  const { device_code, verification_url, expires_in } = start.data;

  console.log('Pick the orgs to add and approve in your browser:');
  console.log(`  ${verification_url}`);
  if (argv.browser) openBrowser(verification_url);
  console.log('Waiting for approval…');

  const { keys } = await pollForKey({ api_url, device_code, expires_in });
  const taken = new Set(Object.keys(cfg.orgs));
  for (const { org, api_key, api_secret } of keys) {
    const name = profileName(org, taken);
    taken.add(name);
    addOrg(name, { api_url, api_key, api_secret });
    console.log(`Added profile '${name}' for ${org.name}.`);
  }

  const { current_org } = loadConfig();
  if (cfg.current_org) {
    console.log(`Current profile is still '${current_org}'. Switch with \`al-orc config profiles use <name>\`.`);
  } else {
    console.log(`Current profile: '${current_org}'.`);
  }
}
