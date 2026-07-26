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
    .demandCommand(1, 'Specify a resource. Try `fob-orc --help`.')
    .strict()
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')
    .parse();
}
