/**
 * CLI credential store — reads/writes ~/.fob/fob-orc/config.yml (mode 0600) and
 * resolves which credentials the current command uses.
 *
 * Config lives under the shared family root ~/.fob/ so every fob-<tool> wrapper
 * keeps its config in one place. Path is home-dir based (os.homedir()) for
 * multi-OS support; not XDG. Override the whole dir with FOB_ORC_CONFIG_DIR.
 *
 * CLI-only: the importable client (src/index.js) never imports this. CLI
 * handlers call resolveCredentials() and pass the result to fobOrc() as the
 * `credentials`. Single tool, per-org (no per-app nesting).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import yaml from 'js-yaml';

const CONFIG_DIR = process.env.FOB_ORC_CONFIG_DIR || join(homedir(), '.fob', 'fob-orc');
const CONFIG_PATH = join(CONFIG_DIR, 'config.yml');

let orgOverride = null;

/** Set by the `--profile <name>` global flag (alias `--org`; yargs middleware). Beats current_org. */
export function setOrgOverride(name) {
  orgOverride = name;
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
  if (!cfg.orgs[name]) throw new Error(`No profile named '${name}'. Run \`fob-orc config profiles add ${name}\`.`);
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
 * @returns {{ api_url: string, api_key: string, api_secret: string, source: string }}
 */
export function resolveCredentials() {
  const cfg = loadConfig();

  if (orgOverride) {
    const org = cfg.orgs[orgOverride];
    if (!org) throw new Error(`Profile '${orgOverride}' is not configured. Run \`fob-orc config profiles add ${orgOverride}\`.`);
    return { ...org, name: orgOverride, source: `profile '${orgOverride}'` };
  }

  if (cfg.current_org && cfg.orgs[cfg.current_org]) {
    return { ...cfg.orgs[cfg.current_org], name: cfg.current_org, source: `profile '${cfg.current_org}'` };
  }

  throw new Error(
    'No orchestrator profile selected. Run `fob-orc config profiles add <name>`, then `fob-orc config profiles use <name>` (or pass --profile <name>).',
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
