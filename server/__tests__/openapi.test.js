const request = require('supertest');
const app = require('../index');
const routes = require('../routes');
const spec = require('../openapi');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

// Walk the mounted routers and rebuild each endpoint as it appears in an
// OpenAPI document: '/api/sessions' + '/:id' -> '/api/sessions/{id}'.
function liveEndpoints() {
  const found = [];
  for (const [mountPath, router] of Object.entries(routes)) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const suffix = layer.route.path === '/' ? '' : layer.route.path;
      const path = (mountPath + suffix).replace(/:(\w+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) {
        if (HTTP_METHODS.includes(method)) found.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return found.sort();
}

function documentedEndpoints() {
  const found = [];
  for (const [path, operations] of Object.entries(spec.paths)) {
    for (const method of Object.keys(operations)) {
      if (HTTP_METHODS.includes(method)) found.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return found.sort();
}

function collectRefs(node, acc = []) {
  if (Array.isArray(node)) {
    node.forEach(item => collectRefs(item, acc));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') acc.push(value);
      else collectRefs(value, acc);
    }
  }
  return acc;
}

describe('OpenAPI spec', () => {
  it('documents every route the server actually mounts', () => {
    expect(documentedEndpoints()).toEqual(liveEndpoints());
  });

  it('resolves every internal $ref', () => {
    for (const ref of collectRefs(spec)) {
      expect(ref.startsWith('#/')).toBe(true);
      const target = ref.slice(2).split('/').reduce((node, key) => node?.[key], spec);
      expect(target).toBeDefined();
    }
  });

  it('requires bearer auth by default and exempts only the auth routes', () => {
    expect(spec.security).toEqual([{ bearerAuth: [] }]);

    const publicOps = [];
    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (operation.security?.length === 0) publicOps.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(publicOps.sort()).toEqual([
      'POST /api/auth/login',
      'POST /api/auth/register',
    ]);
  });

  it('gives every documented operation a summary and a tag', () => {
    for (const [path, operations] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const label = `${method.toUpperCase()} ${path}`;
        expect(`${label}: ${operation.summary ?? ''}`).not.toBe(`${label}: `);
        expect(operation.tags).toEqual([expect.any(String)]);
      }
    }
  });

  it('declares every tag it uses', () => {
    const declared = new Set(spec.tags.map(t => t.name));
    for (const operations of Object.values(spec.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (!HTTP_METHODS.includes(method)) continue;
        operation.tags.forEach(tag => expect(declared).toContain(tag));
      }
    }
  });
});

describe('GET /api/docs.json', () => {
  it('serves the spec without requiring a token', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Fitness Tracker API');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
  });
});

describe('GET /api/docs', () => {
  it('serves the Swagger UI page', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('sends a CSP that allows the inline bootstrap script', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
  });
});
