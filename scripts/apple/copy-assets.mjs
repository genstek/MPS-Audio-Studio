import { cp, rm, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
const source = resolve('dist');
const destination = resolve('apple/WebAssets');
await access(resolve(source, 'index.html'));
const html = await readFile(resolve(source, 'index.html'), 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) throw new Error('Rebuild with --base=./ before Apple packaging.');
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
// Provenance (LAS-58): lets a tester confirm the app bundle is the build they expect, not an old one.
const hash = createHash('sha256');
for (const name of (await readdir(resolve(destination, 'assets'))).sort()) hash.update(name);
hash.update(html);
let gitSha = 'unknown';
try { gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a git checkout */ }
const info = { gitSha, builtAt: new Date().toISOString(), assetDigest: hash.digest('hex').slice(0, 16) };
await writeFile(resolve(destination, 'build-info.json'), JSON.stringify(info, null, 2) + '\n');
console.log('Bundle provenance: git ' + info.gitSha + ', digest ' + info.assetDigest);
console.log('Copied the built studio into the Apple bundle.');
