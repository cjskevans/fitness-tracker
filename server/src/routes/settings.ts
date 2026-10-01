import express from 'express';
import db from '../db';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

interface Settings {
  defaultSetCount: number;
  showTimeOfDay: boolean;
  darkMode: boolean;
}

// SQLite has no boolean type, so the flags are stored as 0/1.
interface SettingsRow {
  user_id: number;
  default_set_count: number;
  show_time_of_day: number;
  dark_mode: number;
}

const DEFAULTS: Settings = { defaultSetCount: 3, showTimeOfDay: true, darkMode: false };

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const row = db.prepare<[number], SettingsRow>('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) return res.json(DEFAULTS);
  res.json({
    defaultSetCount: row.default_set_count,
    showTimeOfDay: row.show_time_of_day === 1,
    darkMode: row.dark_mode === 1,
  } satisfies Settings);
});

router.put('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { defaultSetCount, showTimeOfDay, darkMode }: Partial<Settings> = req.body;
  db.prepare(`
    INSERT INTO user_settings (user_id, default_set_count, show_time_of_day, dark_mode)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      default_set_count = excluded.default_set_count,
      show_time_of_day  = excluded.show_time_of_day,
      dark_mode         = excluded.dark_mode
  `).run(userId, defaultSetCount ?? DEFAULTS.defaultSetCount, showTimeOfDay ? 1 : 0, darkMode ? 1 : 0);
  res.json({ ok: true });
});

export default router;
