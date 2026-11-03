import { DatabaseSync } from 'node:sqlite';

// Forward-only migrations; PRAGMA user_version records how many have run.
export const MIGRATIONS = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     password_salt TEXT NOT NULL,
     verified_at INTEGER,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     last_seen_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE email_tokens (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE mail_outbox (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     to_email TEXT NOT NULL,
     subject TEXT NOT NULL,
     body TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE audit (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     event TEXT NOT NULL,
     user_hash TEXT,
     item_id TEXT,
     created_at INTEGER NOT NULL
   );`,
  // LAS-23: private projects, audio assets and processing jobs. Every row names its owner.
  `CREATE TABLE projects (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX projects_owner ON projects(owner_id);
   CREATE TABLE assets (
     id TEXT PRIMARY KEY,
     project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     kind TEXT NOT NULL CHECK (kind IN ('source', 'reference', 'stem', 'preview', 'export')),
     name TEXT NOT NULL,
     blob TEXT NOT NULL UNIQUE,
     size INTEGER NOT NULL,
     sha256 TEXT NOT NULL,
     format TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX assets_owner ON assets(owner_id);
   CREATE INDEX assets_project ON assets(project_id);
   CREATE TABLE jobs (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
     kind TEXT NOT NULL CHECK (kind IN ('levels')),
     status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed', 'cancelled')),
     result TEXT,
     error TEXT,
     created_at INTEGER NOT NULL,
     finished_at INTEGER
   );
   CREATE INDEX jobs_owner ON jobs(owner_id);`,
  // LAS-24: recipient-specific consent for external processing, and what was sent under it.
  `CREATE TABLE consents (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     recipient TEXT NOT NULL,
     granted_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, recipient)
   );
   CREATE TABLE external_transmissions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
     recipient TEXT NOT NULL,
     bytes INTEGER NOT NULL,
     sha256 TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );`,
  // LAS-30: measured sound profiles of owner-private reference files. Deleting the reference file
  // (or its project, or the account) deletes its profiles.
  `CREATE TABLE reference_profiles (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     style TEXT NOT NULL,
     source_version TEXT NOT NULL,
     segment_start REAL NOT NULL,
     segment_end REAL NOT NULL,
     analysis_version TEXT NOT NULL,
     source_sha256 TEXT NOT NULL,
     profile TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX reference_profiles_owner ON reference_profiles(owner_id, created_at);`,
  // LAS-33: owner-private presets (complete chains with their versions), explicit mastering
  // preferences (one row per user) and remembered proposal decisions. Settings only, no audio.
  // Deleting the account deletes all of them; deleting a reference profile keeps the presets and
  // decisions made from it but forgets the link.
  `CREATE TABLE presets (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     chain TEXT NOT NULL,
     chain_version INTEGER NOT NULL,
     origin TEXT NOT NULL CHECK (origin IN ('manual', 'proposal', 'import')),
     analysis_version TEXT,
     proposal_version TEXT,
     strength REAL,
     reference_profile_id TEXT REFERENCES reference_profiles(id) ON DELETE SET NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE INDEX presets_owner ON presets(owner_id, created_at);
   CREATE TABLE preferences (
     owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     data TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE decisions (
     id TEXT PRIMARY KEY,
     owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     reference_profile_id TEXT REFERENCES reference_profiles(id) ON DELETE SET NULL,
     decision TEXT NOT NULL CHECK (decision IN ('accepted', 'rejected')),
     rating INTEGER CHECK (rating BETWEEN 1 AND 5),
     strength REAL NOT NULL,
     proposal_version TEXT NOT NULL,
     summary TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX decisions_owner ON decisions(owner_id, created_at);`,
];

export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  for (let index = version; index < MIGRATIONS.length; index++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[index]);
      db.exec(`PRAGMA user_version = ${index + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return db;
}

export const SCHEMA_VERSION = MIGRATIONS.length;
