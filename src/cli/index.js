/**
 * CLI entry point — three-level command tree:
 *
 *   fob-orc <resource> <action> [target] [options]
 *
 * The orchestrator control plane (canonical station/process definitions, work
 * records, tags, supporting docs). Credentials come from ~/.fob/fob-orc/config.yml;
 * `config` manages them. (Local run-state / pm2 / step execution live in the
 * sibling `fob-worker` CLI, not here.)
 */

import yargs from 'yargs';

import { setOrgOverride } from './config-store.js';
import { buildConfigSubcommands } from './config/index.js';
import { buildStationsSubcommands } from './stations/index.js';
import { buildWorkRecordsSubcommands } from './work-records/index.js';
import { buildTagsSubcommands } from './tags/index.js';
import { buildSupportingDocsSubcommands } from './supporting-docs/index.js';
import { safe } from './_helpers.js';
import { statusHandler } from './status.js';

export function run(argv) {
  return yargs(argv)
    .scriptName('fob-orc')
    .usage('$0 <resource> <action> [target] [options]')
    .option('profile', {
      alias: 'org',
      describe: 'Use credentials from a specific configured profile (overrides current)',
      type: 'string',
    })
    .middleware((argv) => {
      if (argv.profile) setOrgOverride(argv.profile);
    })
    .command('config <resource>', 'Manage credential profiles (alias: orgs)', buildConfigSubcommands)
    .command('stations <action>', 'Query and run stations (orchestrator definitions)', buildStationsSubcommands)
    .command('work-records <action>', 'Query and manage work records', buildWorkRecordsSubcommands)
    .command('tags <action>', 'Manage tags', buildTagsSubcommands)
    .command('supporting-docs <action>', 'View and download supporting documents', buildSupportingDocsSubcommands)
    .command(
      'status',
      'Check connectivity to the orchestrator (active profile)',
      (y) => y.option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(statusHandler),
    )
    .demandCommand(1, 'Specify a resource. Try `fob-orc --help`.')
    .strict()
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')
    .parse();
}
