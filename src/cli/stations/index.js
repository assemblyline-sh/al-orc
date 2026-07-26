/**
 * Subtree builder for `fob-orc stations <action>`.
 *
 * Note: the orchestrator API/DB still says "process" — the paths carry that, but
 * the CLI vocabulary is "station". These are the CANONICAL definitions from the
 * orchestrator (contrast `fob-worker stations status`, which is local run-state).
 */

import { safe, paginationOptions } from '../_helpers.js';

import { listStationsHandler } from './list.js';
import { showStationHandler } from './show.js';
import { runStationHandler } from './run.js';
import { archiveStationHandler, unarchiveStationHandler } from './archive.js';
import { deleteStationHandler } from './delete.js';

export function buildStationsSubcommands(yargs) {
  return yargs
    .usage('$0 stations <action> [options]')
    .command(
      'list',
      'List stations from the orchestrator',
      (y) =>
        paginationOptions(y)
          .option('tag', { describe: 'Filter by tag name', type: 'string' })
          .option('line', { describe: 'Filter by line (client-side)', type: 'string' })
          .option('include-archived', { describe: 'Include archived stations', type: 'boolean' }),
      safe(listStationsHandler),
    )
    .command(
      'show <id>',
      'Show a station by ID or short_code',
      (y) =>
        y
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('work-records', { describe: 'Include recent work records', type: 'boolean' })
          .option('all', { describe: 'Include all linked entities', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showStationHandler),
    )
    .command(
      'run <id>',
      'Trigger an orchestrator run (extra --key=value flags become per-run step overrides)',
      (y) =>
        y
          .positional('id', { describe: 'Station ID or short_code', type: 'string' })
          .option('item', { describe: 'Item ID (legacy; item is being deprecated)', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(runStationHandler),
    )
    .command(
      'archive <id>',
      'Archive a station (preserve history, hide from default list, block execution)',
      (y) =>
        y
          .positional('id', { describe: 'Station ID', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(archiveStationHandler),
    )
    .command(
      'unarchive <id>',
      'Unarchive a station',
      (y) =>
        y
          .positional('id', { describe: 'Station ID', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(unarchiveStationHandler),
    )
    .command(
      'delete <id>',
      'Permanently delete a station',
      (y) =>
        y
          .positional('id', { describe: 'Station ID', type: 'string' })
          .option('cascade', { describe: 'Also delete linked work records (server support pending)', type: 'boolean' }),
      safe(deleteStationHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, run, archive, unarchive, delete');
}
