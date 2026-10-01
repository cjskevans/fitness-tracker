// Single source of truth for what the API exposes. Adding a router here without
// a matching entry in openapi.ts fails __tests__/openapi.test.ts.

import type { Router } from 'express';
import health from './health';
import auth from './auth';
import sessions from './sessions';
import exercises from './exercises';
import workouts from './workouts';
import prs from './prs';
import settings from './settings';
import templates from './templates';
import exportRouter from './export';
import importRouter from './import';

const routes: Record<string, Router> = {
  '/api/health':    health,
  '/api/auth':      auth,
  '/api/sessions':  sessions,
  '/api/exercises': exercises,
  '/api/workouts':  workouts,
  '/api/prs':       prs,
  '/api/settings':  settings,
  '/api/templates': templates,
  '/api/export':    exportRouter,
  '/api/import':    importRouter,
};

export default routes;
