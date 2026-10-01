import express from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

interface ImportedSet {
  setNumber: number;
  reps: number;
  weight: number;
}

interface ImportedRow extends ImportedSet {
  date: string;
  timeOfDay: string | null;
  exercise: string;
}

interface ImportedSession {
  date: string;
  timeOfDay: string | null;
  exercises: Map<string, ImportedSet[]>;
}

router.post('/', requireAuth, (req, res) => {
  const { csv }: { csv?: string } = req.body;
  if (!csv) return res.status(400).json({ error: 'CSV content is required' });

  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: 'CSV has no data rows' });

  const rows: ImportedRow[] = [];
  for (const line of lines.slice(1)) {
    const [date, timeOfDay, exercise, setNumber, reps, weight] = line.split(',');
    if (!date || !exercise || !reps || !weight) {
      return res.status(400).json({ error: `Invalid row: ${line}` });
    }
    rows.push({
      date: date.trim(),
      timeOfDay: timeOfDay?.trim() || null,
      exercise: exercise.trim(),
      setNumber: Number(setNumber),
      reps: Number(reps),
      weight: Number(weight),
    });
  }

  // Group by date+timeOfDay — each unique combo becomes one session
  const sessionMap = new Map<string, ImportedSession>();
  for (const row of rows) {
    const key = `${row.date}|${row.timeOfDay ?? ''}`;
    let session = sessionMap.get(key);
    if (!session) {
      session = { date: row.date, timeOfDay: row.timeOfDay, exercises: new Map() };
      sessionMap.set(key, session);
    }
    let sets = session.exercises.get(row.exercise);
    if (!sets) {
      sets = [];
      session.exercises.set(row.exercise, sets);
    }
    sets.push({ setNumber: row.setNumber, reps: row.reps, weight: row.weight });
  }

  const { userId } = req.user;
  const insertSession = db.prepare('INSERT INTO sessions (user_id, date, time_of_day) VALUES (?, ?, ?)');
  const insertExercise = db.prepare('INSERT INTO workout_exercises (session_id, exercise, order_num) VALUES (?, ?, ?)');
  const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, reps, weight) VALUES (?, ?, ?, ?)');

  let imported = 0;
  db.transaction(() => {
    for (const session of sessionMap.values()) {
      const { lastInsertRowid: sessionId } = insertSession.run(userId, session.date, session.timeOfDay);
      let orderNum = 1;
      for (const [exercise, sets] of session.exercises) {
        const { lastInsertRowid: exId } = insertExercise.run(sessionId, exercise, orderNum++);
        for (const set of sets) {
          insertSet.run(exId, set.setNumber, set.reps, set.weight);
        }
      }
      imported++;
    }
  })();

  res.json({ imported });
});

export default router;
