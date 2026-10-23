import request from 'supertest';
import app from '../src/index';
import db from '../src/db';

afterEach(() => {
  db.prepare('DELETE FROM sets').run();
  db.prepare('DELETE FROM workout_exercises').run();
  db.prepare('DELETE FROM sessions').run();
  db.prepare('DELETE FROM template_exercises').run();
  db.prepare('DELETE FROM templates').run();
  db.prepare('DELETE FROM user_settings').run();
  db.prepare('DELETE FROM users').run();
});

async function registerAndLogin(username = 'alice', password = 'password123') {
  await request(app).post('/api/auth/register').send({ username, password });
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return { token: res.body.token, userId: res.body.userId };
}

function authed(req: request.Test, token: string) {
  return req.set('Authorization', `Bearer ${token}`);
}

// ── Health ───────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('reports the server is up without a token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  it('returns 409 when username is already taken', async () => {
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'pass' });
    const res = await request(app).post('/api/auth/register').send({ username: 'alice', password: 'pass' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'alice' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown user', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('/api/auth/demo', () => {
  const startDemo = async () => (await request(app).post('/api/auth/demo')).body.token as string;
  const workout = { date: '2024-01-01', exercises: [{ exercise: 'Curl', sets: [{ reps: 10, weight: 30 }] }] };

  it('gives each visitor a private, pre-filled account they can add to', async () => {
    const a = await startDemo();
    const b = await startDemo();
    const before = (await authed(request(app).get('/api/sessions'), a)).body.length;
    expect(before).toBeGreaterThan(50);

    expect((await authed(request(app).post('/api/sessions'), a).send(workout)).status).toBe(201);
    expect((await authed(request(app).get('/api/sessions'), a)).body).toHaveLength(before + 1);
    expect((await authed(request(app).get('/api/sessions'), b)).body).toHaveLength(before);
  });

  it('deletes the demo user and their data on exit', async () => {
    const token = await startDemo();
    expect((await authed(request(app).delete('/api/auth/demo'), token)).status).toBe(204);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 0 });
  });

  it('refuses to delete a real account', async () => {
    const { token } = await registerAndLogin();
    await authed(request(app).post('/api/sessions'), token).send(workout);
    expect((await authed(request(app).delete('/api/auth/demo'), token)).status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 });
  });
});

// ── Sessions ─────────────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await registerAndLogin());
  });

  const bench = (date: string, weight = 100, reps = 8) => ({
    date,
    exercises: [{ exercise: 'Bench Press', sets: [{ reps, weight }] }],
  });

  it('creates a session and flags a first-time PR', async () => {
    const res = await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-01'));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.newPRs).toHaveLength(1);
    expect(res.body.newPRs[0].exercise).toBe('Bench Press');
  });

  it('detects a new PR when weight improves', async () => {
    await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-01', 100));
    const res = await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-08', 105));
    expect(res.body.newPRs).toHaveLength(1);
  });

  it('does not flag a PR when weight is lower', async () => {
    await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-01', 100));
    const res = await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-08', 90));
    expect(res.body.newPRs).toHaveLength(0);
  });

  it('flags a PR when same weight but more reps', async () => {
    await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-01', 100, 5));
    const res = await authed(request(app).post('/api/sessions'), token).send(bench('2024-01-08', 100, 8));
    expect(res.body.newPRs).toHaveLength(1);
  });

  it('rejects a future date', async () => {
    const res = await authed(request(app).post('/api/sessions'), token).send(bench('2099-01-01'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reps or weight is zero', async () => {
    const res = await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-01-01',
      exercises: [{ exercise: 'Squat', sets: [{ reps: 0, weight: 100 }] }],
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/sessions').send(bench('2024-01-01'));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/sessions', () => {
  it('returns sessions for the authenticated user', async () => {
    const { token } = await registerAndLogin('bob');
    await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-03-01',
      exercises: [{ exercise: 'Squat', sets: [{ reps: 5, weight: 150 }] }],
    });

    const res = await authed(request(app).get('/api/sessions'), token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].exercises[0].exercise).toBe('Squat');
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes a session and its exercises', async () => {
    const { token } = await registerAndLogin('carol');
    const { body: session } = await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-03-01',
      exercises: [{ exercise: 'Deadlift', sets: [{ reps: 3, weight: 200 }] }],
    });

    await authed(request(app).delete(`/api/sessions/${session.id}`), token);

    const res = await authed(request(app).get('/api/sessions'), token);
    expect(res.body).toHaveLength(0);
  });

  it('returns 403 when deleting another user\'s session', async () => {
    const { token: tokenA } = await registerAndLogin('userA');
    const { token: tokenB } = await registerAndLogin('userB');

    const { body: session } = await authed(request(app).post('/api/sessions'), tokenA).send({
      date: '2024-03-01',
      exercises: [{ exercise: 'Deadlift', sets: [{ reps: 3, weight: 200 }] }],
    });

    const res = await authed(request(app).delete(`/api/sessions/${session.id}`), tokenB);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/prs', () => {
  it('returns the best set per exercise', async () => {
    const { token } = await registerAndLogin('dave');
    await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-01-01',
      exercises: [{ exercise: 'Bench Press', sets: [{ reps: 8, weight: 80 }] }],
    });
    await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-01-08',
      exercises: [{ exercise: 'Bench Press', sets: [{ reps: 5, weight: 100 }] }],
    });

    const res = await authed(request(app).get('/api/prs'), token);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].weight).toBe(100);
  });
});

describe('GET /api/templates/:id/last-session', () => {
  async function seed(token: string) {
    await authed(request(app).post('/api/sessions'), token).send({
      date: '2024-01-01',
      exercises: [{ exercise: 'Squat', sets: [{ reps: 5, weight: 150 }] }],
    });
    const { body } = await authed(request(app).post('/api/templates'), token)
      .send({ name: 'Legs', exercises: ['Squat'] });
    return body.id;
  }

  it('returns the owner\'s most recent matching session', async () => {
    const { token } = await registerAndLogin('erin');
    const templateId = await seed(token);

    const res = await authed(request(app).get(`/api/templates/${templateId}/last-session`), token);
    expect(res.status).toBe(200);
    expect(res.body.exercises).toEqual([{ exercise: 'Squat', sets: [{ reps: 5, weight: 150 }] }]);
  });

  it('returns 403 for another user\'s template instead of their workout data', async () => {
    const { token: ownerToken } = await registerAndLogin('frank');
    const { token: otherToken } = await registerAndLogin('grace');
    const templateId = await seed(ownerToken);

    const res = await authed(request(app).get(`/api/templates/${templateId}/last-session`), otherToken);
    expect(res.status).toBe(403);
  });
});

// ── Garmin ───────────────────────────────────────────────────────────────────

describe('GET /api/garmin/last-run', () => {
  afterEach(() => {
    delete process.env.GarminApiKey;
    jest.restoreAllMocks();
  });

  it('is 503 when no API key is configured', async () => {
    const { token } = await registerAndLogin('gina');
    const res = await authed(request(app).get('/api/garmin/last-run'), token);
    expect(res.status).toBe(503);
  });

  it('exchanges the key and returns a trimmed run', async () => {
    process.env.GarminApiKey = 'test-key';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('access-token'))
      .mockResolvedValueOnce(Response.json([{
        activityId: 1, activityName: 'Easy', startTimeLocal: '2026-10-10 08:30:18',
        distance: 5000, duration: 1500, averageHR: 150, startLatitude: 44.9,
      }]));

    const { token } = await registerAndLogin('gina');
    const res = await authed(request(app).get('/api/garmin/last-run'), token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: 'Easy', distanceMeters: 5000, averageHR: 150, calories: null });
    expect(res.body).not.toHaveProperty('startLatitude');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: 'ApiKey test-key' });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({ Authorization: 'Bearer access-token' });
  });
});
