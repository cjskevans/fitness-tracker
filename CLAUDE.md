# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Start both server and client concurrently (dev mode)
npm run dev

# Run individually
npm run dev --prefix client    # Vite dev server on port 5173
npm run dev --prefix server    # Express server on port 3001 (--watch mode)

# Production build
npm run build --prefix client

# Run all tests (server + client)
npm test

# Run individually
npm run test --prefix server   # Jest + supertest against in-memory SQLite
npm run test --prefix client   # Jest + React Testing Library
```

## Architecture

Full-stack fitness tracker — React frontend + Express/SQLite backend — run as a monorepo from the root.

**Client** (`client/src/`): React 18 + Vite. `App.jsx` is the top-level state owner; it holds user identity, dark mode preference, and exercise selection, and passes refresh triggers down to child components. State that survives page reload lives in `localStorage` (`ft_user`, `ft_dark`, `ft_token`). All API calls are in `api.js` (axios). An axios request interceptor attaches the JWT token to every request automatically. Styling is inline CSS throughout, with CSS custom properties in `index.css` driving the light/dark theme. There is no CSS-in-JS, CSS modules, or Tailwind.

**Server** (`server/`): Express 4 on port 3001. `db.js` initializes the SQLite schema on startup. `index.js` is a thin router-mount file — all route logic lives in `server/routes/`. Data is stored in `server/workouts.db` (gitignored). Pass `NODE_ENV=test` to use an in-memory SQLite database (used by Jest).

**Server structure**:
- `server/index.js` — mounts all routers, applies global middleware (helmet, cors, sanitize, errorHandler), serves API docs
- `server/routes/index.js` — the mount table (path → router); the single source of truth for what the API exposes
- `server/routes/` — one file per resource: `auth`, `sessions`, `exercises`, `workouts`, `prs`, `settings`, `templates`, `export`, `import`
- `server/openapi.js` — OpenAPI 3.0 spec for the whole API
- `server/middleware/auth.js` — `requireAuth` JWT middleware + `JWT_SECRET`
- `server/middleware/errorHandler.js` — centralised error handler (4-arg Express middleware)
- `server/middleware/asyncHandler.js` — wraps async route handlers so errors propagate to errorHandler
- `server/middleware/sanitize.js` — strips HTML tags from all request body strings

**Dev proxy**: Vite proxies `/api/*` to `localhost:3001`, so the client only needs relative `/api` paths in development.

**Authentication**: JWT-based. `POST /api/auth/register` and `POST /api/auth/login` return a token. All other routes require `Authorization: Bearer <token>`. The token encodes `userId` — routes no longer accept `userId` in the request body or query params. Rate limiting (10 requests / 15 min) is applied to auth endpoints.

**Data model**:
- `users` — username + bcrypt password hash
- `sessions` → `workout_exercises` → `sets` — a session has ordered exercises, each with sets (reps + weight); cascade deletes on foreign keys; session insertion is a single SQLite transaction
- `templates` → `template_exercises` — named lists of exercise names saved per user; loaded into the workout form to pre-fill exercises
- `user_settings` — per-user preferences (default set count, show time of day, dark mode)

**PR detection**: `POST /api/sessions` returns a `newPRs` array for any exercise where the logged weight × reps beats the user's previous best. Toasts are shown via `react-hot-toast`.

**Settings**: Fetched from the DB on login (`GET /api/settings`), saved with `PUT /api/settings`. `App.jsx` holds the settings in state and passes `defaultSetCount` and `showTimeOfDay` as props to `WorkoutForm`. Dark mode is also cached in `localStorage` (`ft_dark`) to avoid a flash on reload. Settings page also has Export (CSV download) and Import (CSV upload) buttons, and a link out to the API docs at `/api/docs`.

**API docs**: The OpenAPI 3.0 spec lives in `server/openapi.js` and is served two ways — raw JSON at `GET /api/docs.json` (importable into Postman/Insomnia) and Swagger UI at `GET /api/docs`, where you can paste a JWT via the **Authorize** button and call endpoints live. Helmet's default CSP blocks Swagger UI's inline bootstrap script, so `/api/docs` gets a relaxed `script-src` applied to that route only.

`server/__tests__/openapi.test.js` is a contract test: it walks the routers in `routes/index.js` and fails if any live endpoint is missing from the spec (or documented but not mounted), so the docs cannot drift from the code. Adding a route means adding it to `openapi.js` in the same commit.

**Export / Import**: `GET /api/export` returns a CSV of all the user's workout data. `POST /api/import` accepts `{ csv: string }` in the request body, parses it, and inserts sessions. A sample dataset is at `data/sample-workouts.csv`.

**Templates — last session lookup**: `GET /api/templates/:id/last-session` finds the most recent session containing all of the template's exercises (matched by exercise name set) and returns it with full sets detail. Shown in the WorkoutForm when a template is selected from the dropdown.

**Responsive layout**: Breakpoint at 640px in `index.css`. Layout-critical styles (grid, padding, header, template rows) use CSS classes; all other styles remain inline.

**Exercise taxonomy**: `client/src/exercises.js` exports a static map of muscle group → exercise list. Users can also enter custom exercise names.

**Workout History**: Shows the 3 most recent sessions by default with a "See more" toggle to expand all sessions.
