const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'workouts.db'));

db.pragma('foreign_keys = ON');

// Drop and recreate if schema doesn't have users table
const hasUsers = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
).get();

if (!hasUsers) {
  db.exec('DROP TABLE IF EXISTS sets; DROP TABLE IF EXISTS workouts;');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    exercise TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL
  );
`);

module.exports = db;
