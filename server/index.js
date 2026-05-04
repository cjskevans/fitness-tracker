const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Create or retrieve a user by username
app.post('/api/users', (req, res) => {
  const username = req.body.username?.trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });
  db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)').run(username);
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
  res.json(user);
});

// Chart data: one point per session (max weight that session)
app.get('/api/workouts', (req, res) => {
  const { exercise, userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (exercise) {
    const rows = db.prepare(`
      SELECT w.id, w.date, MAX(s.weight) AS weight
      FROM workouts w
      JOIN sets s ON s.workout_id = w.id
      WHERE w.user_id = ? AND w.exercise = ?
      GROUP BY w.id
      ORDER BY w.date ASC
    `).all(userId, exercise);
    return res.json(rows);
  }
  const rows = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC').all(userId);
  res.json(rows);
});

app.get('/api/exercises', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const rows = db.prepare(
    'SELECT DISTINCT exercise FROM workouts WHERE user_id = ? ORDER BY exercise ASC'
  ).all(userId);
  res.json(rows.map(r => r.exercise));
});

// Body: { date, exercise, userId, timeOfDay?, sets: [{ reps, weight }, ...] }
app.post('/api/workouts', (req, res) => {
  const { date, exercise, userId, timeOfDay, sets } = req.body;
  if (!date || !exercise || !userId || !Array.isArray(sets) || sets.length === 0) {
    return res.status(400).json({ error: 'date, exercise, userId, and at least one set are required' });
  }
  const today = new Date().toISOString().split('T')[0];
  if (date > today) {
    return res.status(400).json({ error: 'Cannot log workouts in the future' });
  }
  for (const s of sets) {
    if (!s.reps || s.weight == null) {
      return res.status(400).json({ error: 'Each set requires reps and weight' });
    }
  }

  const prevBest = db.prepare(`
    SELECT s.weight, s.reps
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = ? AND w.exercise = ?
    ORDER BY s.weight DESC, s.reps DESC
    LIMIT 1
  `).get(userId, exercise.trim());

  const insertWorkout = db.prepare(
    'INSERT INTO workouts (date, exercise, user_id, time_of_day) VALUES (?, ?, ?, ?)'
  );
  const insertSet = db.prepare(
    'INSERT INTO sets (workout_id, set_number, reps, weight) VALUES (?, ?, ?, ?)'
  );

  const workoutId = db.transaction(() => {
    const { lastInsertRowid } = insertWorkout.run(date, exercise.trim(), userId, timeOfDay || null);
    sets.forEach((s, i) => insertSet.run(lastInsertRowid, i + 1, s.reps, s.weight));
    return lastInsertRowid;
  })();

  const beatsPR = (s) => {
    if (!prevBest) return true;
    if (s.weight > prevBest.weight) return true;
    if (s.weight === prevBest.weight && s.reps > prevBest.reps) return true;
    return false;
  };
  const newPR = sets.some(beatsPR);
  const prSet = newPR
    ? sets.reduce((best, s) =>
        s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best
      )
    : null;

  res.status(201).json({ id: workoutId, newPR, prSet });
});

app.delete('/api/workouts/:id', (req, res) => {
  db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

app.get('/api/prs', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const rows = db.prepare(`
    WITH ranked AS (
      SELECT
        w.exercise,
        s.weight,
        s.reps,
        ROW_NUMBER() OVER (
          PARTITION BY w.exercise
          ORDER BY s.weight DESC, s.reps DESC
        ) AS rn
      FROM workouts w
      JOIN sets s ON s.workout_id = w.id
      WHERE w.user_id = ?
    )
    SELECT exercise, weight, reps FROM ranked WHERE rn = 1
    ORDER BY exercise ASC
  `).all(userId);
  res.json(rows);
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
