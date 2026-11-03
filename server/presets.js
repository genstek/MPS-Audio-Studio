import { HttpError, readJson } from './http.js';
import { randomToken } from './security.js';
import { CHAIN_VERSION } from '../src/dsp/chain-params.js';
import { PRESET_SCHEMA, PRESET_VERSION, PresetError, defaultPreferences, validatePreferences, validatePreset } from '../src/presets.js';
import { PROPOSAL_VERSION } from '../src/proposal.js';

// Presets, preferences and remembered decisions (LAS-33). Every query is filtered by the signed-in
// owner: someone else's id gets the same 404 as one that does not exist. The server validates
// with the studio's own schemas and stores settings only (bounded JSON bodies, no audio).
export const MAX_PRESETS = 200;
export const MAX_DECISIONS = 500;
const SUMMARY_LIMIT = 8 * 1024;

const invalid = failure => {
  if (failure instanceof PresetError) throw new HttpError(422, 'invalid_preset', failure.message);
  throw failure;
};

export function presetRoutes({ route, db, now, requireUser, audit }) {
  const ownPreset = (id, user) => {
    const row = db.prepare('SELECT * FROM presets WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!row) throw new HttpError(404, 'not_found');
    return row;
  };
  // A reference profile may be linked only by its owner.
  const ownProfileId = (id, user) => {
    if (id === undefined || id === null) return null;
    if (typeof id !== 'string' || !db.prepare('SELECT 1 FROM reference_profiles WHERE id = ? AND owner_id = ?').get(id, user.id)) throw new HttpError(404, 'not_found');
    return id;
  };
  const summary = row => ({
    id: row.id, name: row.name, origin: row.origin, chainVersion: row.chain_version, analysisVersion: row.analysis_version,
    proposalVersion: row.proposal_version, strength: row.strength, referenceProfileId: row.reference_profile_id,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });

  route('GET', /^\/api\/presets$/, ({ request }) => {
    const user = requireUser(request);
    return { body: { presets: db.prepare('SELECT * FROM presets WHERE owner_id = ? ORDER BY name, created_at').all(user.id).map(summary) } };
  });

  route('GET', /^\/api\/presets\/([\w-]+)$/, ({ request, params: [id] }) => {
    const row = ownPreset(id, requireUser(request));
    return { body: { ...summary(row), schema: PRESET_SCHEMA, version: PRESET_VERSION, chain: JSON.parse(row.chain) } };
  });

  route('POST', /^\/api\/presets$/, async ({ request }) => {
    const user = requireUser(request);
    const body = await readJson(request);
    let preset;
    try { preset = validatePreset(body); } catch (failure) { invalid(failure); }
    const referenceProfileId = ownProfileId(body.referenceProfileId, user);
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM presets WHERE owner_id = ?').get(user.id);
    if (count >= MAX_PRESETS) throw new HttpError(422, 'too_many_presets', `You can keep up to ${MAX_PRESETS} presets; delete some first.`);
    const id = randomToken(16);
    const time = now();
    db.prepare(`INSERT INTO presets (id, owner_id, name, chain, chain_version, origin, analysis_version, proposal_version, strength, reference_profile_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, user.id, preset.name, JSON.stringify(preset.chain), CHAIN_VERSION, preset.origin, preset.analysisVersion, preset.proposalVersion, preset.strength, referenceProfileId, time, time,
    );
    audit('preset_created', user.id, id);
    return { status: 201, body: summary(db.prepare('SELECT * FROM presets WHERE id = ?').get(id)) };
  });

  // Rename only; a preset's settings are replaced by saving a new one.
  route('PATCH', /^\/api\/presets\/([\w-]+)$/, async ({ request, params: [id] }) => {
    const user = requireUser(request);
    const row = ownPreset(id, user);
    const body = await readJson(request);
    let name;
    try { name = validatePreset({ name: body.name, chain: JSON.parse(row.chain) }).name; } catch (failure) { invalid(failure); }
    db.prepare('UPDATE presets SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?').run(name, now(), id, user.id);
    audit('preset_renamed', user.id, id);
    return { body: summary(db.prepare('SELECT * FROM presets WHERE id = ?').get(id)) };
  });

  route('DELETE', /^\/api\/presets\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    ownPreset(id, user);
    db.prepare('DELETE FROM presets WHERE id = ? AND owner_id = ?').run(id, user.id);
    audit('preset_deleted', user.id, id);
    return { status: 204 };
  });

  // Preferences: the defaults until the owner saves some; DELETE resets them.
  route('GET', /^\/api\/preferences$/, ({ request }) => {
    const user = requireUser(request);
    const row = db.prepare('SELECT data FROM preferences WHERE owner_id = ?').get(user.id);
    return { body: { preferences: row ? JSON.parse(row.data) : defaultPreferences(), saved: Boolean(row) } };
  });

  route('PUT', /^\/api\/preferences$/, async ({ request }) => {
    const user = requireUser(request);
    let preferences;
    try { preferences = validatePreferences(await readJson(request)); } catch (failure) { invalid(failure); }
    db.prepare(`INSERT INTO preferences (owner_id, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(user.id, JSON.stringify(preferences), now());
    audit('preferences_saved', user.id, user.id);
    return { body: { preferences, saved: true } };
  });

  route('DELETE', /^\/api\/preferences$/, ({ request }) => {
    const user = requireUser(request);
    db.prepare('DELETE FROM preferences WHERE owner_id = ?').run(user.id);
    audit('preferences_reset', user.id, user.id);
    return { body: { preferences: defaultPreferences(), saved: false } };
  });

  // Remembered decisions: only sent when the owner ticks "Remember my decision".
  const decision = row => ({
    id: row.id, decision: row.decision, rating: row.rating, strength: row.strength, proposalVersion: row.proposal_version,
    referenceProfileId: row.reference_profile_id, summary: JSON.parse(row.summary), createdAt: row.created_at,
  });

  route('GET', /^\/api\/decisions$/, ({ request }) => {
    const user = requireUser(request);
    return { body: { decisions: db.prepare('SELECT * FROM decisions WHERE owner_id = ? ORDER BY created_at DESC').all(user.id).map(decision) } };
  });

  route('POST', /^\/api\/decisions$/, async ({ request }) => {
    const user = requireUser(request);
    const body = await readJson(request);
    if (!['accepted', 'rejected'].includes(body.decision)) throw new HttpError(422, 'invalid_decision', 'decision must be accepted or rejected.');
    const rating = body.rating ?? null;
    if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw new HttpError(422, 'invalid_decision', 'rating must be 1 to 5, or none.');
    if (!(typeof body.strength === 'number' && body.strength >= 0 && body.strength <= 100)) throw new HttpError(422, 'invalid_decision', 'strength must be between 0 and 100.');
    if (body.proposalVersion !== PROPOSAL_VERSION) throw new HttpError(422, 'invalid_decision', `proposalVersion must be ${PROPOSAL_VERSION}.`);
    const text = JSON.stringify(body.summary ?? null);
    if (!body.summary || typeof body.summary !== 'object' || text.length > SUMMARY_LIMIT) throw new HttpError(422, 'invalid_decision', 'summary must be a small object of settings.');
    const referenceProfileId = ownProfileId(body.referenceProfileId, user);
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM decisions WHERE owner_id = ?').get(user.id);
    if (count >= MAX_DECISIONS) throw new HttpError(422, 'too_many_decisions', `Up to ${MAX_DECISIONS} decisions are remembered; forget some first.`);
    const id = randomToken(16);
    db.prepare(`INSERT INTO decisions (id, owner_id, reference_profile_id, decision, rating, strength, proposal_version, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, user.id, referenceProfileId, body.decision, rating, body.strength, PROPOSAL_VERSION, text, now());
    audit('decision_saved', user.id, id);
    return { status: 201, body: decision(db.prepare('SELECT * FROM decisions WHERE id = ?').get(id)) };
  });

  route('DELETE', /^\/api\/decisions\/([\w-]+)$/, ({ request, params: [id] }) => {
    const user = requireUser(request);
    if (!db.prepare('DELETE FROM decisions WHERE id = ? AND owner_id = ?').run(id, user.id).changes) throw new HttpError(404, 'not_found');
    audit('decision_deleted', user.id, id);
    return { status: 204 };
  });

  route('DELETE', /^\/api\/decisions$/, ({ request }) => {
    const user = requireUser(request);
    const { changes } = db.prepare('DELETE FROM decisions WHERE owner_id = ?').run(user.id);
    audit('decisions_forgotten', user.id, String(changes));
    return { body: { forgotten: changes } };
  });
}
