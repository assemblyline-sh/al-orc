/**
 * Subtree builder for `fob-orc work-records <action>`.
 */

import { safe, localOptions } from '../_helpers.js';

import { listWorkRecordsHandler } from './list.js';
import { showWorkRecordHandler } from './show.js';
import { cancelWorkRecordHandler } from './cancel.js';
import { editWorkRecordHandler } from './edit.js';

export function buildWorkRecordsSubcommands(yargs) {
  return yargs
    .usage('$0 work-records <action> [options]')
    .command(
      'list',
      'List work records',
      (y) =>
        localOptions(y)
          .option('limit', { describe: 'Max records', type: 'number' })
          .option('status', { describe: 'Filter by status', type: 'string' })
          .option('station', { describe: 'Filter by station ID or short_code (e.g. EM0)', type: 'string' })
          .option('line', { describe: 'Filter by line — every station on it (e.g. VM)', type: 'string' })
          .option('tag', { describe: 'Filter by tag name', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(listWorkRecordsHandler),
    )
    .command(
      'show <id>',
      'Show a work record (--report/--steps/--supporting-docs/--activity/--all for detail)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Work record ID', type: 'string' }))
          .option('report', { describe: 'Include the report', type: 'boolean' })
          .option('steps', { describe: 'Include step outputs', type: 'boolean' })
          .option('supporting-docs', { describe: 'Include supporting documents', type: 'boolean' })
          .option('activity', { describe: 'Include activity events', type: 'boolean' })
          .option('all', { describe: 'Include every detail section', type: 'boolean' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showWorkRecordHandler),
    )
    .command(
      'cancel <id>',
      'Cancel a running or pending work record',
      (y) =>
        localOptions(y.positional('id', { describe: 'Work record ID', type: 'string' }))
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(cancelWorkRecordHandler),
    )
    .command(
      'edit <id>',
      'Add or remove tags on a work record',
      (y) =>
        localOptions(y.positional('id', { describe: 'Work record ID', type: 'string' }))
          .option('add-tag', { describe: 'Tag name to add (repeatable)', type: 'string', array: true })
          .option('remove-tag', { describe: 'Tag name to remove (repeatable)', type: 'string', array: true }),
      safe(editWorkRecordHandler),
    )
    .demandCommand(1, 'Specify an action: list, show, cancel, edit');
}
