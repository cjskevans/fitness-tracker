const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { date, timeOfDay, exercises } = req.body;

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

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;

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

router.put('/:id', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { date, timeOfDay, exercises } = req.body;
  const { id } = req.params;

  const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(id);
  if (!session || session.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

router.delete('/:id', requireAuth, (req, res) => {
  const { userId } = req.user;
  const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(req.params.id);
  if (!session || session.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
