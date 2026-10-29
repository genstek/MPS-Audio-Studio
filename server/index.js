import { appendFileSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
import { configFromEnv } from './config.js';

// Command-line entry: `npm run server` (development) or Playwright's test server.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`The account server needs Node.js 22.13 or newer (built-in SQLite); this is ${process.version}.`);
  process.exit(1);
}
const { startServer } = await import('./app.js');
const config = configFromEnv();
if (config.resetData) {
  // Only ever delete a data folder inside this checkout's .data/ or the system temp folder.
  const roots = [resolve('.data'), realpathSync(tmpdir())];
  if (!roots.some(root => config.dataDir.startsWith(root + sep))) {
    console.error(`Refusing to reset ${config.dataDir}: it is not inside ${roots.join(' or ')}.`);
    process.exit(1);
  }
  rmSync(config.dataDir, { recursive: true, force: true });
}
// MPS_LOG_FILE also keeps the request log in a file (the LAS-25 artifact scan reads it).
const logFile = process.env.MPS_LOG_FILE;
if (logFile) mkdirSync(dirname(logFile), { recursive: true });
const log = line => {
  console.log(line);
  if (logFile) appendFileSync(logFile, `${line}\n`);
};
const { url } = await startServer(config, { log });
console.log(`MPS account server on ${url} (data: ${config.dataDir}${config.devEndpoints ? ', development endpoints on' : ''})`);
