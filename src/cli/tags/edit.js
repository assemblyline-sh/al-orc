// @ts-check
import { clientFor } from '../_helpers.js';

/** `al-orc tags edit <id>` — update a tag's fields. */
export async function editTagHandler(argv) {
  const { id, name, color, description, json } = argv;

  if (!name && !color && !description) {
    console.error('At least one of --name, --color, or --description is required');
    process.exit(1);
  }

  const data = {};
  if (name) data.name = name;
  if (color) data.color = color;
  if (description) data.description = description;

  const tag = await clientFor().tags.update(id, data);

  if (json) {
    console.log(JSON.stringify(tag, null, 2));
    return;
  }

  console.log(`Updated tag: ${tag.name} (${tag.id})`);
  if (tag.color) console.log(`  Color: ${tag.color}`);
  if (tag.description) console.log(`  Description: ${tag.description}`);
}
