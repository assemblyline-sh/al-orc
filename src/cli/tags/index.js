/**
 * Subtree builder for `fob-orc tags <action>`.
 */

import { safe } from '../_helpers.js';

import { listTagsHandler } from './list.js';
import { createTagHandler } from './create.js';
import { editTagHandler } from './edit.js';
import { deleteTagHandler } from './delete.js';

export function buildTagsSubcommands(yargs) {
  return yargs
    .usage('$0 tags <action> [options]')
    .command(
      'list',
      'List all tags',
      (y) => y.option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(listTagsHandler),
    )
    .command(
      'create <name>',
      'Create a tag',
      (y) =>
        y
          .positional('name', { describe: 'Tag name', type: 'string' })
          .option('color', { describe: 'Display color (hex)', type: 'string' })
          .option('description', { describe: 'Tag description', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(createTagHandler),
    )
    .command(
      'edit <id>',
      "Update a tag's fields",
      (y) =>
        y
          .positional('id', { describe: 'Tag ID', type: 'string' })
          .option('name', { describe: 'New name', type: 'string' })
          .option('color', { describe: 'New color (hex)', type: 'string' })
          .option('description', { describe: 'New description', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(editTagHandler),
    )
    .command(
      ['delete <id>', 'rm <id>'],
      'Delete a tag',
      (y) => y.positional('id', { describe: 'Tag ID', type: 'string' }),
      safe(deleteTagHandler),
    )
    .demandCommand(1, 'Specify an action: list, create, edit, delete');
}
