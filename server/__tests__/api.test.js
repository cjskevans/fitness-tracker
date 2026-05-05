const request = require('supertest');
const app = require('../index');
const db = require('../db');

afterEach(() => {
  db.prepare('DELETE FROM sets').run();
  db.prepare('DELETE FROM workout_exercises').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM users').run();
});

// ── Users ────────────────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('creates a new user', async () => {
    const res = await request(app).post('/api/users').send({ username: 'alice' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.id).toBeDefined();
  });

  it('returns the same user on duplicate username', async () => {
    const first = await request(app).post('/api/users').send({ username: 'alice' });
    const second = await request(app).post('/api/users').send({ username: 'alice' });
    expect(second.body.id).toBe(first.body.id);
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/api/users').send({});
    expect(res.status).toBe(400);
  });
});

// ── Sessions ─────────────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  let userId;

  beforeEach(async () => {
    const res = await request(app).post('/api/users').send({ username: 'alice' });
    userId = res.body.id;
  });

  const bench = (date, weight = 100, reps = 8) => ({
    userId,
    date,
    exercises: [{ exercise: 'Bench Press', sets: [{ reps, weight }] }],
  });

  it('creates a session and flags a first-time PR', async () => {
    const res = await request(app).post('/api/sessions').send(bench('2024-01-01'));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.newPRs).toHaveLength(1);
    expect(res.body.newPRs[0].exercise).toBe('Bench Press');
  });

  it('detects a new PR when weight improves', async () => {
    await request(app).post('/api/sessions').send(bench('2024-01-01', 100));
    const res = await request(app).post('/api/sessions').send(bench('2024-01-08', 105));
    expect(res.body.newPRs).toHaveLength(1);
  });

  it('does not flag a PR when weight is lower', async () => {
    await request(app).post('/api/sessions').send(bench('2024-01-01', 100));
    const res = await request(app).post('/api/sessions').send(bench('2024-01-08', 90));
    expect(res.body.newPRs).toHaveLength(0);
  });

  it('flags a PR when same weight but more reps', async () => {
    await request(app).post('/api/sessions').send(bench('2024-01-01', 100, 5));
    const res = await request(app).post('/api/sessions').send(bench('2024-01-08', 100, 8));
    expect(res.body.newPRs).toHaveLength(1);
  });

  it('rejects a future date', async () => {
    const res = await request(app).post('/api/sessions').send(bench('2099-01-01'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reps or weight is zero', async () => {
    const res = await request(app).post('/api/sessions').send({
      userId,
      date: '2024-01-01',
      exercises: [{ exercise: 'Squat', sets: [{ reps: 0, weight: 100 }] }],
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions', () => {
  it('returns sessions for a user', async () => {
    const { body: user } = await request(app).post('/api/users').send({ username: 'bob' });
    await request(app).post('/api/sessions').send({
      userId: user.id,
      date: '2024-03-01',
      exercises: [{ exercise: 'Squat', sets: [{ reps: 5, weight: 150 }] }],
    });

    const res = await request(app).get(`/api/sessions?userId=${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].exercises[0].exercise).toBe('Squat');
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes a session and its exercises', async () => {
    const { body: user } = await request(app).post('/api/users').send({ username: 'carol' });
    const { body: session } = await request(app).post('/api/sessions').send({
      userId: user.id,
      date: '2024-03-01',
      exercises: [{ exercise: 'Deadlift', sets: [{ reps: 3, weight: 200 }] }],
    });

    await request(app).delete(`/api/sessions/${session.id}`);

    const res = await request(app).get(`/api/sessions?userId=${user.id}`);
    expect(res.body).toHaveLength(0);
  });
});

describe('GET /api/prs', () => {
  it('returns the best set per exercise', async () => {
    const { body: user } = await request(app).post('/api/users').send({ username: 'dave' });
    await request(app).post('/api/sessions').send({
      userId: user.id, date: '2024-01-01',
      exercises: [{ exercise: 'Bench Press', sets: [{ reps: 8, weight: 80 }] }],
    });
    await request(app).post('/api/sessions').send({
      userId: user.id, date: '2024-01-08',
      exercises: [{ exercise: 'Bench Press', sets: [{ reps: 5, weight: 100 }] }],
    });

    const res = await request(app).get(`/api/prs?userId=${user.id}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].weight).toBe(100);
  });
});
