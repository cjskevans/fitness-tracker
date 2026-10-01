import express from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

interface ChartPoint {
  id: number;
  date: string;
  weight: number;
}

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { exercise } = req.query;
  if (!exercise) return res.status(400).json({ error: 'exercise is required' });
  const rows = db.prepare<[number, unknown], ChartPoint>(`
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

export default router;
