import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpError, readJson } from './http.js';
import { LIMITS } from './limits.js';
import { normalizeEmail, randomToken, verifyPassword } from './security.js';

// Consent and deletion (LAS-24). Audio goes to an external recipient only under an active consent
// for that recipient; deleting an account removes everything it owns at once.
export function privacyRoutes({ route, db, now, config, requireUser, audit, library, limit, clearSessionCookie }) {
  const recipients = new Map((config.externalRecipients ?? []).map(recipient => [recipient.id, recipient]));
  const knownRecipient = id => {
    const recipient = recipients.get(id);
    if (!recipient) throw new HttpError(400, 'unknown_recipient', 'This external service is not available.');
    return recipient;
  };

  route('GET', /^\/api\/external-recipients$/, ({ request }) => {
    requireUser(request);
    return { body: { recipients: [...recipients.values()] } };
  });

  route('GET', /^\/api\/account\/consents$/, ({ request }) => {
    const user = requireUser(request);
    const consents = db.prepare('SELECT recipient, granted_at AS grantedAt FROM consents WHERE user_id = ? ORDER BY granted_at').all(user.id);
    return { body: { consents } };
  });

  route('POST', /^\/api\/account\/consents$/, async ({ request }) => {
    const user = requireUser(request);
    const recipient = knownRecipient((await readJson(request)).recipient);
    db.prepare('INSERT OR REPLACE INTO consents (user_id, recipient, granted_at) VALUES (?, ?, ?)').run(user.id, recipient.id, now());
    audit('consent_granted', user.id, recipient.id);
    return { status: 201, body: { recipient: recipient.id } };
  });

  route('DELETE', /^\/api\/account\/consents\/([\w-]+)$/, ({ request, params: [recipient] }) => {
    const user = requireUser(request);
    db.prepare('DELETE FROM consents WHERE user_id = ? AND recipient = ?').run(user.id, recipient);
    audit('consent_withdrawn', user.id, recipient);
    return { status: 204 };
  });

  // Sends a stored file to an external recipient. Refused without that recipient's consent.
  route('POST', /^\/api\/assets\/([\w-]+)\/external-jobs$/, async ({ request, params: [assetId] }) => {
    const user = requireUser(request);
    const asset = db.prepare('SELECT id, blob FROM assets WHERE id = ? AND owner_id = ?').get(assetId, user.id);
    if (!asset) throw new HttpError(404, 'not_found');
    const recipient = knownRecipient((await readJson(request)).recipient);
    const consent = db.prepare('SELECT 1 FROM consents WHERE user_id = ? AND recipient = ?').get(user.id, recipient.id);
    if (!consent) throw new HttpError(403, 'consent_required', `Allow ${recipient.name} first. Nothing was sent.`);
    // The only recipient today is the local test stand-in: it records what it would receive.
    const bytes = readFileSync(join(library.blobDir, asset.blob));
    const id = randomToken(16);
    db.prepare('INSERT INTO external_transmissions (id, user_id, asset_id, recipient, bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, asset.id, recipient.id, bytes.length, createHash('sha256').update(bytes).digest('hex'), now());
    audit('external_transmission', user.id, recipient.id);
    return { status: 202, body: { transmissionId: id, recipient: recipient.id } };
  });

  // Deletes the account and everything it owns right away (password required).
  route('DELETE', /^\/api\/account$/, async ({ request }) => {
    const user = requireUser(request);
    const { password } = await readJson(request);
    const failureKeys = limit(request, [[LIMITS.loginFailuresPerEmail, `login:${user.email}`]], { count: false });
    const row = db.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').get(user.id);
    if (typeof password !== 'string' || !(await verifyPassword(password, row.password_hash, row.password_salt))) {
      for (const [, key] of failureKeys) limit.hit(key);
      throw new HttpError(403, 'wrong_password', 'The password is not correct. Nothing was deleted.');
    }
    library.forgetAssets(db.prepare('SELECT id, blob FROM assets WHERE owner_id = ?').all(user.id));
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM mail_outbox WHERE to_email = ?').run(user.email);
      // Cascades to sessions, tokens, projects, assets, jobs, consents and transmissions.
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    audit('account_deleted', user.id);
    return { status: 204, headers: { 'Set-Cookie': clearSessionCookie() } };
  });

  if (config.devEndpoints) {
    // What the local test recipient "received" for one account (development and tests only).
    route('GET', /^\/api\/dev\/transmissions$/, ({ url }) => ({
      body: {
        transmissions: db.prepare(`SELECT t.recipient, t.bytes, t.created_at AS createdAt FROM external_transmissions t
          JOIN users u ON u.id = t.user_id WHERE u.email = ? ORDER BY t.created_at`).all(normalizeEmail(url.searchParams.get('email')) ?? ''),
      },
    }));
  }
}
