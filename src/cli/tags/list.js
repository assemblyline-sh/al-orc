import { clientFor } from '../_helpers.js';
import { formatTable } from '../utils/format.js';

/** `fob-orc tags list` — all tags. */
export async function listTagsHandler(argv) {
  const { json } = argv || {};
  const { data } = await clientFor().tags.list();
  const tags = data || [];

  if (json) {
    console.log(JSON.stringify(tags, null, 2));
    return;
  }

  if (tags.length === 0) {
    console.log('No tags found');
    return;
  }

  const rows = tags.map((t) => [t.id, t.name, t.color || '—', String(t.usage?.total ?? 0)]);
  console.log(formatTable(['ID', 'NAME', 'COLOR', 'USAGE'], rows));
  console.log('');
  console.log(`Total: ${tags.length} tags`);
}
