// Single source of truth for what the API exposes. Adding a router here without
// a matching entry in openapi.js fails __tests__/openapi.test.js.

module.exports = {
  '/api/auth':      require('./auth'),
  '/api/sessions':  require('./sessions'),
  '/api/exercises': require('./exercises'),
  '/api/workouts':  require('./workouts'),
  '/api/prs':       require('./prs'),
  '/api/settings':  require('./settings'),
  '/api/templates': require('./templates'),
  '/api/export':    require('./export'),
  '/api/import':    require('./import'),
};
