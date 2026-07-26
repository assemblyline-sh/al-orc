import { listProfiles } from '../config-store.js';
import { formatTable } from '../utils/format.js';

export async function listConfigHandler(argv) {
  const { current, path, profiles } = listProfiles();

  if (argv.json) {
    console.log(JSON.stringify({ current, profiles }, null, 2));
    return;
  }

  if (profiles.length === 0) {
    console.log('(no profiles configured — run `fob-orc config profiles add <name>`)');
    return;
  }

  const headers = ['', 'NAME', 'API URL'];
  const rows = profiles.map((p) => [p.current ? '*' : ' ', p.name, p.api_url ?? '']);

  console.log(formatTable(headers, rows));
  console.log(`\n(* = current)  config: ${path}`);
}
