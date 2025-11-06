import { Hono } from 'hono';
import type { Env } from './env';
import { createMcpServer } from './mcp/server';
import { checkpointPlanSchema, courseOutlineSchema, quizSchema } from './mcp/types';
import { previewRoute, resolveBundle, type PreviewBundle } from './routes/preview';

const AUTH_ERROR = new Response('Unauthorized', { status: 401 });

function requireAuth(request: Request, env: Env): boolean {
  if (env.REQUIRE_AUTH !== 'true') return true;
  const header = request.headers.get('authorization');
  if (!header) return false;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && Boolean(token);
}

async function digestKey(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function loadFromCache(env: Env, key: string): Promise<PreviewBundle | null> {
  const id = env.COURSE_CACHE.idFromName(key);
  const stub = env.COURSE_CACHE.get(id);
  const response = await stub.fetch(`https://cache/${key}`);
  if (!response.ok) return null;
  try {
    const data = await response.json<PreviewBundle>();
    return {
      outline: courseOutlineSchema.parse(data.outline),
      checkpoints: checkpointPlanSchema.parse(data.checkpoints),
      quiz: quizSchema.parse(data.quiz),
    };
  } catch (error) {
    console.error('Failed to parse cache', error);
    return null;
  }
}

async function storeInCache(env: Env, key: string, bundle: PreviewBundle): Promise<void> {
  const id = env.COURSE_CACHE.idFromName(key);
  const stub = env.COURSE_CACHE.get(id);
  await stub.fetch(`https://cache/${key}`, {
    method: 'PUT',
    body: JSON.stringify(bundle),
  });
}

function parseNumberParam(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true }));

app.get('/preview', async (c) => {
  const thread = c.req.query('thread');
  if (!thread) {
    return c.json({ error: { code: 'MISSING_THREAD', message: 'thread query parameter is required' } }, 400);
  }
  const minutes = parseNumberParam(c.req.query('minutes'), 60, 30, 120);
  const questions = parseNumberParam(c.req.query('questions'), 10, 3, 20);
  const cacheKey = await digestKey(`${thread}:${minutes}:${questions}`);
  let bundle = await loadFromCache(c.env, cacheKey);
  if (!bundle) {
    try {
      bundle = await resolveBundle(c.env, thread, minutes, questions);
      await storeInCache(c.env, cacheKey, bundle);
    } catch (error) {
      console.error('Failed to build preview', error);
      return c.json({ error: { code: 'PREVIEW_FAILED', message: (error as Error).message } }, 500);
    }
  }
  return previewRoute(c, bundle);
});

app.get('/sse', async (c) => {
  if (!requireAuth(c.req.raw, c.env)) {
    return AUTH_ERROR;
  }
  const server = createMcpServer(c.env);
  const transport = server as unknown as {
    handleSSE?: (request: Request) => Promise<Response>;
  };
  if (typeof transport.handleSSE !== 'function') {
    return c.json({ error: { code: 'SSE_UNSUPPORTED', message: 'SSE transport unavailable.' } }, 501);
  }
  return transport.handleSSE(c.req.raw);
});

app.get('/ws', async (c) => {
  if (!requireAuth(c.req.raw, c.env)) {
    return AUTH_ERROR;
  }
  const upgrade = c.req.raw.headers.get('upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }
  const server = createMcpServer(c.env);
  const transport = server as unknown as {
    handleWebSocket?: (request: Request) => Promise<Response>;
  };
  if (typeof transport.handleWebSocket !== 'function') {
    return c.json({ error: { code: 'WS_UNSUPPORTED', message: 'WebSocket transport unavailable.' } }, 501);
  }
  return transport.handleWebSocket(c.req.raw);
});

export class CourseCacheDO {
  private readonly ttlMs: number;
  private readonly limit: number;

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    this.ttlMs = Number(this.env.CACHE_TTL_SECONDS ?? '86400') * 1000;
    this.limit = Number(this.env.CACHE_LIMIT ?? '32');
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\//, '');
    if (!key) {
      return new Response('Key required', { status: 400 });
    }

    if (request.method === 'GET') {
      const entry = await this.state.storage.get<{ data: PreviewBundle; expiresAt: number; createdAt: number }>(key);
      if (!entry || entry.expiresAt < Date.now()) {
        if (entry) {
          await this.state.storage.delete(key);
        }
        return new Response('Not found', { status: 404 });
      }
      return new Response(JSON.stringify(entry.data), {
        headers: { 'content-type': 'application/json' },
      });
    }

    if (request.method === 'PUT') {
      const data = await request.json<PreviewBundle>();
      const entry = { data, expiresAt: Date.now() + this.ttlMs, createdAt: Date.now() };
      await this.state.storage.put(key, entry);
      await this.trim();
      return new Response(null, { status: 204 });
    }

    if (request.method === 'DELETE') {
      await this.state.storage.delete(key);
      return new Response(null, { status: 204 });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async trim(): Promise<void> {
    const list = await this.state.storage.list<{ data: PreviewBundle; expiresAt: number; createdAt: number }>();
    if (list.size <= this.limit) return;
    const entries = [...list.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < entries.length - this.limit; i++) {
      await this.state.storage.delete(entries[i][0]);
    }
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
