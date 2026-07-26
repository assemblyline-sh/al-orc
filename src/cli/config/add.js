import { addOrg } from '../config-store.js';

export async function addConfigHandler(argv) {
  addOrg(argv.name, {
    api_url: argv.apiUrl,
    api_key: argv.apiKey,
    api_secret: argv.apiSecret,
  });
  console.log(`Saved orchestrator credentials for profile '${argv.name}'.`);
}
