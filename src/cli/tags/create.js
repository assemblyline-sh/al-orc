import { clientFor } from '../_helpers.js';

/** `al-orc tags create <name>` — create a tag. */
export async function createTagHandler(argv) {
  const { name, color, description, json } = argv;

  const data = { name };
  if (color) data.color = color;
  if (description) data.description = description;

  const tag = await clientFor().tags.create(data);

  if (json) {
    console.log(JSON.stringify(tag, null, 2));
    return;
  }

  console.log(`Created tag: ${tag.name} (${tag.id})`);
  if (tag.color) console.log(`  Color: ${tag.color}`);
  if (tag.description) console.log(`  Description: ${tag.description}`);
}
