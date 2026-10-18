import { describeCurrent } from '../config-store.js';

export async function currentConfigHandler(argv) {
  const cur = describeCurrent();

  if (argv.json) {
    console.log(JSON.stringify(cur, null, 2));
    return;
  }

  if (!cur) {
    console.log('(no active profile — run `al-orc config profiles add <name>`)');
    return;
  }

  const lines = [`Source:   ${cur.source}`];
  if (cur.name) lines.push(`Profile:  ${cur.name}`);
  lines.push(`API URL:  ${cur.api_url}`);
  console.log(lines.join('\n'));
}
