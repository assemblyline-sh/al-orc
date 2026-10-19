// @ts-check
/**
 * Shared --add-tag / --remove-tag flow for taggable entities (stations,
 * work-records). Works against a resource namespace that exposes getTags/setTags
 * plus the tags namespace (ensure/resolveNames), so the CLI holds no paths.
 *
 * @param {{ getTags: (id: string) => Promise<any[]>, setTags: (id: string, tagIds: string[]) => Promise<any> }} ns
 * @param {{ ensure: (name: string) => Promise<{id: string, name: string}>, resolveNames: (names: string[]) => Promise<string[]> }} tags
 * @param {string} id
 * @param {string[]} addTags
 * @param {string[]} removeTags
 */
export async function editEntityTags(ns, tags, id, addTags, removeTags) {
  const current = await ns.getTags(id);
  let ids = current.map((t) => t.id);
  const changes = [];

  for (const name of addTags) {
    const tag = await tags.ensure(name);
    if (!ids.includes(tag.id)) {
      ids.push(tag.id);
      changes.push(`  + ${name}`);
    } else {
      changes.push(`    ${name} (already present)`);
    }
  }

  for (const name of removeTags) {
    const [resolvedId] = await tags.resolveNames([name]).catch(() => [null]);
    if (!resolvedId) {
      console.error(`  Warning: tag "${name}" not found, skipping removal`);
      continue;
    }
    if (ids.includes(resolvedId)) {
      ids = ids.filter((x) => x !== resolvedId);
      changes.push(`  - ${name}`);
    } else {
      changes.push(`    ${name} (not present)`);
    }
  }

  await ns.setTags(id, ids);
  for (const change of changes) console.log(change);
}
