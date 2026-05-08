const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { exercise } = req.query;
  if (!exercise) return res.status(400).json({ error: 'exercise is required' });
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

module.exports = router;
