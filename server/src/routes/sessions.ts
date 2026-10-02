import express from 'express';
import db, { insertExercises, insertSession } from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Request bodies are untrusted, so every field is optional here and
// validateSession checks the shape at runtime before anything is written.
interface SetInput {
  reps?: number;
  weight?: number;
}

interface ExerciseInput {
  exercise?: string;
  sets?: SetInput[];
}

interface SessionInput {
  date?: string;
  timeOfDay?: string;
  exercises?: ExerciseInput[];
}

interface ValidSet {
  reps: number;
  weight: number;
}

interface ValidExercise {
  exercise: string;
  sets: ValidSet[];
}

interface ValidSession {
  date: string;
  timeOfDay: string | null;
  exercises: ValidExercise[];
}

interface SessionRow {
  session_id: number;
  date: string;
  time_of_day: string | null;
  // The exercise and set columns come from LEFT JOINs, so a session with no
  // exercises yields one row with these all null.
  we_id: number | null;
  exercise: string | null;
  order_num: number | null;
  set_id: number | null;
  set_number: number | null;
  reps: number | null;
  weight: number | null;
}

interface SessionSet {
  id: number;
  set_number: number | null;
  reps: number | null;
  weight: number | null;
}

interface SessionExercise {
  id: number;
  exercise: string | null;
  order_num: number | null;
  sets: SessionSet[];
}

interface Session {
  id: number;
  date: string;
  time_of_day: string | null;
  exercises: SessionExercise[];
}

type Validation = { error: string } | { session: ValidSession };

function validateSession({ date, timeOfDay, exercises }: SessionInput): Validation {
  if (!date || !Array.isArray(exercises) || exercises.length === 0) {
    return { error: 'date and at least one exercise are required' };
  }
  // The date is the client's local date and we don't know its timezone, so measure
  // "future" against the furthest-ahead zone (UTC+14) rather than UTC.
  const latestToday = new Date(Date.now() + 14 * 3600_000).toISOString().split('T')[0]!;
  if (date > latestToday) {
    return { error: 'Cannot log workouts in the future' };
  }
  for (const ex of exercises) {
    if (!ex.exercise) return { error: 'Each exercise must have a name' };
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      return { error: `${ex.exercise} must have at least one set` };
    }
    for (const s of ex.sets) {
      if (!s.reps || s.reps <= 0 || s.weight == null || s.weight <= 0) {
        return { error: 'Each set requires reps and weight greater than 0' };
      }
    }
  }
  return {
    session: {
      date,
      timeOfDay: timeOfDay || null,
      exercises: exercises.map(ex => ({ exercise: ex.exercise!.trim(), sets: ex.sets as ValidSet[] })),
    },
  };
}

const beats = (s: ValidSet, other: ValidSet | undefined) =>
  !other || s.weight > other.weight || (s.weight === other.weight && s.reps > other.reps);

router.post('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const result = validateSession(req.body);
  if ('error' in result) return res.status(400).json(result);
  const { date, timeOfDay, exercises } = result.session;

  const prevBestQuery = db.prepare<[number, string], ValidSet>(`
    SELECT st.weight, st.reps
    FROM sessions s
    JOIN workout_exercises we ON we.session_id = s.id
    JOIN sets st ON st.workout_exercise_id = we.id
    WHERE s.user_id = ? AND we.exercise = ?
    ORDER BY st.weight DESC, st.reps DESC
    LIMIT 1
  `);
  // Looked up before the insert, or the new sets would be their own previous best.
  const newPRs = exercises
    .map(ex => ({ exercise: ex.exercise, prSet: ex.sets.reduce((best, s) => beats(s, best) ? s : best) }))
    .filter(({ exercise, prSet }) => beats(prSet, prevBestQuery.get(userId, exercise)));

  const sessionId = db.transaction(() => {
    const { lastInsertRowid: sid } = insertSession.run(userId, date, timeOfDay);
    insertExercises(sid, exercises);
    return sid;
  })();

  res.status(201).json({ id: sessionId, newPRs });
});

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;

  const rows = db.prepare<[number], SessionRow>(`
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

  const sessionMap = new Map<number, Session>();
  const result: Session[] = [];
  for (const row of rows) {
    let session = sessionMap.get(row.session_id);
    if (!session) {
      session = { id: row.session_id, date: row.date, time_of_day: row.time_of_day, exercises: [] };
      sessionMap.set(row.session_id, session);
      result.push(session);
    }
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

const sessionOwner = db.prepare<[string], { user_id: number }>('SELECT user_id FROM sessions WHERE id = ?');

router.put<{ id: string }>('/:id', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  const owner = sessionOwner.get(id);
  if (!owner || owner.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = validateSession(req.body);
  if ('error' in result) return res.status(400).json(result);
  const { date, timeOfDay, exercises } = result.session;

  db.transaction(() => {
    db.prepare('UPDATE sessions SET date = ?, time_of_day = ? WHERE id = ?').run(date, timeOfDay, id);
    db.prepare('DELETE FROM workout_exercises WHERE session_id = ?').run(id);
    insertExercises(id, exercises);
  })();

  res.json({ ok: true });
});

router.delete<{ id: string }>('/:id', requireAuth, (req, res) => {
  const { userId } = req.user;
  const owner = sessionOwner.get(req.params.id);
  if (!owner || owner.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
