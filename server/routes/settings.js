const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) return res.json({ defaultSetCount: 3, showTimeOfDay: true, darkMode: false });
  res.json({
    defaultSetCount: row.default_set_count,
    showTimeOfDay: row.show_time_of_day === 1,
    darkMode: row.dark_mode === 1,
  });
});

router.put('/', requireAuth, (req, res) => {
  const { userId } = req.user;
  const { defaultSetCount, showTimeOfDay, darkMode } = req.body;
  db.prepare(`
    INSERT INTO user_settings (user_id, default_set_count, show_time_of_day, dark_mode)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      default_set_count = excluded.default_set_count,
      show_time_of_day  = excluded.show_time_of_day,
      dark_mode         = excluded.dark_mode
  `).run(userId, defaultSetCount ?? 3, showTimeOfDay ? 1 : 0, darkMode ? 1 : 0);
  res.json({ ok: true });
});

module.exports = router;
