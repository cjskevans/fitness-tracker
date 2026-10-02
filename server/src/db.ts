import Database from 'better-sqlite3';
import path from 'path';

// '..' because this file runs from src/ under tsx and from dist/ once built;
// either way the database lives at server/workouts.db.
const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'workouts.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

// Migrate to session-based schema if not already there
const hasSessionsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
).get();

if (!hasSessionsTable) {
  db.exec(`
    DROP TABLE IF EXISTS sets;
    DROP TABLE IF EXISTS workout_exercises;
    DROP TABLE IF EXISTS workouts;
  `);
}

// Add password_hash to users if this is an existing DB without it
const hasPasswordHash = db
  .prepare("SELECT * FROM pragma_table_info('users') WHERE name='password_hash'")
  .get();
if (!hasPasswordHash) {
  const usersTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  if (usersTableExists) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    default_set_count INTEGER NOT NULL DEFAULT 3,
    show_time_of_day INTEGER NOT NULL DEFAULT 1,
    dark_mode INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise TEXT NOT NULL,
    order_num INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    time_of_day TEXT
  );

  CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise TEXT NOT NULL,
    order_num INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL
  );

  -- Throwaway users created by POST /api/auth/demo. Membership here, not the
  -- username, is what allows DELETE /api/auth/demo to remove an account.
  CREATE TABLE IF NOT EXISTS demo_users (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
