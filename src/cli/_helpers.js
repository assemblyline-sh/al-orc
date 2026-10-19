// @ts-check
/**
 * Shared yargs helpers.
 */

import { resolveCredentials } from './config-store.js';
import { alOrc } from '../index.js';

/**
 * Wrap a handler so unexpected exceptions exit cleanly without a stack trace.
 * Set AL_DEBUG=1 to see the full stack.
 */
export function safe(handler) {
  return async (argv) => {
    try {
      await handler(argv);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      if (process.env.AL_DEBUG) console.error(err.stack);
      process.exit(1);
    }
  };
}

/**
 * Register a command's own "Options:" group so it renders *above* the inherited
 * "Global Options:". yargs merges an instance's groups before the preserved
 * global ones, and otherwise materialises the default "Options:" group last — so
 * pre-creating it on the command instance is what fixes the order. Call at the
 * start of a command's builder; ungrouped options then fall into this group.
 */
export function localOptions(yargs) {
  return yargs.group([], 'Options:');
}

/** Standard pagination + JSON output options for list commands. */
export function paginationOptions(yargs) {
  return localOptions(yargs)
    .option('page', { describe: 'Page number', type: 'number', default: 1 })
    .option('limit', { describe: 'Page size (max 500)', type: 'number', default: 100 })
    .option('json', { describe: 'Output raw JSON', type: 'boolean' });
}

// Print the credential-source hint at most once per invocation.
let hintPrinted = false;

/**
 * Resolve the current command's credentials from the CLI config, printing a
 * one-time hint to stderr about which identity is in use. Handlers pass the
 * returned object to alOrc() as the `credentials`.
 */
export function requireCreds() {
  const creds = resolveCredentials();
  if (!hintPrinted) {
    console.error(`(using orchestrator credentials from ${creds.source})`);
    hintPrinted = true;
  }
  return creds;
}

/**
 * Build a credential-bound `alOrc` client for the current command — the same
 * client factories construct, so a handler exercises the exact library path.
 * Prints the one-time credential-source hint via requireCreds().
 */
export function clientFor() {
  return alOrc(requireCreds());
}
