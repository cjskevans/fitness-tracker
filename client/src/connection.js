// Tracks whether the API is reachable, so a dead backend surfaces as one toast
// instead of silently empty lists. Kept outside React deliberately: api.js has to
// report failures from plain axios interceptors, and a module-level store is a
// singleton that survives StrictMode's double-mounting.

const POLL_INTERVAL_MS = 5000;

let reachable = true;
let pollTimer = null;
const listeners = new Set();

export const getStatus = () => reachable;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setReachable(next) {
  if (next === reachable) return; // only transitions are worth waking subscribers for
  reachable = next;
  listeners.forEach(listener => listener());
}

// Plain fetch rather than the axios instance: this poll is what the interceptor
// schedules, so routing it back through the interceptor would recurse.
function poll() {
  fetch('/api/health')
    .then(res => { if (res.ok) reportReachable(); })
    .catch(() => {});
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

export function reportReachable() {
  setReachable(true);
  stopPolling();
}

export function reportUnreachable() {
  setReachable(false);
  startPolling();
}

// Tests only: the store is module state, so it has to be resettable between cases.
export function __reset() {
  stopPolling();
  reachable = true;
  listeners.clear();
}
