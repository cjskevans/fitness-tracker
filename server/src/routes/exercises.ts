import express from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const rows = db.prepare<[number], { exercise: string }>(`
    SELECT DISTINCT we.exercise
    FROM sessions s
    JOIN workout_exercises we ON we.session_id = s.id
    WHERE s.user_id = ?
    ORDER BY we.exercise ASC
  `).all(userId);
  res.json(rows.map(r => r.exercise));
});

export default router;
