// @ts-check
import { clientFor } from '../_helpers.js';
import { editEntityTags } from '../shared/edit-tags.js';

/** `al-orc stations edit <id>` — set short_code and/or add/remove tags. */
export async function editStationHandler(argv) {
  const { id, shortCode: short_code, addTag: add_tag, removeTag: remove_tag } = argv;

  const add_tags = add_tag ? [].concat(add_tag) : [];
  const remove_tags = remove_tag ? [].concat(remove_tag) : [];
  const has_tag_changes = add_tags.length > 0 || remove_tags.length > 0;

  if (!has_tag_changes && short_code === undefined) {
    console.error('Usage: al-orc stations edit <id|short_code> --short-code P1 --add-tag <name> [--remove-tag <name>]');
    console.error('At least one of --short-code, --add-tag, or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Station: ${id}`);
  const orc = clientFor();

  if (short_code !== undefined) {
    await orc.stations.update(id, { short_code: short_code || null });
    console.log(`Short code set: ${short_code || '(cleared)'}`);
  }

  if (has_tag_changes) {
    await editEntityTags(orc.stations, orc.tags, id, add_tags, remove_tags);
    console.log('Tags updated');
  }
}
