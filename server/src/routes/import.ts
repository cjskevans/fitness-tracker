import express from 'express';
import db, { insertExercises, insertSession } from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

interface ImportedSet {
  setNumber: number;
  reps: number;
  weight: number;
}

router.post('/', requireAuth, (req, res) => {
  const { csv }: { csv?: string } = req.body;
  if (!csv) return res.status(400).json({ error: 'CSV content is required' });

  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: 'CSV has no data rows' });

  // Each unique date+timeOfDay becomes one session.
  const sessions = new Map<string, { date: string; timeOfDay: string | null; exercises: Map<string, ImportedSet[]> }>();
  for (const line of lines.slice(1)) {
    const [rawDate, rawTime, rawExercise, setNumber, reps, weight] = line.split(',');
    const date = rawDate?.trim();
    const timeOfDay = rawTime?.trim() || null;
    const exercise = rawExercise?.trim();
    if (!date || !exercise || !reps || !weight) {
      return res.status(400).json({ error: `Invalid row: ${line}` });
    }
    const key = `${date}|${timeOfDay ?? ''}`;
    let session = sessions.get(key);
    if (!session) sessions.set(key, session = { date, timeOfDay, exercises: new Map() });
    let sets = session.exercises.get(exercise);
    if (!sets) session.exercises.set(exercise, sets = []);
    sets.push({ setNumber: Number(setNumber), reps: Number(reps), weight: Number(weight) });
  }

  const { userId } = req.user;
  db.transaction(() => {
    for (const session of sessions.values()) {
      const { lastInsertRowid: sessionId } = insertSession.run(userId, session.date, session.timeOfDay);
      insertExercises(sessionId, Array.from(session.exercises, ([exercise, sets]) => ({ exercise, sets })));
    }
  })();

  res.json({ imported: sessions.size });
});

export default router;
