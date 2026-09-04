/**
 * Subtree builder for `fob-orc lines <action>`.
 *
 * A line is a sequence of stations that runs at exactly one worker location.
 * The line owns `location`; stations name their line by `code` and inherit it.
 * Local files: `.orchestrator/lines/<CODE>.json`.
 */

import { safe, paginationOptions, localOptions } from '../_helpers.js';

import { listLinesHandler } from './list.js';
import { showLineHandler } from './show.js';
import { pullLinesHandler } from './pull.js';
import { pushLinesHandler } from './push.js';

export function buildLinesSubcommands(yargs) {
  return yargs
    .usage('$0 lines <action> [options]')
    .command(
      'list',
      'List lines from the orchestrator',
      (y) =>
        paginationOptions(y)
          .option('location', { describe: 'Only lines served by this worker location', type: 'string' })
          .option('include-archived', { describe: 'Include archived lines', type: 'boolean' }),
      safe(listLinesHandler),
    )
    .command(
      'show <id>',
      'Show a line by code or ID, with its stations',
      (y) =>
        localOptions(y.positional('id', { describe: 'Line code or ID', type: 'string' }))
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showLineHandler),
    )
    .command(
      'pull [id]',
      'Pull line definitions to .orchestrator/lines/ (--all for every line)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Line code or ID (omit with --all)', type: 'string' }))
          .option('all', { describe: 'Pull every line', type: 'boolean' }),
      safe(pullLinesHandler),
    )
    .command(
      'push [id]',
      'Push local line files to the orchestrator (create/update; --all for every file)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Filename, line code, or ID (omit with --all)', type: 'string' }))
          .option('all', { describe: 'Push every local line file', type: 'boolean' }),
      safe(pushLinesHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, pull, push');
}
