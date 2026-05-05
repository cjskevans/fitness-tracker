const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ── Users ────────────────────────────────────────────────────────────────────

app.post('/api/users', (req, res) => {
  const username = req.body.username?.trim();
  if (!username) return res.status(400).json({ error: 'Username is required' });
  db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)').run(username);
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
  res.json(user);
});

// ── Sessions ─────────────────────────────────────────────────────────────────

// Body: { userId, date, timeOfDay?, exercises: [{ exercise, sets: [{ reps, weight }] }] }
app.post('/api/sessions', (req, res) => {
  const { userId, date, timeOfDay, exercises } = req.body;

  if (!userId || !date || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'userId, date, and at least one exercise are required' });
  }
  const today = new Date().toISOString().split('T')[0];
  if (date > today) {
    return res.status(400).json({ error: 'Cannot log workouts in the future' });
  }
  for (const ex of exercises) {
    if (!ex.exercise) return res.status(400).json({ error: 'Each exercise must have a name' });
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      return res.status(400).json({ error: `${ex.exercise} must have at least one set` });
    }
    for (const s of ex.sets) {
      if (!s.reps || s.reps <= 0 || s.weight == null || s.weight <= 0) {
        return res.status(400).json({ error: 'Each set requires reps and weight greater than 0' });
      }
    }
  }

  // Snapshot previous bests before inserting
  const prChecks = exercises.map(ex => ({
    exercise: ex.exercise.trim(),
    sets: ex.sets,
    prevBest: db.prepare(`
      SELECT st.weight, st.reps
      FROM sessions s
      JOIN workout_exercises we ON we.session_id = s.id
      JOIN sets st ON st.workout_exercise_id = we.id
      WHERE s.user_id = ? AND we.exercise = ?
      ORDER BY st.weight DESC, st.reps DESC
      LIMIT 1
    `).get(userId, ex.exercise.trim()),
  }));

  const insertSession = db.prepare('INSERT INTO sessions (user_id, date, time_of_day) VALUES (?, ?, ?)');
  const insertExercise = db.prepare('INSERT INTO workout_exercises (session_id, exercise, order_num) VALUES (?, ?, ?)');
  const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, reps, weight) VALUES (?, ?, ?, ?)');

  const sessionId = db.transaction(() => {
    const { lastInsertRowid: sid } = insertSession.run(userId, date, timeOfDay || null);
    exercises.forEach((ex, ei) => {
      const { lastInsertRowid: exId } = insertExercise.run(sid, ex.exercise.trim(), ei + 1);
      ex.sets.forEach((s, si) => insertSet.run(exId, si + 1, s.reps, s.weight));
    });
    return sid;
  })();

  const beatsPR = (prevBest, s) => {
    if (!prevBest) return true;
    if (s.weight > prevBest.weight) return true;
    if (s.weight === prevBest.weight && s.reps > prevBest.reps) return true;
    return false;
  };

  const newPRs = prChecks
    .filter(({ prevBest, sets }) => sets.some(s => beatsPR(prevBest, s)))
    .map(({ exercise, prevBest, sets }) => ({
      exercise,
      prSet: sets.reduce((best, s) =>
        s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best
      ),
    }));

  res.status(201).json({ id: sessionId, newPRs });
});

app.get('/api/sessions', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const rows = db.prepare(`
    SELECT
      s.id AS session_id, s.date, s.time_of_day,
      we.id AS we_id, we.exercise, we.order_num,
      st.id AS set_id, st.set_number, st.reps, st.weight
    FROM sessions s
    LEFT JOIN workout_exercises we ON we.session_id = s.id
    LEFT JOIN sets st ON st.workout_exercise_id = we.id
    WHERE s.user_id = ?
    ORDER BY s.date DESC, s.id DESC, we.order_num ASC, st.set_number ASC
  `).all(userId);

  const sessionMap = new Map();
  const result = [];
  for (const row of rows) {
    if (!sessionMap.has(row.session_id)) {
      const session = { id: row.session_id, date: row.date, time_of_day: row.time_of_day, exercises: [] };
      sessionMap.set(row.session_id, session);
      result.push(session);
    }
    const session = sessionMap.get(row.session_id);
    if (row.we_id) {
      let ex = session.exercises.find(e => e.id === row.we_id);
      if (!ex) {
        ex = { id: row.we_id, exercise: row.exercise, order_num: row.order_num, sets: [] };
        session.exercises.push(ex);
      }
      if (row.set_id) {
        ex.sets.push({ id: row.set_id, set_number: row.set_number, reps: row.reps, weight: row.weight });
      }
    }
  }
  res.json(result);
});

app.put('/api/sessions/:id', (req, res) => {
  const { date, timeOfDay, exercises } = req.body;
  const { id } = req.params;

  if (!date || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'date and at least one exercise are required' });
  }
  const today = new Date().toISOString().split('T')[0];
  if (date > today) {
    return res.status(400).json({ error: 'Cannot log workouts in the future' });
  }
  for (const ex of exercises) {
    if (!ex.exercise) return res.status(400).json({ error: 'Each exercise must have a name' });
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      return res.status(400).json({ error: `${ex.exercise} must have at least one set` });
    }
    for (const s of ex.sets) {
      if (!s.reps || s.reps <= 0 || s.weight == null || s.weight <= 0) {
        return res.status(400).json({ error: 'Each set requires reps and weight greater than 0' });
      }
    }
  }

  const insertExercise = db.prepare('INSERT INTO workout_exercises (session_id, exercise, order_num) VALUES (?, ?, ?)');
  const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, reps, weight) VALUES (?, ?, ?, ?)');

  db.transaction(() => {
    db.prepare('UPDATE sessions SET date = ?, time_of_day = ? WHERE id = ?').run(date, timeOfDay || null, id);
    db.prepare('DELETE FROM workout_exercises WHERE session_id = ?').run(id);
    exercises.forEach((ex, ei) => {
      const { lastInsertRowid: exId } = insertExercise.run(id, ex.exercise.trim(), ei + 1);
      ex.sets.forEach((s, si) => insertSet.run(exId, si + 1, s.reps, s.weight));
    });
  })();

  res.json({ ok: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// ── Exercises (distinct, for progress dropdown) ───────────────────────────────

app.get('/api/exercises', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const rows = db.prepare(`
    SELECT DISTINCT we.exercise
    FROM sessions s
    JOIN workout_exercises we ON we.session_id = s.id
    WHERE s.user_id = ?
    ORDER BY we.exercise ASC
  `).all(userId);
  res.json(rows.map(r => r.exercise));
});

// ── Chart data (max weight per session for one exercise) ──────────────────────

app.get('/api/workouts', (req, res) => {
  const { exercise, userId } = req.query;
  if (!userId || !exercise) return res.status(400).json({ error: 'userId and exercise are required' });
  const rows = db.prepare(`
    SELECT s.id, s.date, MAX(st.weight) AS weight
    FROM sessions s
    JOIN workout_exercises we ON we.session_id = s.id
    JOIN sets st ON st.workout_exercise_id = we.id
    WHERE s.user_id = ? AND we.exercise = ?
    GROUP BY s.id
    ORDER BY s.date ASC
  `).all(userId, exercise);
  res.json(rows);
});

// ── Personal records ──────────────────────────────────────────────────────────

app.get('/api/prs', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const rows = db.prepare(`
    WITH ranked AS (
      SELECT
        we.exercise,
        st.weight,
        st.reps,
        ROW_NUMBER() OVER (
          PARTITION BY we.exercise
          ORDER BY st.weight DESC, st.reps DESC
        ) AS rn
      FROM sessions s
      JOIN workout_exercises we ON we.session_id = s.id
      JOIN sets st ON st.workout_exercise_id = we.id
      WHERE s.user_id = ?
    )
    SELECT exercise, weight, reps FROM ranked WHERE rn = 1
    ORDER BY exercise ASC
  `).all(userId);
  res.json(rows);
});

if (require.main === module) {
  app.listen(3001, () => console.log('Server running on http://localhost:3001'));
}

module.exports = app;
