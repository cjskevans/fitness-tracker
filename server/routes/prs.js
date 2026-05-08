const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
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

module.exports = router;
