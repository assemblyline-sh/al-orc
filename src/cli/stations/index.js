// @ts-check
/**
 * Subtree builder for `al-orc stations <action>`.
 *
 * These are the CANONICAL definitions from the orchestrator (contrast `al-control stations status`, which reads the bins).
 */

import { safe, paginationOptions, localOptions } from '../_helpers.js';

import { listStationsHandler } from './list.js';
import { showStationHandler } from './show.js';
import { runStationHandler } from './run.js';
import { archiveStationHandler, unarchiveStationHandler } from './archive.js';
import { deleteStationHandler } from './delete.js';
import { editStationHandler } from './edit.js';
import { pullStationsHandler } from './pull.js';
import { pushStationsHandler } from './push.js';

export function buildStationsSubcommands(yargs) {
  return yargs
    .usage('$0 stations <action> [options]')
    .command(
      'list',
      'List stations from the orchestrator',
      (y) =>
        paginationOptions(y)
          .option('tag', { describe: 'Filter by tag name', type: 'string' })
          .option('line', { describe: 'Filter by line code or ID', type: 'string' })
          .option('include-archived', { describe: 'Include archived stations', type: 'boolean' }),
      safe(listStationsHandler),
    )
    .command(
      'show <id>',
      'Show a station by ID or short_code',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID or short_code', type: 'string' }))
          .option('work-records', { describe: 'Include recent work records', type: 'boolean' })
          .option('all', { describe: 'Include all linked entities', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showStationHandler),
    )
    .command(
      'run <id>',
      'Trigger an orchestrator run (--scenario <name> + extra --key=value flags become per-run step overrides)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID or short_code', type: 'string' }))
          .option('scenario', { describe: 'Apply a local station scenario (.orchestrator/scenarios/stations/<code>/)', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' })
          // Any other --key=value is a step override, so unknown flags are the point here.
          .strict(false),
      safe(runStationHandler),
    )
    .command(
      'edit <id>',
      'Set a station short_code and/or add/remove tags',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID or short_code', type: 'string' }))
          .option('short-code', { describe: 'Set the short_code (empty string clears it)', type: 'string' })
          .option('add-tag', { describe: 'Tag name to add (repeatable)', type: 'string', array: true })
          .option('remove-tag', { describe: 'Tag name to remove (repeatable)', type: 'string', array: true }),
      safe(editStationHandler),
    )
    .command(
      'pull [id]',
      'Pull station definitions to .orchestrator/stations/ (--all for every station)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID or short_code (omit with --all)', type: 'string' }))
          .option('all', { describe: 'Pull every station', type: 'boolean' }),
      safe(pullStationsHandler),
    )
    .command(
      'push [id]',
      'Push local station files to the orchestrator (create/update; --all for every file)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Filename, station ID, or short_code (omit with --all)', type: 'string' }))
          .option('all', { describe: 'Push every local station file', type: 'boolean' })
          .option('force', { describe: 'On a 404 update, create remotely with the same id', type: 'boolean' }),
      safe(pushStationsHandler),
    )
    .command(
      'archive <id>',
      'Archive a station (preserve history, hide from default list, block execution)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID', type: 'string' }))
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(archiveStationHandler),
    )
    .command(
      'unarchive <id>',
      'Unarchive a station',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID', type: 'string' }))
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(unarchiveStationHandler),
    )
    .command(
      'delete <id>',
      'Permanently delete a station',
      (y) =>
        localOptions(y.positional('id', { describe: 'Station ID', type: 'string' }))
          .option('cascade', { describe: 'Also delete its work records (otherwise refused while any exist)', type: 'boolean' }),
      safe(deleteStationHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, run, edit, pull, push, archive, unarchive, delete');
}
