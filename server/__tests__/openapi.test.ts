import request from 'supertest';
import type { OpenAPIV3 } from 'openapi-types';
import app from '../src/index';
import routes from '../src/routes';
import spec from '../src/openapi';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

// Express keeps registered routes on an undocumented `stack`, so its typings
// don't describe it; this is the slice of each layer the walk below needs.
interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

// Walk the mounted routers and rebuild each endpoint as it appears in an
// OpenAPI document: '/api/sessions' + '/:id' -> '/api/sessions/{id}'.
function liveEndpoints() {
  const found: string[] = [];
  for (const [mountPath, router] of Object.entries(routes)) {
    for (const layer of router.stack as RouterLayer[]) {
      if (!layer.route) continue;
      const suffix = layer.route.path === '/' ? '' : layer.route.path;
      const path = (mountPath + suffix).replace(/:(\w+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) {
        if ((HTTP_METHODS as readonly string[]).includes(method)) found.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return found.sort();
}

// Every operation in the spec as [label, operation], skipping path-level keys
// like `parameters` that sit alongside the methods.
function documentedOperations(): [string, OpenAPIV3.OperationObject][] {
  const found: [string, OpenAPIV3.OperationObject][] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item?.[method];
      if (operation) found.push([`${method.toUpperCase()} ${path}`, operation]);
    }
  }
  return found;
}

function documentedEndpoints() {
  return documentedOperations().map(([label]) => label).sort();
}

function collectRefs(node: unknown, acc: string[] = []) {
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
      const target = ref.slice(2).split('/').reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        spec,
      );
      expect(target).toBeDefined();
    }
  });

  it('requires bearer auth by default and exempts only the auth and health routes', () => {
    expect(spec.security).toEqual([{ bearerAuth: [] }]);

    const publicOps = documentedOperations()
      .filter(([, operation]) => operation.security?.length === 0)
      .map(([label]) => label);
    expect(publicOps.sort()).toEqual([
      'GET /api/health',
      'POST /api/auth/demo',
      'POST /api/auth/login',
      'POST /api/auth/register',
    ]);
  });

  it('gives every documented operation a summary and a tag', () => {
    for (const [label, operation] of documentedOperations()) {
      expect(`${label}: ${operation.summary ?? ''}`).not.toBe(`${label}: `);
      expect(operation.tags).toEqual([expect.any(String)]);
    }
  });

  it('declares every tag it uses', () => {
    const declared = new Set(spec.tags?.map(t => t.name));
    for (const [, operation] of documentedOperations()) {
      operation.tags?.forEach(tag => expect(declared).toContain(tag));
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
