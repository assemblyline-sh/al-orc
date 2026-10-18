import { clientFor } from '../_helpers.js';
import { editEntityTags } from '../shared/edit-tags.js';

/** `al-orc work-records edit <id>` — add/remove tags on a work record. */
export async function editWorkRecordHandler(argv) {
  const { id, addTag, removeTag } = argv;

  const addTags = addTag ? [].concat(addTag) : [];
  const removeTags = removeTag ? [].concat(removeTag) : [];

  if (addTags.length === 0 && removeTags.length === 0) {
    console.error('Usage: al-orc work-records edit <id> --add-tag <name> [--remove-tag <name>]');
    console.error('At least one --add-tag or --remove-tag is required');
    process.exit(1);
  }

  console.log(`Work record: ${id}`);
  const orc = clientFor();
  await editEntityTags(orc.workRecords, orc.tags, id, addTags, removeTags);
  console.log('');
  console.log('Tags updated');
}
