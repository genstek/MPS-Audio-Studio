import { DatabaseSync } from 'node:sqlite';

// Forward-only migrations; PRAGMA user_version records how many have run.
const MIGRATIONS = [
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
