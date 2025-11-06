import type { DurableObjectState } from '@cloudflare/workers-types';
import { Hono } from 'hono';

import { createMcpServer } from './mcp/server.js';
import { createTools } from './mcp/tools.js';
import type { ToolsApi } from './mcp/tools.js';
import { registerHealthRoute } from './routes/health.js';
import { registerPreviewRoute } from './routes/preview.js';
import type { Env } from './types.js';

interface CacheRecord<T> {
  value: T;
  timestamp: number;
}

const CACHE_PREFIX = 'c:';

export class CourseCacheDO {
  constructor(private readonly state: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } }, { status: 405 });
    }

    const { action, key, value } = await request.json();
    if (!action || typeof key !== 'string') {
      return Response.json({ error: { code: 'BAD_REQUEST', message: 'Invalid payload' } }, { status: 400 });
    }

    const limit = Number(this.env.CACHE_LIMIT ?? '32');
    const ttlMs = Number(this.env.CACHE_TTL_SECONDS ?? '86400') * 1000;
    const storageKey = `${CACHE_PREFIX}${key}`;

    if (action === 'get') {
      const record = await this.state.storage.get<CacheRecord<unknown>>(storageKey);
      if (!record) {
        return Response.json({ value: null });
      }
      if (Date.now() - record.timestamp > ttlMs) {
        await this.state.storage.delete(storageKey);
        return Response.json({ value: null });
      }
      return Response.json({ value: record.value });
    }

    if (action === 'put') {
      const record: CacheRecord<unknown> = { value, timestamp: Date.now() };
      await this.state.storage.put(storageKey, record);
      const items = await this.state.storage.list<CacheRecord<unknown>>({ prefix: CACHE_PREFIX });
      const entries = Array.from(items.entries());
      if (entries.length > limit) {
        const stale = entries
          .sort((a, b) => (a[1]?.timestamp ?? 0) - (b[1]?.timestamp ?? 0))
          .slice(0, entries.length - limit)
          .map(([staleKey]) => staleKey);
        await Promise.all(stale.map((keyToDelete) => this.state.storage.delete(keyToDelete)));
      }
      return Response.json({ value: record.value });
    }

    return Response.json({ error: { code: 'BAD_REQUEST', message: `Unknown action ${action}` } }, { status: 400 });
  }
}

function createApp(env: Env, tools: ToolsApi) {
  const app = new Hono<{ Bindings: Env }>();
  registerHealthRoute(app);
  registerPreviewRoute(app, tools);

  const requireAuth = env.REQUIRE_AUTH === 'true';
  const server = createMcpServer({
    tools,
    requireAuth,
    token: env.AUTH_TOKEN
  });

  app.get('/sse', (c) => server.handleSse(c.req.raw));
  app.get('/ws', (c) => server.handleWebSocket(c.req.raw));

  return app;
}

function buildTools(env: Env): ToolsApi {
  return createTools({ env });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const tools = buildTools(env);
    const app = createApp(env, tools);
    return app.fetch(request, env, ctx);
  }
};

export function createWorkerApp(env: Env) {
  const tools = buildTools(env);
  return createApp(env, tools);
}
