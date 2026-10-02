import db from './db';

// [exercise, starting weight, weekly increase]
const ROTATION: [string, [string, number, number][]][] = [
  ['Push', [['Bench Press', 135, 2.5], ['Overhead Press', 85, 1.25], ['Tricep Pushdown', 40, 1]]],
  ['Pull', [['Deadlift', 185, 5], ['Barbell Row', 115, 2.5], ['Lat Pulldown', 100, 2.5]]],
  ['Legs', [['Squat', 155, 5], ['Romanian Deadlift', 135, 2.5], ['Leg Press', 230, 5]]],
];
const WEEKS = 26;
const TRAINING_DAYS = [1, 3, 5]; // Mon / Wed / Fri, counted back from today

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function seedDemoData(userId: number) {
  const insertSession = db.prepare('INSERT INTO sessions (user_id, date, time_of_day) VALUES (?, ?, ?)');
  const insertExercise = db.prepare('INSERT INTO workout_exercises (session_id, exercise, order_num) VALUES (?, ?, ?)');
  const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, reps, weight) VALUES (?, ?, ?, ?)');
  const insertTemplate = db.prepare('INSERT INTO templates (user_id, name) VALUES (?, ?)');
  const insertTemplateExercise = db.prepare('INSERT INTO template_exercises (template_id, exercise, order_num) VALUES (?, ?, ?)');

  // Dated relative to today so the history always looks current.
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - WEEKS * 7 - start.getUTCDay());

  db.transaction(() => {
    let n = 0;
    for (let week = 0; week < WEEKS; week++) {
      for (const day of TRAINING_DAYS) {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + week * 7 + day);
        if (date >= today) continue;
        const [, plan] = ROTATION[n % ROTATION.length]!;
        const { lastInsertRowid: sessionId } = insertSession.run(userId, isoDate(date), n % 4 === 0 ? 'AM' : 'PM');
        plan.forEach(([exercise, base, step], i) => {
          const { lastInsertRowid: exId } = insertExercise.run(sessionId, exercise, i + 1);
          const weight = base + step * week;
          // Last set drops a rep or two, like a real lifter tiring.
          [8, 8, 6 + (week % 2)].forEach((reps, s) => insertSet.run(exId, s + 1, reps, weight));
        });
        n++;
      }
    }
    for (const [name, plan] of ROTATION) {
      const { lastInsertRowid: templateId } = insertTemplate.run(userId, name);
      plan.forEach(([exercise], i) => insertTemplateExercise.run(templateId, exercise, i + 1));
    }
  })();
}

export const deleteUser = db.transaction((userId: number) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM templates WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
});
