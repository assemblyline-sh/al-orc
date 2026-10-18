/**
 * Subtree builder for `al-orc factory-sessions <action>`.
 */

import { safe, localOptions } from '../_helpers.js';

import { listFactorySessionsHandler } from './list.js';
import { showFactorySessionHandler } from './show.js';

export function buildFactorySessionsSubcommands(yargs) {
  return yargs
    .usage('$0 factory-sessions <action> [options]')
    .command(
      'list',
      'List factory sessions (one per factory session start)',
      (y) =>
        localOptions(y)
          .option('limit', { describe: 'Max sessions', type: 'number' })
          .option('status', { describe: 'Filter by status (active, expired, disconnected)', type: 'string' })
          .option('location', { describe: 'Filter by location', type: 'string' })
          .option('stale', { describe: 'Only sessions that are no longer active', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(listFactorySessionsHandler),
    )
    .command(
      'show <id>',
      'Show a factory session and its per-step outcomes (--tasks for the task list)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Factory session ID', type: 'string' }))
          .option('tasks', { describe: 'Include the tasks this session claimed', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showFactorySessionHandler),
    )
    .demandCommand(1, 'Specify an action: list, show');
}
