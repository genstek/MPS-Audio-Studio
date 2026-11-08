import { cp, rm, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const source = resolve('dist');
const destination = resolve('apple/WebAssets');
await access(resolve(source, 'index.html'));
const html = await readFile(resolve(source, 'index.html'), 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) throw new Error('Rebuild with --base=./ before Apple packaging.');
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('Copied the built studio into the Apple bundle.');
// Build provenance: lets QA confirm the installed app bundles the intended build, not stale assets.
let sha = 'unknown';
try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
const hash = createHash('sha256').update(html).digest('hex');
await writeFile(resolve(destination, 'BUILD-INFO.txt'), `git=${sha}\nindex.html sha256=${hash}\n`);
console.log(`Bundle provenance: git ${sha.slice(0, 12)}, index.html sha256 ${hash.slice(0, 12)}`);
