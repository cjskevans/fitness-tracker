---
description: Run the tests, review the staged diff, and commit
argument-hint: [optional message or scope hint]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git checkout:*), Bash(npm test:*), Bash(npm run test:*), Read, Grep
---

## Current state

- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Staged diff: !`git diff --cached --stat`
- Unstaged diff: !`git diff --stat`
- Recent commits: !`git log --oneline -5`

## Task

Commit the current work. $ARGUMENTS

Work through these in order and **stop and tell me** if any step fails — do not
commit around a problem.

### 1. Run the tests

Run `npm test` from the repo root (server Jest + supertest, then client Jest +
React Testing Library). If anything fails, report the failure and stop. Don't
commit a red suite, and don't "fix" a test by weakening its assertion.

If `node_modules` is missing, say so rather than guessing at whether the code works.

### 2. Check what's being committed

Read the actual diff, not just the file list. Specifically:

- **Never stage** `.DS_Store`, `*.log`, `output.txt`, `server/workouts.db`, or
  anything under `.idea/`. These are local noise. If they're untracked, leave
  them untracked and mention it.
- **Never stage** secrets — real JWT secrets, API keys, `.env` files, or a
  password that isn't obviously a test fixture.
- If `package.json` dependencies changed, confirm the matching
  `package-lock.json` changed too. A lock file out of sync with its manifest is
  a broken install for anyone who clones this. Flag it if they disagree.
- If a route was added or changed under `server/routes/`, confirm
  `server/openapi.js` documents it — `server/__tests__/openapi.test.js` enforces
  this, so step 1 should have caught it, but say which route is undocumented
  rather than making me read a test failure.

Stage only the files that belong to this change.

### 3. Branch if needed

If the current branch is `main`, create a topic branch before committing and
tell me the merge command afterwards.

### 4. Write the message

- Short imperative summary line (~50 chars), no trailing period.
- Blank line, then a body explaining **why** the change was made, wrapped at 72
  chars. Skip the body only for genuinely trivial commits.
- Describe what the commit does, not what I asked for. No "as requested".
- Match the existing history's tone — see the recent commits above.

### 5. Report back

Give me the short SHA, the file count, and anything you deliberately left out of
the commit.
