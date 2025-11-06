import { Hono } from 'hono';
import { registerPreviewRoute, AppBindings, CourseBundle } from './routes/preview.js';
import { registerHealthRoute } from './routes/health.js';
import { invokeTool, createMcpServer } from './mcp/server.js';
import { OutlineFromThreadInputSchema, CheckpointInputSchema, QuizGenInputSchema } from './mcp/types.js';

export type Env = AppBindings;

type JsonRpcRequest = {
  id: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcRequest['id']; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcRequest['id']; error: { code: number; message: string } };

async function handleJsonRpc(request: JsonRpcRequest, env: Env): Promise<JsonRpcResponse> {
  try {
    if (request.method === 'outline_from_thread') {
      const parsed = OutlineFromThreadInputSchema.parse(request.params);
      const result = await invokeTool('outline_from_thread', parsed, env);
      return { jsonrpc: '2.0', id: request.id, result };
    }
    if (request.method === 'checkpoint_tasks') {
      const parsed = CheckpointInputSchema.parse(request.params);
      const result = await invokeTool('checkpoint_tasks', parsed, env);
      return { jsonrpc: '2.0', id: request.id, result };
    }
    if (request.method === 'quiz_gen') {
      const parsed = QuizGenInputSchema.parse(request.params);
      const result = await invokeTool('quiz_gen', parsed, env);
      return { jsonrpc: '2.0', id: request.id, result };
    }
    return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return { jsonrpc: '2.0', id: request.id, error: { code: -32603, message } };
  }
}

function authorizeRequest(request: Request, env: Env): Response | null {
  if (env.REQUIRE_AUTH === 'true') {
    const header = request.headers.get('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  return null;
}

const app = new Hono<{ Bindings: Env }>();

registerHealthRoute(app);
registerPreviewRoute(app);

app.post('/mcp', async (c) => {
  const authFailure = authorizeRequest(c.req.raw, c.env);
  if (authFailure) {
    return authFailure;
  }
  const body = await c.req.json<JsonRpcRequest>();
  const response = await handleJsonRpc(body, c.env);
  return c.json(response);
});

app.get('/sse', (c) => {
  const authFailure = authorizeRequest(c.req.raw, c.env);
  if (authFailure) {
    return authFailure;
  }
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify({ info: 'Use POST /mcp for JSON-RPC access.' })}\n\n`;
  void writer.write(encoder.encode(message)).then(() => writer.close());
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
});

app.get('/ws', (c) => {
  const authFailure = authorizeRequest(c.req.raw, c.env);
  if (authFailure) {
    return authFailure;
  }
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  server.accept();
  server.send(JSON.stringify({ info: 'WebSocket bridge not yet implemented. Use HTTP JSON-RPC.' }));
  server.close(1000, 'Completed');
  return new Response(null, { status: 101, webSocket: client });
});

export default app;

export class CourseCacheDO {
  private ttlSeconds: number;
  private capacity: number;

  constructor(private state: DurableObjectState, private env: Env) {
    this.ttlSeconds = Number(env.CACHE_TTL_SECONDS ?? '86400');
    this.capacity = Number(env.CACHE_CAPACITY ?? '64');
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response('Missing key', { status: 400 });
    }

    if (request.method === 'GET') {
      const entry = await this.state.storage.get<{
        value: CourseBundle;
        expires: number;
        stored: number;
      }>(key);
      if (!entry) {
        return new Response('Not found', { status: 404 });
      }
      if (Date.now() > entry.expires) {
        await this.state.storage.delete(key);
        return new Response('Expired', { status: 404 });
      }
      return new Response(JSON.stringify(entry.value), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'PUT') {
      const value = (await request.json()) as CourseBundle;
      const now = Date.now();
      await this.state.storage.put(key, {
        value,
        expires: now + this.ttlSeconds * 1000,
        stored: now
      });
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
    const entries = await this.state.storage.list<{ stored: number }>({ limit: this.capacity + 5 });
    if (entries.size <= this.capacity) {
      return;
    }
    const sorted = [...entries.entries()].sort((a, b) => a[1].stored - b[1].stored);
    const overflow = sorted.slice(0, Math.max(0, sorted.length - this.capacity));
    await Promise.all(overflow.map(([key]) => this.state.storage.delete(key)));
  }
}

createMcpServer({});
