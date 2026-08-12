/**
 * Subtree builder for `fob-orc worker-sessions <action>`.
 */

import { safe, localOptions } from '../_helpers.js';

import { listWorkerSessionsHandler } from './list.js';
import { showWorkerSessionHandler } from './show.js';

export function buildWorkerSessionsSubcommands(yargs) {
  return yargs
    .usage('$0 worker-sessions <action> [options]')
    .command(
      'list',
      'List worker sessions (one per worker process start)',
      (y) =>
        localOptions(y)
          .option('limit', { describe: 'Max sessions', type: 'number' })
          .option('status', { describe: 'Filter by status (active, expired, disconnected)', type: 'string' })
          .option('location', { describe: 'Filter by worker location', type: 'string' })
          .option('stale', { describe: 'Only sessions that are no longer active', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(listWorkerSessionsHandler),
    )
    .command(
      'show <id>',
      'Show a worker session and its per-step outcomes (--tasks for the task list)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Worker session ID', type: 'string' }))
          .option('tasks', { describe: 'Include the tasks this session claimed', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showWorkerSessionHandler),
    )
    .demandCommand(1, 'Specify an action: list, show');
}
