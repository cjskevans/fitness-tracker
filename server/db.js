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

// Add time_of_day column if missing (nullable: 'AM', 'PM', or null)
const hasTimeOfDay = db.prepare(
  "SELECT COUNT(*) AS n FROM pragma_table_info('workouts') WHERE name='time_of_day'"
).get().n > 0;

if (!hasTimeOfDay) {
  db.exec("ALTER TABLE workouts ADD COLUMN time_of_day TEXT");
}

module.exports = db;
