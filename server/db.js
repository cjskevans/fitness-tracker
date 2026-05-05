const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'workouts.db');
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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
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
`);

module.exports = db;
