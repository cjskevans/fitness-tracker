import express from 'express';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

const GARMIN = 'https://personal.connectapi.garmin.com';

// The fields of an activitylist-service summary this route passes on; the
// real payload has ~100 more, including GPS start/end points we don't expose.
interface GarminActivity {
  activityId: number;
  activityName: string;
  startTimeLocal: string;
  distance: number;
  duration: number;
  averageHR?: number;
  calories?: number;
  elevationGain?: number;
}

// Access tokens last 24h and Garmin offers no refresh token, so re-exchange the
// API key shortly before expiry rather than on every request.
let cached: { token: string; expires: number } | null = null;

async function accessToken(apiKey: string) {
  if (cached && cached.expires > Date.now()) return cached.token;
  const res = await fetch(`${GARMIN}/personalapitoken-service/personal-api/personal-api-key/token`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${apiKey}` },
  });
  if (!res.ok) throw Object.assign(new Error(`Garmin token exchange failed (${res.status})`), { status: 502 });
  cached = { token: (await res.text()).trim(), expires: Date.now() + 23 * 60 * 60 * 1000 };
  return cached.token;
}

// One personal API key for the whole server, so every logged-in user sees the
// key owner's run — fine for a personal deployment, not for a shared one.
router.get('/last-run', requireAuth, async (req, res) => {
  const apiKey = process.env.GarminApiKey;
  if (!apiKey) {
    res.status(503).json({ error: 'Garmin is not configured' });
    return;
  }

  const token = await accessToken(apiKey);
  const upstream = await fetch(
    `${GARMIN}/activitylist-service/activities/search/activities?limit=1&activityType=running`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (upstream.status === 401) cached = null; // key rotated; retry on the next request
  if (!upstream.ok) {
    res.status(502).json({ error: `Garmin request failed (${upstream.status})` });
    return;
  }

  const [run] = (await upstream.json()) as GarminActivity[];
  res.json(run ? {
    id: run.activityId,
    name: run.activityName,
    startTimeLocal: run.startTimeLocal,
    distanceMeters: run.distance,
    durationSeconds: run.duration,
    averageHR: run.averageHR ?? null,
    calories: run.calories ?? null,
    elevationGainMeters: run.elevationGain ?? null,
  } : null);
});

export default router;
