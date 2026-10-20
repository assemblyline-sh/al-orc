// @ts-check
/**
 * Shared --add-tag / --remove-tag flow for taggable entities (stations,
 * work-records). Works against a resource namespace that exposes getTags/setTags
 * plus the tags namespace (ensure/resolveNames), so the CLI holds no paths.
 *
 * @param {{ getTags: (id: string) => Promise<any[]>, setTags: (id: string, tagIds: string[]) => Promise<any> }} ns
 * @param {{ ensure: (name: string) => Promise<{id: string, name: string}>, resolveNames: (names: string[]) => Promise<string[]> }} tags
 * @param {string} id
 * @param {string[]} add_tags
 * @param {string[]} remove_tags
 */
export async function editEntityTags(ns, tags, id, add_tags, remove_tags) {
  const current = await ns.getTags(id);
  let ids = current.map((t) => t.id);
  const changes = [];

  for (const name of add_tags) {
    const tag = await tags.ensure(name);
    if (!ids.includes(tag.id)) {
      ids.push(tag.id);
      changes.push(`  + ${name}`);
    } else {
      changes.push(`    ${name} (already present)`);
    }
  }

  for (const name of remove_tags) {
    const [resolved_id] = await tags.resolveNames([name]).catch(() => [null]);
    if (!resolved_id) {
      console.error(`  Warning: tag "${name}" not found, skipping removal`);
      continue;
    }
    if (ids.includes(resolved_id)) {
      ids = ids.filter((x) => x !== resolved_id);
      changes.push(`  - ${name}`);
    } else {
      changes.push(`    ${name} (not present)`);
    }
  }

  await ns.setTags(id, ids);
  for (const change of changes) console.log(change);
}
