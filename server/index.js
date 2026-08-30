const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const errorHandler = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');
const openapiSpec = require('./openapi');
const routes = require('./routes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(sanitize);

// Swagger UI bootstraps itself with an inline script, which helmet's default
// script-src blocks. Relax it for the docs route only.
const docsCsp = helmet.contentSecurityPolicy({
  directives: {
    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    'script-src': ["'self'", "'unsafe-inline'"],
  },
});

app.get('/api/docs.json', (req, res) => res.json(openapiSpec));
app.use('/api/docs', docsCsp, swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Fitness Tracker API',
  swaggerOptions: { persistAuthorization: true },
}));

for (const [mountPath, router] of Object.entries(routes)) {
  app.use(mountPath, router);
}

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs at http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;
