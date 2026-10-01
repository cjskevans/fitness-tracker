import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import db from '../db';
import { JWT_SECRET, type AuthPayload } from '../middleware/auth';
import asyncHandler from '../middleware/asyncHandler';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 0 : 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later.' },
});

interface Credentials {
  username?: string;
  password?: string;
}

interface UserRow {
  id: number;
  username: string;
  // Nullable: accounts that predate passwords were migrated in with no hash.
  password_hash: string | null;
}

const signToken = (userId: number) =>
  jwt.sign({ userId } satisfies AuthPayload, JWT_SECRET, { expiresIn: '7d' });

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const body: Credentials = req.body;
  const username = body.username?.trim();
  const { password } = body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  const userId = Number(lastInsertRowid);

  res.status(201).json({ token: signToken(userId), userId });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const body: Credentials = req.body;
  const username = body.username?.trim();
  const { password } = body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?').get(username);
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: signToken(user.id), userId: user.id, username: user.username });
}));

export default router;
