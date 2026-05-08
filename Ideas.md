# Fitness Tracker — Ideas

## Security & Robustness
- [ ] Environment variable validation on startup (fail fast if JWT_SECRET not set in production)
- [ ] Token refresh endpoint (currently JWTs can't be invalidated before expiry)

## Data & Features
- [ ] Body weight tracking — log daily weight, show trend over time
- [ ] Volume tracking — total weight lifted per session (sets × reps × weight)
- [ ] Workout streaks — track consecutive days/weeks with sessions logged
- [ ] Rest timer — countdown between sets
- [ ] Exercise notes — add a note to a set or session (e.g. "felt strong", "shoulder tight")
- [ ] Export data — download workout history as CSV

## UI
- [ ] Charts for body weight trend alongside strength progress
- [ ] Dashboard summary — workouts this week, total volume, recent PRs
- [ ] Mobile app (React Native)
