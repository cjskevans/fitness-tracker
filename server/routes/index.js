// Single source of truth for what the API exposes.
//
// index.js mounts these, and __tests__/openapi.test.js walks them to check every
// live route is described in openapi.js — so adding a router here without
// documenting it fails the test suite.

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
