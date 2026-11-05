// @ts-check
/**
 * CLI credential store — reads/writes ~/.al/al-orc/config.yml (mode 0600) and
 * resolves which credentials the current command uses.
 *
 * Config lives under the shared family root ~/.al/ so every al-<tool>
 * keeps its config in one place. Path is home-dir based (os.homedir()) for
 * multi-OS support; not XDG. Override the whole dir with AL_ORC_CONFIG_DIR.
 *
 * CLI-only: the importable client (src/index.js) never imports this. CLI
 * handlers call resolveCredentials() and pass the result to alOrc() as the
 * `credentials`. Single tool, per-org (no per-app nesting).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * The family root, ~/.al. On the first run after the rename from ~/.assemblyline
 * the whole folder moves here.
 * Same move as al-control's familyRoot (its decision 0007).
 * @param {string} [home]
 * @returns {string}
 */
export function familyRoot(home = homedir()) {
  const root = join(home, '.al');
  const legacy = join(home, '.assemblyline');
  if (!existsSync(root) && existsSync(legacy)) {
    try {
      renameSync(legacy, root);
    } catch {
      // Another process moved it first.
    }
  }
  return root;
}

const CONFIG_DIR = process.env.AL_ORC_CONFIG_DIR || join(familyRoot(), 'al-orc');
const CONFIG_PATH = join(CONFIG_DIR, 'config.yml');

let org_override = null;

/** Set by the `--profile <name>` global flag (alias `--org`; yargs middleware). Beats current_org. */
export function setOrgOverride(name) {
  org_override = name;
}

export function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    const cfg = yaml.load(readFileSync(CONFIG_PATH, 'utf8')) || {};
    return { current_org: cfg.current_org ?? null, orgs: cfg.orgs ?? {} };
  }
  return { current_org: null, orgs: {} };
}

export function saveConfig(cfg) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, yaml.dump(cfg), { mode: 0o600 });
}

export function addOrg(name, { api_url, api_key, api_secret }) {
  const cfg = loadConfig();
  cfg.orgs[name] = { api_url, api_key, api_secret };
  if (!cfg.current_org) cfg.current_org = name;
  saveConfig(cfg);
  return cfg;
}

export function removeOrg(name) {
  const cfg = loadConfig();
  if (!cfg.orgs[name]) throw new Error(`No profile named '${name}'.`);
  delete cfg.orgs[name];
  if (cfg.current_org === name) cfg.current_org = Object.keys(cfg.orgs)[0] ?? null;
  saveConfig(cfg);
  return cfg;
}

export function useOrg(name) {
  const cfg = loadConfig();
  if (!cfg.orgs[name]) throw new Error(`No profile named '${name}'. Run \`al-orc config profiles add ${name}\`.`);
  cfg.current_org = name;
  saveConfig(cfg);
  return cfg;
}

/** Absolute path to the config file (shown in the `profiles list` footer). */
export function configPath() {
  return CONFIG_PATH;
}

/**
 * Profiles for display. Returns the current profile name, the config path, and
 * one row per profile with non-secret metadata only (api_url). Secrets are never
 * included.
 */
export function listProfiles() {
  const cfg = loadConfig();
  const profiles = Object.entries(cfg.orgs).map(([name, o]) => ({
    name,
    current: name === cfg.current_org,
    api_url: o.api_url,
  }));
  return { current: cfg.current_org, path: CONFIG_PATH, profiles };
}

/**
 * Resolve credentials for the current command from the config profiles.
 * Precedence: `--profile`/`--org` override > config `current_org`. The CLI's
 * credential model is profiles (config.yml); it does not read env — an env var
 * that silently overrode the active profile would be a footgun.
 * @returns {{ api_url: string, api_key: string, api_secret: string, name: string, source: string }}
 */
export function resolveCredentials() {
  const cfg = loadConfig();

  if (org_override) {
    const org = cfg.orgs[org_override];
    if (!org) throw new Error(`Profile '${org_override}' is not configured. Run \`al-orc config profiles add ${org_override}\`.`);
    return { ...org, name: org_override, source: `profile '${org_override}'` };
  }

  if (cfg.current_org && cfg.orgs[cfg.current_org]) {
    return { ...cfg.orgs[cfg.current_org], name: cfg.current_org, source: `profile '${cfg.current_org}'` };
  }

  throw new Error(
    'No orchestrator profile selected. Run `al-orc config profiles add <name>`, then `al-orc config profiles use <name>` (or pass --profile <name>).',
  );
}

/**
 * Non-secret description of the identity the CLI would use right now — the same
 * flag > current-profile resolution as resolveCredentials(), minus the secrets.
 * Returns null when nothing is configured. Powers `profiles current`.
 * @returns {{ api_url: string, source: string, name: string|null }|null}
 */
export function describeCurrent() {
  let creds;
  try {
    creds = resolveCredentials();
  } catch {
    return null;
  }
  const { api_key, api_secret, ...rest } = creds;
  return rest;
}
