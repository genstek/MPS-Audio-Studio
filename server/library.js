import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { HttpError, readJson } from './http.js';
import { randomToken } from './security.js';
import { WavError, inspectWav, measureLevels } from './wav.js';

export const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const DOWNLOAD_LINK_MS = 5 * 60_000;
export const JOB_TIME_LIMIT_MS = 60_000;
const KINDS = ['source', 'reference', 'stem', 'preview', 'export'];

// File names are display metadata only: no folders, no control characters, at most 200 characters.
export function displayName(value) {
  const base = [...String(value ?? '').split(/[\\/]/).pop()].filter(ch => ch >= ' ' && ch !== '\u007f').join('').trim();
  return (base || 'audio.wav').slice(0, 200);
}

// Private projects, assets and jobs (LAS-23). Every query is filtered by the signed-in owner, and
// someone else's id gets the same 404 as one that does not exist.
export function libraryRoutes({ route, db, now, config, secret, requireUser, audit }) {
  const blobDir = join(config.dataDir, 'blobs');
  const tmpDir = join(config.dataDir, 'tmp');
  mkdirSync(blobDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
  const maxUpload = config.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  const running = new Map();

  const ownProject = (id, user) => {
    const project = db.prepare('SELECT id, name, created_at AS createdAt FROM projects WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!project) throw new HttpError(404, 'not_found');
    return project;
  };
  const ownAsset = (id, user) => {
    const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!asset) throw new HttpError(404, 'not_found');
    return asset;
  };
  const publicAsset = asset => ({
    id: asset.id, projectId: asset.project_id, kind: asset.kind, name: asset.name, size: asset.size,
    sha256: asset.sha256, format: JSON.parse(asset.format), createdAt: asset.created_at,
  });
  const publicJob = job => ({
    id: job.id, assetId: job.asset_id, kind: job.kind, status: job.status,
    result: job.result ? JSON.parse(job.result) : null, error: job.error, createdAt: job.created_at, finishedAt: job.finished_at,
  });

  // Cancels running jobs and deletes stored files for the given assets (rows are deleted by the caller).
  function forgetAssets(assets) {
    for (const asset of assets) {
      for (const job of db.prepare("SELECT id FROM jobs WHERE asset_id = ? AND status IN ('queued', 'running')").all(asset.id)) cancelJob(job.id);
      rmSync(join(blobDir, asset.blob), { force: true });
    }
  }

  function cancelJob(id) {
    running.get(id)?.abort('cancelled');
    db.prepare("UPDATE jobs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status IN ('queued', 'running')").run(now(), id);
  }

  const sign = (assetId, ownerId, expires) => createHmac('sha256', secret).update(`${assetId}.${ownerId}.${expires}`).digest('base64url');

  route('GET', /^\/api\/projects$/, ({ request }) => {
    const user = requireUser(request);
    const projects = db.prepare(`SELECT p.id, p.name, p.created_at AS createdAt, COUNT(a.id) AS assetCount
      FROM projects p LEFT JOIN assets a ON a.project_id = p.id WHERE p.owner_id = ? GROUP BY p.id ORDER BY p.created_at`).all(user.id);
    return { body: { projects } };
  });

  route('POST', /^\/api\/projects$/, async ({ request }) => {
    const user = requireUser(request);
    const name = displayName((await readJson(request)).name || 'My library');
    const id = randomToken(16);
    db.prepare('INSERT INTO projects (id, owner_id, name, created_at) VALUES (?, ?, ?, ?)').run(id, user.id, name, now());
    audit('project_created', user.id, id);
    return { status: 201, body: { id, name } };
  });

  route('GET', /^\/api\/projects\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    const project = ownProject(id, user);
    const assets = db.prepare('SELECT * FROM assets WHERE project_id = ? AND owner_id = ? ORDER BY created_at').all(id, user.id).map(publicAsset);
    return { body: { ...project, assets } };
  });

  route('PATCH', /^\/api\/projects\/([\w-]+)$/, async ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownProject(id, user);
    const name = displayName((await readJson(request)).name);
    db.prepare('UPDATE projects SET name = ? WHERE id = ? AND owner_id = ?').run(name, id, user.id);
    return { body: { id, name } };
  });

  route('DELETE', /^\/api\/projects\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownProject(id, user);
    forgetAssets(db.prepare('SELECT id, blob FROM assets WHERE project_id = ? AND owner_id = ?').all(id, user.id));
    db.prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?').run(id, user.id);
    audit('project_deleted', user.id, id);
    return { status: 204 };
  });

  route('GET', /^\/api\/projects\/([\w-]+)\/assets$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownProject(id, user);
    return { body: { assets: db.prepare('SELECT * FROM assets WHERE project_id = ? AND owner_id = ? ORDER BY created_at').all(id, user.id).map(publicAsset) } };
  });

  // Raw WAV body, streamed to a temporary file with a hard size limit, then inspected.
  route('POST', /^\/api\/projects\/([\w-]+)\/assets$/, async ({ request, url, params: [id] }) => {
    const user = requireUser(request);
    ownProject(id, user);
    const kind = url.searchParams.get('kind') ?? 'source';
    if (!KINDS.includes(kind)) throw new HttpError(400, 'invalid_kind', 'Unknown asset kind.');
    const declared = Number(request.headers['content-length'] ?? 0);
    if (declared > maxUpload) throw new HttpError(413, 'too_large', `Files can be at most ${Math.floor(maxUpload / 1048576)} MiB.`);
    const temp = join(tmpDir, randomToken(16));
    const hash = createHash('sha256');
    let size = 0;
    try {
      await pipeline(request, async function* limit(source) {
        for await (const chunk of source) {
          size += chunk.length;
          if (size > maxUpload) throw new HttpError(413, 'too_large', `Files can be at most ${Math.floor(maxUpload / 1048576)} MiB.`);
          hash.update(chunk);
          yield chunk;
        }
      }, createWriteStream(temp, { mode: 0o600 }));
      const format = inspectWav(temp, statSync(temp).size);
      const assetId = randomToken(16);
      const blob = randomToken(24);
      renameSync(temp, join(blobDir, blob));
      const name = displayName(url.searchParams.get('name'));
      const { encoding, channels, sampleRate, bitsPerSample, blockAlign, frames, duration, dataOffset, dataSize } = format;
      const stored = { encoding, channels, sampleRate, bitsPerSample, blockAlign, frames, duration, dataOffset, dataSize };
      db.prepare('INSERT INTO assets (id, project_id, owner_id, kind, name, blob, size, sha256, format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(assetId, id, user.id, kind, name, blob, size, hash.digest('hex'), JSON.stringify(stored), now());
      audit('asset_uploaded', user.id, assetId);
      return { status: 201, body: publicAsset(db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId)) };
    } catch (error) {
      if (error instanceof WavError) throw new HttpError(422, 'invalid_audio', error.message);
      throw error;
    } finally {
      rmSync(temp, { force: true });
    }
  });

  route('GET', /^\/api\/assets\/([\w-]+)$/, ({ request, params: [id] }) => ({ body: publicAsset(ownAsset(id, requireUser(request))) }));

  route('DELETE', /^\/api\/assets\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    const asset = ownAsset(id, user);
    forgetAssets([asset]);
    db.prepare('DELETE FROM assets WHERE id = ? AND owner_id = ?').run(id, user.id);
    audit('asset_deleted', user.id, id);
    return { status: 204 };
  });

  route('POST', /^\/api\/assets\/([\w-]+)\/download-link$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownAsset(id, user);
    const expires = now() + DOWNLOAD_LINK_MS;
    return { body: { url: `/api/download/${id}?exp=${expires}&sig=${sign(id, user.id, expires)}`, expiresAt: expires } };
  });

  // Needs the owner's session and a valid, unexpired signature for this asset and owner.
  route('GET', /^\/api\/download\/([\w-]+)$/, async ({ request, response, url, params: [id] }) => {
    const user = requireUser(request);
    const asset = ownAsset(id, user);
    const expires = Number(url.searchParams.get('exp'));
    const given = Buffer.from(url.searchParams.get('sig') ?? '');
    const expected = Buffer.from(sign(id, user.id, expires));
    if (!(expires > now()) || given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new HttpError(403, 'link_expired', 'This download link is invalid or has expired.');
    }
    response.writeHead(200, {
      'Content-Type': 'audio/wav',
      'Content-Length': asset.size,
      'Content-Disposition': `attachment; filename="${asset.name.replace(/[^\w.\- ]/g, '_')}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    await pipeline(createReadStream(join(blobDir, asset.blob)), response);
    audit('asset_downloaded', user.id, id);
    return { raw: true };
  });

  // Level analysis runs after the response, with a time limit, and can be cancelled.
  route('POST', /^\/api\/assets\/([\w-]+)\/jobs$/, async ({ request, params: [id] }) => {
    const user = requireUser(request);
    const asset = ownAsset(id, user);
    const { kind } = await readJson(request);
    if (kind !== 'levels') throw new HttpError(400, 'invalid_kind', 'Only "levels" analysis is available.');
    const jobId = randomToken(16);
    db.prepare("INSERT INTO jobs (id, owner_id, asset_id, kind, status, created_at) VALUES (?, ?, ?, 'levels', 'queued', ?)").run(jobId, user.id, id, now());
    const controller = new AbortController();
    running.set(jobId, controller);
    const timer = setTimeout(() => controller.abort('time limit'), config.jobTimeLimitMs ?? JOB_TIME_LIMIT_MS);
    setImmediate(async () => {
      const started = db.prepare("UPDATE jobs SET status = 'running' WHERE id = ? AND status = 'queued'").run(jobId);
      try {
        if (started.changes === 0) return;
        const result = await measureLevels(join(blobDir, asset.blob), JSON.parse(asset.format), controller.signal);
        db.prepare("UPDATE jobs SET status = 'done', result = ?, finished_at = ? WHERE id = ? AND status = 'running'").run(JSON.stringify(result), now(), jobId);
      } catch {
        const reason = controller.signal.reason === 'cancelled' ? 'cancelled' : 'failed';
        db.prepare('UPDATE jobs SET status = ?, error = ?, finished_at = ? WHERE id = ? AND status = \'running\'')
          .run(reason, reason === 'failed' ? (controller.signal.aborted ? 'The analysis took too long.' : 'The analysis could not read the file.') : null, now(), jobId);
      } finally {
        clearTimeout(timer);
        running.delete(jobId);
      }
    });
    return { status: 202, body: publicJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId)) };
  });

  const ownJob = (id, user) => {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!job) throw new HttpError(404, 'not_found');
    return job;
  };
  route('GET', /^\/api\/jobs\/([\w-]+)$/, ({ request, params: [id] }) => ({ body: publicJob(ownJob(id, requireUser(request))) }));
  route('DELETE', /^\/api\/jobs\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownJob(id, user);
    cancelJob(id);
    return { body: publicJob(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)) };
  });

  return { forgetAssets, cancelJob, blobDir, tmpDir };
}
