import type { ToolsApi } from './tools.js';

interface ServerOptions {
  tools: ToolsApi;
  requireAuth: boolean;
  token?: string;
}

function checkAuthorization(request: Request, options: ServerOptions): Response | null {
  if (!options.requireAuth) return null;
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
  const provided = header.slice('Bearer '.length);
  if (options.token && options.token !== provided) {
    return new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Invalid token' } }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }
  return null;
}

export function createMcpServer(options: ServerOptions) {
  async function invokeTool(name: keyof ToolsApi, payload: unknown) {
    const tool = options.tools[name];
    if (!tool) {
      return { error: { code: 'NOT_FOUND', message: `Unknown tool ${String(name)}` } };
    }
    return tool(payload as never);
  }

  return {
    async handleSse(request: Request): Promise<Response> {
      const authError = checkAuthorization(request, options);
      if (authError) return authError;

      const url = new URL(request.url);
      const tool = url.searchParams.get('tool') as keyof ToolsApi | null;
      const inputParam = url.searchParams.get('input');

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ message: 'Jam2Course MCP ready' })}\n\n`));
          if (tool) {
            try {
              const input = inputParam ? JSON.parse(inputParam) : undefined;
              const result = await invokeTool(tool, input ?? {});
              controller.enqueue(
                encoder.encode(`event: result\ndata: ${JSON.stringify(result)}\n\n`)
              );
            } catch (error) {
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`
                )
              );
            }
          }
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache'
        }
      });
    },
    async handleWebSocket(request: Request): Promise<Response> {
      const authError = checkAuthorization(request, options);
      if (authError) return authError;

      const upgrade = request.headers.get('upgrade') || '';
      if (upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      server.accept();
      server.addEventListener('message', async (event) => {
        try {
          const { tool, input } = JSON.parse(event.data as string);
          const result = await invokeTool(tool, input);
          server.send(JSON.stringify(result));
        } catch (error) {
          server.send(
            JSON.stringify({ error: { code: 'INVALID_REQUEST', message: (error as Error).message } })
          );
        }
      });

      server.addEventListener('close', () => {
        server.close();
      });

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }
  };
}
