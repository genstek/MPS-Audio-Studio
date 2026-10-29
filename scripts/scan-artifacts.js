// LAS-25: scans test reports, traces, the client bundle and the test server's log for secrets.
// Usage: node scripts/scan-artifacts.js [paths...]   (defaults below). Exit code 1 on any critical finding.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['playwright-report', 'test-results', 'dist', '.data/e2e/server.log'];
const secretFile = '.data/e2e/server-secret';
const serverSecret = existsSync(secretFile) ? readFileSync(secretFile, 'utf8').trim() : null;

const RULES = [
  { id: 'generated-password', level: 'critical', pattern: /MPSPW-[\w-]{12,}/g },
  { id: 'session-token', level: 'critical', pattern: /mps_session=[\w-]{43}/g },
  { id: 'private-key', level: 'critical', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { id: 'one-time-email-token', level: 'warning', pattern: /[?&#](?:verify|reset)=[\w-]{43}/g },
  { id: 'download-signature', level: 'warning', pattern: /[?&]sig=[\w-]{43}/g },
];
// Strings that only the server should contain; finding them in dist/ means server code leaked into the bundle.
const SERVER_ONLY = ['server-secret', 'node:sqlite', 'password_hash', 'MPS_DATA_DIR', 'scrypt('];

// Minimal ZIP reader (stored and deflated entries) for reports and traces.
function* zipEntries(buffer, depth = 0) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return;
  let offset = buffer.readUInt32LE(eocd + 16);
  const count = buffer.readUInt16LE(eocd + 10);
  for (let n = 0; n < count && buffer.readUInt32LE(offset) === 0x02014b50; n++) {
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extra = buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + size);
    let data;
    try { data = method === 0 ? raw : method === 8 ? inflateRawSync(raw) : null; } catch { data = null; }
    if (data) {
      yield [name, data];
      if (depth < 3 && name.endsWith('.zip')) for (const [inner, innerData] of zipEntries(data, depth + 1)) yield [`${name}!/${inner}`, innerData];
    }
    offset += 46 + nameLength + extra;
  }
}

function* files(path) {
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) for (const entry of readdirSync(path)) yield* files(join(path, entry));
  else yield path;
}

// Every text-like piece of every target, including entries inside ZIPs and the report's embedded ZIP.
function* pieces() {
  for (const target of targets) {
    for (const file of files(target)) {
      const buffer = readFileSync(file);
      yield [relative('.', file), buffer];
      if (file.endsWith('.zip')) for (const [name, data] of zipEntries(buffer)) yield [`${relative('.', file)}!/${name}`, data];
      if (file.endsWith('.html')) {
        const embedded = buffer.toString('latin1').match(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/);
        if (embedded) for (const [name, data] of zipEntries(Buffer.from(embedded[1], 'base64'))) yield [`${relative('.', file)}#embedded!/${name}`, data];
      }
    }
  }
}

const findings = [];
let scanned = 0;
for (const [where, buffer] of pieces()) {
  scanned++;
  const text = buffer.toString('latin1');
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) findings.push({ rule: rule.id, level: rule.level, where, sample: `${match[0].slice(0, 14)}…` });
  }
  if (serverSecret && text.includes(serverSecret)) findings.push({ rule: 'server-secret', level: 'critical', where, sample: '(server secret)' });
  if (where.startsWith('dist')) for (const marker of SERVER_ONLY) if (text.includes(marker)) findings.push({ rule: 'server-code-in-bundle', level: 'critical', where, sample: marker });
  if (where.endsWith('server.log')) {
    for (const line of text.split('\n').filter(Boolean)) {
      if (!/^(GET|POST|PATCH|DELETE|HEAD|OPTIONS) \/[\w/.-]* \d{3} \d+ms$|^error |^MPS account server /.test(line)) findings.push({ rule: 'unexpected-log-line', level: 'warning', where, sample: line.slice(0, 60) });
    }
  }
}

const summary = {};
for (const finding of findings) summary[`${finding.level}:${finding.rule}`] = (summary[`${finding.level}:${finding.rule}`] ?? 0) + 1;
console.log(JSON.stringify({ targets, scannedPieces: scanned, serverSecretChecked: Boolean(serverSecret), summary, findings: findings.slice(0, 50) }, null, 2));
process.exit(findings.some(finding => finding.level === 'critical') ? 1 : 0);
