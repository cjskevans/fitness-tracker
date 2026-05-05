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
```

# Run all tests (server + client)
npm test

# Run individually
npm run test --prefix server   # Jest + supertest against in-memory SQLite
npm run test --prefix client   # Jest + React Testing Library

## Architecture

Full-stack fitness tracker — React frontend + Express/SQLite backend — run as a monorepo from the root.

**Client** (`client/src/`): React 18 + Vite. `App.jsx` is the top-level state owner; it holds user identity, dark mode preference, and exercise selection, and passes refresh triggers down to child components. State that survives page reload lives in `localStorage` (`ft_user`, `ft_dark`). All API calls are in `api.js` (axios). Styling is inline CSS throughout, with CSS custom properties in `index.css` driving the light/dark theme. There is no CSS-in-JS, CSS modules, or Tailwind.

**Server** (`server/`): Express 4 on port 3001. `db.js` initializes the SQLite schema on startup (tables: `users`, `sessions`, `workout_exercises`, `sets`). `index.js` defines all routes. Data is stored in `server/workouts.db` (gitignored).

**Dev proxy**: Vite proxies `/api/*` to `localhost:3001`, so the client only needs relative `/api` paths in development.

**Data model**: A session has many workout_exercises (ordered), each of which has many sets (reps + weight). Sessions and their children are inserted in a single SQLite transaction. Cascade deletes are set on foreign keys.

**PR detection**: `POST /api/sessions` returns a `newPRs` array containing any exercises where the logged weight × reps combination beats the user's previous best.

**Exercise taxonomy**: `client/src/exercises.js` exports a static map of muscle group → exercise list used to populate the workout form. Users can also type custom exercise names.

**Multi-user**: Users are identified by plain username (no auth). The active user is stored in localStorage and sent as `userId` on API requests.
