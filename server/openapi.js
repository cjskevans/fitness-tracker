// OpenAPI 3.0 description of the fitness-tracker API.
//
// Served as JSON at GET /api/docs.json and rendered by Swagger UI at GET /api/docs.

const bearer = [{ bearerAuth: [] }];

// ── Reusable pieces ──────────────────────────────────────────────────────────

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string' } },
    required: ['error'],
    example: { error: 'Unauthorized' },
  },

  Ok: {
    type: 'object',
    properties: { ok: { type: 'boolean', example: true } },
  },

  Credentials: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'alice' },
      password: { type: 'string', format: 'password', example: 'password123' },
    },
  },

  AuthResponse: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'JWT encoding userId. Expires after 7 days.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      userId: { type: 'integer', example: 1 },
      username: {
        type: 'string',
        description: 'Returned by login only.',
        example: 'alice',
      },
    },
    required: ['token', 'userId'],
  },

  SetInput: {
    type: 'object',
    required: ['reps', 'weight'],
    properties: {
      reps: { type: 'integer', minimum: 1, example: 8 },
      weight: { type: 'number', minimum: 0, exclusiveMinimum: true, example: 135 },
    },
  },

  ExerciseInput: {
    type: 'object',
    required: ['exercise', 'sets'],
    properties: {
      exercise: { type: 'string', example: 'Bench Press' },
      sets: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/components/schemas/SetInput' },
      },
    },
  },

  SessionInput: {
    type: 'object',
    required: ['date', 'exercises'],
    properties: {
      date: {
        type: 'string',
        format: 'date',
        description: 'ISO date (YYYY-MM-DD). Must not be in the future.',
        example: '2024-03-01',
      },
      timeOfDay: {
        type: 'string',
        nullable: true,
        enum: ['AM', 'PM'],
        example: 'AM',
      },
      exercises: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/components/schemas/ExerciseInput' },
      },
    },
  },

  Set: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 12 },
      set_number: { type: 'integer', example: 1 },
      reps: { type: 'integer', example: 8 },
      weight: { type: 'number', example: 135 },
    },
  },

  SessionExercise: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 4 },
      exercise: { type: 'string', example: 'Bench Press' },
      order_num: { type: 'integer', example: 1 },
      sets: { type: 'array', items: { $ref: '#/components/schemas/Set' } },
    },
  },

  Session: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 7 },
      date: { type: 'string', format: 'date', example: '2024-03-01' },
      time_of_day: { type: 'string', nullable: true, example: 'AM' },
      exercises: {
        type: 'array',
        items: { $ref: '#/components/schemas/SessionExercise' },
      },
    },
  },

  NewPR: {
    type: 'object',
    properties: {
      exercise: { type: 'string', example: 'Bench Press' },
      prSet: { $ref: '#/components/schemas/SetInput' },
    },
  },

  CreateSessionResponse: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 7 },
      newPRs: {
        type: 'array',
        description:
          'One entry per exercise in this session whose best set beat the previous best '
          + '(higher weight, or equal weight at more reps). Empty when nothing was beaten.',
        items: { $ref: '#/components/schemas/NewPR' },
      },
    },
  },

  ChartPoint: {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'Session id.', example: 7 },
      date: { type: 'string', format: 'date', example: '2024-03-01' },
      weight: { type: 'number', description: 'Heaviest set of that exercise in the session.', example: 135 },
    },
  },

  PersonalRecord: {
    type: 'object',
    properties: {
      exercise: { type: 'string', example: 'Bench Press' },
      weight: { type: 'number', example: 155 },
      reps: { type: 'integer', example: 5 },
    },
  },

  Settings: {
    type: 'object',
    properties: {
      defaultSetCount: {
        type: 'integer',
        description: 'Number of blank set rows the workout form starts with.',
        example: 3,
      },
      showTimeOfDay: { type: 'boolean', example: true },
      darkMode: { type: 'boolean', example: false },
    },
  },

  TemplateInput: {
    type: 'object',
    required: ['name', 'exercises'],
    properties: {
      name: { type: 'string', example: 'Push Day' },
      exercises: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
        example: ['Bench Press', 'Overhead Press', 'Tricep Pushdown'],
      },
    },
  },

  Template: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2 },
      name: { type: 'string', example: 'Push Day' },
      exercises: {
        type: 'array',
        items: { type: 'string' },
        example: ['Bench Press', 'Overhead Press', 'Tricep Pushdown'],
      },
    },
  },

  LastSession: {
    type: 'object',
    nullable: true,
    description: 'Null when no past session contains every exercise in the template.',
    properties: {
      date: { type: 'string', format: 'date', example: '2024-02-22' },
      time_of_day: { type: 'string', nullable: true, example: 'PM' },
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            exercise: { type: 'string', example: 'Bench Press' },
            sets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reps: { type: 'integer', example: 8 },
                  weight: { type: 'number', example: 135 },
                },
              },
            },
          },
        },
      },
    },
  },

  ImportRequest: {
    type: 'object',
    required: ['csv'],
    properties: {
      csv: {
        type: 'string',
        description:
          'Raw CSV matching the export format: Date,Time of Day,Exercise,Set,Reps,Weight. '
          + 'The header row is skipped; rows sharing a date and time of day are grouped '
          + 'into one session.',
        example: 'Date,Time of Day,Exercise,Set,Reps,Weight (lbs)\n2024-01-01,AM,Bench Press,1,8,135',
      },
    },
  },

  ImportResponse: {
    type: 'object',
    properties: {
      imported: { type: 'integer', description: 'Number of sessions created.', example: 3 },
    },
  },
};

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const responses = {
  BadRequest: errorResponse('Validation failed.'),
  Unauthorized: errorResponse('Missing or invalid bearer token.'),
  Forbidden: errorResponse('The resource belongs to another user.'),
  TooManyRequests: errorResponse('Rate limit exceeded (10 requests per 15 minutes).'),
};

const json = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const ref = (name) => ({ $ref: '#/components/schemas/' + name });
const arrayOf = (name) => ({ type: 'array', items: ref(name) });
const use = (name) => ({ $ref: '#/components/responses/' + name });

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};

// ── Paths ────────────────────────────────────────────────────────────────────

const paths = {
  '/api/health': {
    get: {
      tags: ['System'],
      summary: 'Check that the server is reachable',
      description: 'Unauthenticated so the client can poll it while offline.',
      security: [],
      responses: {
        200: json('Server is up.', ref('Ok')),
      },
    },
  },

  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create an account',
      description: 'Rate limited to 10 requests per 15 minutes per IP.',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('Credentials') } },
      },
      responses: {
        201: json('Account created; token returned.', ref('AuthResponse')),
        400: use('BadRequest'),
        409: errorResponse('Username already taken.'),
        429: use('TooManyRequests'),
      },
    },
  },

  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Exchange credentials for a JWT',
      description: 'Rate limited to 10 requests per 15 minutes per IP.',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('Credentials') } },
      },
      responses: {
        200: json('Authenticated.', ref('AuthResponse')),
        400: use('BadRequest'),
        401: errorResponse('Invalid credentials.'),
        429: use('TooManyRequests'),
      },
    },
  },

  '/api/sessions': {
    get: {
      tags: ['Sessions'],
      summary: 'List all workout sessions',
      description: 'Newest first, with exercises and sets nested in logged order.',
      responses: {
        200: json('The caller\'s sessions.', arrayOf('Session')),
        401: use('Unauthorized'),
      },
    },
    post: {
      tags: ['Sessions'],
      summary: 'Log a workout session',
      description:
        'Inserts the session, its exercises, and all sets in a single transaction, then '
        + 'reports any exercise whose best set beat the previous personal record.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('SessionInput') } },
      },
      responses: {
        201: json('Session created.', ref('CreateSessionResponse')),
        400: use('BadRequest'),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/sessions/{id}': {
    put: {
      tags: ['Sessions'],
      summary: 'Replace a session',
      description: 'Existing exercises and sets are deleted and rewritten from the request body.',
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('SessionInput') } },
      },
      responses: {
        200: json('Session updated.', ref('Ok')),
        400: use('BadRequest'),
        401: use('Unauthorized'),
        403: use('Forbidden'),
      },
    },
    delete: {
      tags: ['Sessions'],
      summary: 'Delete a session',
      description: 'Cascades to the session\'s exercises and sets.',
      parameters: [idParam],
      responses: {
        204: { description: 'Session deleted.' },
        401: use('Unauthorized'),
        403: use('Forbidden'),
      },
    },
  },

  '/api/exercises': {
    get: {
      tags: ['Exercises'],
      summary: 'List exercise names the user has logged',
      description: 'Distinct names drawn from the user\'s own history, alphabetically.',
      responses: {
        200: json('Exercise names.', { type: 'array', items: { type: 'string' }, example: ['Bench Press', 'Squat'] }),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/workouts': {
    get: {
      tags: ['Progress'],
      summary: 'Max weight over time for one exercise',
      description: 'Drives the progress chart: one point per session, oldest first.',
      parameters: [{
        name: 'exercise',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        example: 'Bench Press',
      }],
      responses: {
        200: json('Chart points.', arrayOf('ChartPoint')),
        400: use('BadRequest'),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/prs': {
    get: {
      tags: ['Progress'],
      summary: 'Best set per exercise',
      description: 'Ranked by weight, then reps as the tiebreak.',
      responses: {
        200: json('Personal records.', arrayOf('PersonalRecord')),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/settings': {
    get: {
      tags: ['Settings'],
      summary: 'Read user preferences',
      description: 'Returns defaults for a user who has never saved settings.',
      responses: {
        200: json('Current preferences.', ref('Settings')),
        401: use('Unauthorized'),
      },
    },
    put: {
      tags: ['Settings'],
      summary: 'Save user preferences',
      description: 'Upserts the row; omitted fields fall back to their defaults.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('Settings') } },
      },
      responses: {
        200: json('Preferences saved.', ref('Ok')),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/templates': {
    get: {
      tags: ['Templates'],
      summary: 'List workout templates',
      responses: {
        200: json('Templates with their exercises in order.', arrayOf('Template')),
        401: use('Unauthorized'),
      },
    },
    post: {
      tags: ['Templates'],
      summary: 'Create a workout template',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('TemplateInput') } },
      },
      responses: {
        201: json('Template created.', {
          type: 'object',
          properties: { id: { type: 'integer', example: 2 } },
        }),
        400: use('BadRequest'),
        401: use('Unauthorized'),
      },
    },
  },

  '/api/templates/{id}': {
    delete: {
      tags: ['Templates'],
      summary: 'Delete a template',
      parameters: [idParam],
      responses: {
        204: { description: 'Template deleted.' },
        401: use('Unauthorized'),
        403: use('Forbidden'),
      },
    },
  },

  '/api/templates/{id}/last-session': {
    get: {
      tags: ['Templates'],
      summary: 'Most recent session covering this template',
      description:
        'Finds the newest session containing every exercise named by the template and '
        + 'returns it with full sets detail, so the workout form can pre-fill last time\'s numbers.',
      parameters: [idParam],
      responses: {
        200: json('The matching session, or null if none.', ref('LastSession')),
        401: use('Unauthorized'),
        403: use('Forbidden'),
      },
    },
  },

  '/api/export': {
    get: {
      tags: ['Import / Export'],
      summary: 'Download all workout data as CSV',
      description: 'One row per set, ordered by date then exercise order then set number.',
      responses: {
        200: {
          description: 'CSV attachment.',
          content: {
            'text/csv': {
              schema: { type: 'string' },
              example: 'Date,Time of Day,Exercise,Set,Reps,Weight (lbs)\n2024-01-01,AM,Bench Press,1,8,135',
            },
          },
        },
        401: use('Unauthorized'),
      },
    },
  },

  '/api/import': {
    post: {
      tags: ['Import / Export'],
      summary: 'Bulk import sessions from CSV',
      description:
        'Parses the CSV and inserts every session in one transaction — a malformed row '
        + 'rejects the whole request rather than importing part of it.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('ImportRequest') } },
      },
      responses: {
        200: json('Import succeeded.', ref('ImportResponse')),
        400: use('BadRequest'),
        401: use('Unauthorized'),
      },
    },
  },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Fitness Tracker API',
    version: '1.0.0',
    description:
      'REST API for logging workouts, tracking personal records, and managing workout '
      + 'templates.\n\n'
      + '**Authenticating in this page:** call `POST /api/auth/register` or '
      + '`POST /api/auth/login`, copy the `token` from the response, then click '
      + '**Authorize** above and paste it. Every other endpoint needs it.\n\n'
      + 'The token encodes the user id, so no endpoint accepts a `userId` from the client '
      + '— ownership is always derived from the token.',
  },
  servers: [{ url: '/', description: 'This host' }],
  tags: [
    { name: 'System', description: 'Service liveness.' },
    { name: 'Auth', description: 'Registration and login.' },
    { name: 'Sessions', description: 'Workout sessions, their exercises, and sets.' },
    { name: 'Exercises', description: 'Exercise names from the user\'s history.' },
    { name: 'Progress', description: 'Personal records and chart data.' },
    { name: 'Templates', description: 'Reusable named exercise lists.' },
    { name: 'Settings', description: 'Per-user preferences.' },
    { name: 'Import / Export', description: 'CSV round-tripping of workout data.' },
  ],
  security: bearer,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /api/auth/login or POST /api/auth/register.',
      },
    },
    schemas,
    responses,
  },
  paths,
};
