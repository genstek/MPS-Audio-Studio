import { HttpError, readJson } from './http.js';
import { randomToken } from './security.js';
import { ANALYSIS_VERSION } from '../src/dsp/analysis.js';

// Reference sound profiles (LAS-30). A profile is measured on the owner's device by the studio's
// analysis (LAS-26) from a reference WAV the owner stored privately (asset kind "reference"). The
// server checks that it describes that exact file (same SHA-256 as the stored upload), a segment
// inside the file and a supported analysis version, and keeps it owner-private: someone else's id
// gets the same 404 as one that does not exist. Deleting the reference file, its project or the
// account deletes its profiles (foreign keys with ON DELETE CASCADE).
export const MIN_SEGMENT_SECONDS = 5;
const LABEL_LIMIT = 100;

const label = (value, fallback) => {
  const text = [...String(value ?? '')].filter(ch => ch >= ' ' && ch !== '\u007f').join('').trim().slice(0, LABEL_LIMIT);
  return text || fallback;
};
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function referenceRoutes({ route, db, now, requireUser, audit }) {
  const ownProfile = (id, user) => {
    const row = db.prepare('SELECT * FROM reference_profiles WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!row) throw new HttpError(404, 'not_found');
    return row;
  };
  const summary = row => {
    const profile = JSON.parse(row.profile);
    return {
      id: row.id, assetId: row.asset_id, name: row.name, style: row.style, sourceVersion: row.source_version,
      segment: { start: row.segment_start, end: row.segment_end }, analysisVersion: row.analysis_version,
      sourceSha256: row.source_sha256, createdAt: row.created_at,
      measurements: { integratedLufs: profile.loudness.integratedLufs, rangeLu: profile.loudness.rangeLu, truePeakDbtp: profile.peaks.truePeakDbtp },
    };
  };

  route('GET', /^\/api\/profiles$/, ({ request }) => {
    const user = requireUser(request);
    const rows = db.prepare('SELECT * FROM reference_profiles WHERE owner_id = ? ORDER BY style, name, created_at').all(user.id);
    return { body: { profiles: rows.map(summary) } };
  });

  route('GET', /^\/api\/profiles\/([\w-]+)$/, ({ request, params: [id] }) => {
    const row = ownProfile(id, requireUser(request));
    return { body: { ...summary(row), profile: JSON.parse(row.profile) } };
  });

  route('POST', /^\/api\/profiles$/, async ({ request }) => {
    const user = requireUser(request);
    const body = await readJson(request);
    const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND owner_id = ?').get(String(body.assetId ?? ''), user.id);
    if (!asset) throw new HttpError(404, 'not_found');
    if (asset.kind !== 'reference') throw new HttpError(422, 'not_reference', 'Profiles can only be made from reference files.');
    const { profile, segment } = body;
    if (!profile || typeof profile !== 'object' || profile.version !== ANALYSIS_VERSION) {
      throw new HttpError(422, 'unsupported_analysis', `Profiles must be measured with ${ANALYSIS_VERSION}.`);
    }
    if (profile.input?.sha256 !== asset.sha256) {
      throw new HttpError(422, 'source_mismatch', 'The measurements are not of the stored reference file (checksums differ).');
    }
    const duration = JSON.parse(asset.format).duration;
    if (!segment || !finite(segment.start) || !finite(segment.end) || segment.start < 0 || segment.end > duration + 1e-6 || segment.end <= segment.start) {
      throw new HttpError(422, 'invalid_segment', 'The segment must lie inside the reference file.');
    }
    if (segment.end - segment.start < MIN_SEGMENT_SECONDS) {
      throw new HttpError(422, 'unsuitable_segment', `Choose a segment of at least ${MIN_SEGMENT_SECONDS} seconds.`);
    }
    const tolerance = 1 / (profile.input.sampleRate || 8000) + 1e-9;
    if (!profile.input.segment || Math.abs(profile.input.segment.start - segment.start) > tolerance || Math.abs(profile.input.segment.end - segment.end) > tolerance) {
      throw new HttpError(422, 'segment_mismatch', 'The measurements are of a different segment.');
    }
    if (profile.loudness?.state !== 'ok') {
      throw new HttpError(422, 'unsuitable_segment', profile.loudness?.state === 'silent' ? 'This segment is silent; choose one with music.' : 'This segment is too short to measure.');
    }
    const id = randomToken(16);
    db.prepare(`INSERT INTO reference_profiles (id, owner_id, asset_id, name, style, source_version, segment_start, segment_end, analysis_version, source_sha256, profile, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, user.id, asset.id, label(body.name, asset.name), label(body.style, 'Unlabelled'), label(body.sourceVersion, 'Unspecified'),
      segment.start, segment.end, ANALYSIS_VERSION, asset.sha256, JSON.stringify(profile), now(),
    );
    audit('profile_created', user.id, id);
    return { status: 201, body: summary(db.prepare('SELECT * FROM reference_profiles WHERE id = ?').get(id)) };
  });

  route('DELETE', /^\/api\/profiles\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownProfile(id, user);
    db.prepare('DELETE FROM reference_profiles WHERE id = ? AND owner_id = ?').run(id, user.id);
    audit('profile_deleted', user.id, id);
    return { status: 204 };
  });
}
