import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import errorHandler from './middleware/errorHandler';
import sanitize from './middleware/sanitize';
import openapiSpec from './openapi';
import routes from './routes';

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
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

if (require.main === module) {
  // Optional root .env (holds GarminApiKey). Loaded here, not at import, so tests never see real keys.
  const envFile = path.join(__dirname, '../../.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs at http://localhost:${PORT}/api/docs`);
  });
}

export default app;
