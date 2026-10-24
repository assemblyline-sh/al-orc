// @ts-check
/**
 * CLI entry point — three-level command tree:
 *
 *   al-orc <resource> <action> [target] [options]
 *
 * The orchestrator control plane (canonical line and station definitions, work
 * records, tags, supporting docs). Credentials come from ~/.assemblyline/al-orc/config.yml;
 * `config` manages them. (Bins and pm2 live in `al-control`; running a step
 * is lib-factory's `factory` command. Not here.)
 */

import yargs from 'yargs';

import { setOrgOverride } from './config-store.js';
import { buildConfigSubcommands } from './config/index.js';
import { buildLinesSubcommands } from './lines/index.js';
import { buildStationsSubcommands } from './stations/index.js';
import { buildWorkRecordsSubcommands } from './work-records/index.js';
import { buildTagsSubcommands } from './tags/index.js';
import { buildSupportingDocsSubcommands } from './supporting-docs/index.js';
import { buildFactorySessionsSubcommands } from './factory-sessions/index.js';
import { safe, localOptions } from './_helpers.js';
import { statusHandler } from './status.js';
import { loginHandler } from './login.js';
import { DEFAULT_API_URL } from '../http.js';

export function run(argv) {
  return yargs(argv)
    .scriptName('al-orc')
    .usage('$0 <resource> <action> [target] [options]')
    .option('profile', {
      alias: 'org',
      describe: 'Use credentials from a specific configured profile (overrides current)',
      type: 'string',
    })
    .middleware((argv) => {
      if (argv.profile) setOrgOverride(argv.profile);
    })
    .command(
      'login [name]',
      'Sign in through the browser and save an API key as a profile',
      (y) =>
        localOptions(y.positional('name', { describe: 'Profile name (default: from the org name)', type: 'string' }))
          .option('api-url', { describe: 'Orchestrator URL (origin only)', type: 'string', default: DEFAULT_API_URL })
          .option('browser', { describe: 'Open the approve page; --no-browser only prints its URL', type: 'boolean', default: true }),
      safe(loginHandler),
    )
    .command('config <resource>', 'Manage credential profiles (alias: orgs)', buildConfigSubcommands)
    .command('lines <action>', 'Manage lines (a line owns the location its stations run at)', buildLinesSubcommands)
    .command('stations <action>', 'Query and run stations (orchestrator definitions)', buildStationsSubcommands)
    .command('work-records <action>', 'Query and manage work records', buildWorkRecordsSubcommands)
    .command('tags <action>', 'Manage tags', buildTagsSubcommands)
    .command('supporting-docs <action>', 'View and download supporting documents', buildSupportingDocsSubcommands)
    .command('factory-sessions <action>', 'Inspect factory sessions and what they ran', buildFactorySessionsSubcommands)
    .command(
      'status',
      'Check connectivity to the orchestrator (active profile)',
      (y) => localOptions(y).option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(statusHandler),
    )
    .demandCommand(1, 'Specify a resource. Try `al-orc --help`.')
    .strict()
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')
    // Global options (inherited by every command) render under their own
    // heading; each command's own options stay under "Options:", shown first
    // via localOptions() in the command builders.
    .group(['profile', 'help', 'version'], 'Global Options:')
    .parse();
}
