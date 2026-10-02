import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import db from '../db';
import { JWT_SECRET, requireAuth, type AuthPayload } from '../middleware/auth';
import { seedDemoData, deleteUser } from '../demo';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later.' },
});

interface Credentials {
  username?: string;
  password?: string;
}

function readCredentials(body: Credentials) {
  const username = body.username?.trim();
  const { password } = body;
  return username && password ? { username, password } : null;
}

interface UserRow {
  id: number;
  username: string;
  // Nullable: demo users have no hash, so /login can never match them.
  password_hash: string | null;
}

const signToken = (userId: number, expiresIn: '7d' | '1d' = '7d') =>
  jwt.sign({ userId } satisfies AuthPayload, JWT_SECRET, { expiresIn });

router.post('/register', authLimiter, async (req, res) => {
  const creds = readCredentials(req.body);
  if (!creds) return res.status(400).json({ error: 'Username and password are required' });
  const { username, password } = creds;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  const userId = Number(lastInsertRowid);

  res.status(201).json({ token: signToken(userId), userId });
});

router.post('/login', authLimiter, async (req, res) => {
  const creds = readCredentials(req.body);
  if (!creds) return res.status(400).json({ error: 'Username and password are required' });
  const { username, password } = creds;

  const user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?').get(username);
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: signToken(user.id), userId: user.id, username: user.username });
});

router.post('/demo', authLimiter, (req, res) => {
  // Visitors who close the tab never hit DELETE /demo, so each new demo sweeps up
  // the abandoned ones. 1 day matches the demo token's lifetime.
  const stale = db
    .prepare<[], { user_id: number }>("SELECT user_id FROM demo_users WHERE created_at < datetime('now', '-1 day')")
    .all();
  for (const { user_id } of stale) deleteUser(user_id);

  // No password hash, so /login can never authenticate as this user.
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username) VALUES (?)')
    .run(`demo-${crypto.randomUUID()}`);
  const userId = Number(lastInsertRowid);
  db.prepare('INSERT INTO demo_users (user_id) VALUES (?)').run(userId);
  seedDemoData(userId);

  res.status(201).json({ token: signToken(userId, '1d'), userId, username: 'demo' });
});

router.delete('/demo', requireAuth, (req, res) => {
  const { userId } = req.user;
  const isDemo = db.prepare('SELECT 1 FROM demo_users WHERE user_id = ?').get(userId);
  if (!isDemo) return res.status(403).json({ error: 'Not a demo account' });
  deleteUser(userId);
  res.status(204).end();
});

export default router;
