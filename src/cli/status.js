import { clientFor } from './_helpers.js';

/** `al-orc status` — probe connectivity to the orchestrator with the active profile. */
export async function statusHandler(argv) {
  const { json } = argv || {};
  const result = await clientFor().checkConnection();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.connected) {
    console.log('Status: Connected');
    if (result.org) console.log(`Org:    ${result.org.name} (${result.org.id})`);
    if (result.api_key) console.log(`Key:    ${result.api_key.name} (${result.api_key.key})`);
  } else {
    console.log('Status: Not connected');
    if (result.error) console.log(`Error:  ${result.error}`);
    else if (result.status) console.log(`HTTP:   ${result.status}`);
    process.exitCode = 1;
  }
}
