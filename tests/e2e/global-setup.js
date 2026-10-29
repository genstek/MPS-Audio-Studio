import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';

// Runs once before all tests, after Playwright has started or reused the web server.
// A reused server could belong to another checkout, so ask it which folder it serves.
export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL;
  const expected = realpathSync(dirname(config.configFile));
  let identity;
  try {
    const response = await fetch(`${baseURL}/__mps-checkout`);
    identity = response.ok ? await response.json() : null;
  } catch {
    identity = null;
  }
  if (!identity) {
    throw new Error(`The server at ${baseURL} did not report its checkout. Stop the program using that port and run the tests again.`);
  }
  const served = realpathSync(identity.root);
  if (served !== expected) {
    throw new Error(`The server at ${baseURL} serves ${served} (pid ${identity.pid}), not this checkout ${expected}. Stop that server or run the tests from that folder.`);
  }
  const expectedApi = 'http://127.0.0.1:8788';
  if (identity.api !== expectedApi) {
    throw new Error(`The server at ${baseURL} forwards /api to ${identity.api}, not the test account server ${expectedApi}. Stop it so the tests can start their own.`);
  }
  console.log(`Testing the app served from ${served} (pid ${identity.pid}) at ${baseURL}, accounts at ${identity.api}`);
}
