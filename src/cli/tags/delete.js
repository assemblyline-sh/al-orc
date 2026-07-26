import { clientFor } from '../_helpers.js';

/** `fob-orc tags delete <id>` — delete a tag. */
export async function deleteTagHandler(argv) {
  const { id } = argv;
  await clientFor().tags.delete(id);
  console.log(`Deleted tag: ${id}`);
}
