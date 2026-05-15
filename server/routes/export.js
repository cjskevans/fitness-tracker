const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;

  const rows = db.prepare(`
    SELECT
      s.date,
      s.time_of_day,
      we.exercise,
      st.set_number,
      st.reps,
      st.weight
    FROM sessions s
    JOIN workout_exercises we ON we.session_id = s.id
    JOIN sets st ON st.workout_exercise_id = we.id
    WHERE s.user_id = ?
    ORDER BY s.date ASC, s.id ASC, we.order_num ASC, st.set_number ASC
  `).all(userId);

  const lines = ['Date,Time of Day,Exercise,Set,Reps,Weight (lbs)'];
  for (const r of rows) {
    lines.push(`${r.date},${r.time_of_day || ''},${r.exercise},${r.set_number},${r.reps},${r.weight}`);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="workouts.csv"');
  res.send(lines.join('\n'));
});

module.exports = router;
