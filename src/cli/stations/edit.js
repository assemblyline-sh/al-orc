import { clientFor } from '../_helpers.js';
import { editEntityTags } from '../shared/edit-tags.js';

/** `al-orc stations edit <id>` — set short_code and/or add/remove tags. */
export async function editStationHandler(argv) {
  const { id, shortCode, addTag, removeTag } = argv;

  const addTags = addTag ? [].concat(addTag) : [];
  const removeTags = removeTag ? [].concat(removeTag) : [];
  const hasTagChanges = addTags.length > 0 || removeTags.length > 0;

  if (!hasTagChanges && shortCode === undefined) {
    console.error('Usage: al-orc stations edit <id|short_code> --short-code P1 --add-tag <name> [--remove-tag <name>]');
    console.error('At least one of --short-code, --add-tag, or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Station: ${id}`);
  const orc = clientFor();

  if (shortCode !== undefined) {
    await orc.stations.update(id, { short_code: shortCode || null });
    console.log(`Short code set: ${shortCode || '(cleared)'}`);
  }

  if (hasTagChanges) {
    await editEntityTags(orc.stations, orc.tags, id, addTags, removeTags);
    console.log('Tags updated');
  }
}
