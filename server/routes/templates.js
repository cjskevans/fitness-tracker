const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;

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

router.post('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { name, exercises } = req.body;
  if (!name?.trim() || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'name and at least one exercise are required' });
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

router.delete('/:id', requireAuth, (req, res) => {
  const { userId } = req.user;
  const template = db.prepare('SELECT user_id FROM templates WHERE id = ?').get(req.params.id);
  if (!template || template.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.get('/:id/last-session', requireAuth, (req, res) => {
  const { userId } = req.user;
  const template = db.prepare('SELECT user_id FROM templates WHERE id = ?').get(req.params.id);
  if (!template || template.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

module.exports = router;
