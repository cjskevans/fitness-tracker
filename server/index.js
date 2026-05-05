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

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) return res.json({ defaultSetCount: 3, showTimeOfDay: true, darkMode: false });
  res.json({
    defaultSetCount: row.default_set_count,
    showTimeOfDay: row.show_time_of_day === 1,
    darkMode: row.dark_mode === 1,
  });
});

app.put('/api/settings/:userId', (req, res) => {
  const { defaultSetCount, showTimeOfDay, darkMode } = req.body;
  const { userId } = req.params;
  db.prepare(`
    INSERT INTO user_settings (user_id, default_set_count, show_time_of_day, dark_mode)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      default_set_count = excluded.default_set_count,
      show_time_of_day  = excluded.show_time_of_day,
      dark_mode         = excluded.dark_mode
  `).run(userId, defaultSetCount ?? 3, showTimeOfDay ? 1 : 0, darkMode ? 1 : 0);
  res.json({ ok: true });
});

// ── Templates ─────────────────────────────────────────────────────────────────

app.get('/api/templates', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const rows = db.prepare(`
    SELECT t.id, t.name, te.exercise, te.order_num
    FROM templates t
    JOIN template_exercises te ON te.template_id = t.id
    WHERE t.user_id = ?
    ORDER BY t.name ASC, te.order_num ASC
  `).all(userId);

  const templateMap = new Map();
  const result = [];
  for (const row of rows) {
    if (!templateMap.has(row.id)) {
      const tpl = { id: row.id, name: row.name, exercises: [] };
      templateMap.set(row.id, tpl);
      result.push(tpl);
    }
    templateMap.get(row.id).exercises.push(row.exercise);
  }
  res.json(result);
});

app.post('/api/templates', (req, res) => {
  const { userId, name, exercises } = req.body;
  if (!userId || !name?.trim() || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'userId, name, and at least one exercise are required' });
  }

  const insertTemplate = db.prepare('INSERT INTO templates (user_id, name) VALUES (?, ?)');
  const insertExercise = db.prepare('INSERT INTO template_exercises (template_id, exercise, order_num) VALUES (?, ?, ?)');

  const id = db.transaction(() => {
    const { lastInsertRowid } = insertTemplate.run(userId, name.trim());
    exercises.forEach((ex, i) => insertExercise.run(lastInsertRowid, ex.trim(), i + 1));
    return lastInsertRowid;
  })();

  res.status(201).json({ id });
});

app.delete('/api/templates/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

app.get('/api/templates/:id/last-session', (req, res) => {
  const templateExercises = db.prepare(
    'SELECT exercise FROM template_exercises WHERE template_id = ? ORDER BY order_num'
  ).all(req.params.id).map(r => r.exercise);

  if (!templateExercises.length) return res.json(null);

  const placeholders = templateExercises.map(() => '?').join(',');
  const session = db.prepare(`
    SELECT s.id, s.date, s.time_of_day
    FROM sessions s
    WHERE s.user_id = (SELECT user_id FROM templates WHERE id = ?)
    AND s.id IN (
      SELECT we.session_id FROM workout_exercises we
      WHERE we.exercise IN (${placeholders})
      GROUP BY we.session_id
      HAVING COUNT(DISTINCT we.exercise) = ?
    )
    ORDER BY s.date DESC, s.id DESC
    LIMIT 1
  `).get(req.params.id, ...templateExercises, templateExercises.length);

  if (!session) return res.json(null);

  const rows = db.prepare(`
    SELECT we.exercise, we.order_num, st.set_number, st.reps, st.weight
    FROM workout_exercises we
    JOIN sets st ON st.workout_exercise_id = we.id
    WHERE we.session_id = ?
    ORDER BY we.order_num, st.set_number
  `).all(session.id);

  const exerciseMap = new Map();
  for (const row of rows) {
    if (!exerciseMap.has(row.exercise)) {
      exerciseMap.set(row.exercise, { exercise: row.exercise, sets: [] });
    }
    exerciseMap.get(row.exercise).sets.push({ reps: row.reps, weight: row.weight });
  }

  res.json({
    date: session.date,
    time_of_day: session.time_of_day,
    exercises: Array.from(exerciseMap.values()),
  });
});

if (require.main === module) {
  app.listen(3001, () => console.log('Server running on http://localhost:3001'));
}

module.exports = app;
