/**
 * Subtree builder for `al-orc supporting-docs <action>`.
 */

import { safe, localOptions } from '../_helpers.js';
import { showSupportingDocHandler } from './show.js';

export function buildSupportingDocsSubcommands(yargs) {
  return yargs
    .usage('$0 supporting-docs <action> [options]')
    .command(
      'show <id>',
      'Show a supporting document (--save <path> to download file docs)',
      (y) =>
        localOptions(y.positional('id', { describe: 'Document ID', type: 'string' }))
          .option('save', { describe: 'Download the file to this path', type: 'string' })
          .option('json', { describe: 'Output raw JSON', type: 'boolean' }),
      safe(showSupportingDocHandler),
    )
    .demandCommand(1, 'Specify an action: show');
}
