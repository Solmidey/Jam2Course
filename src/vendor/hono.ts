export type Handler<Env> = (ctx: Context<Env>) => Response | Promise<Response>;

export class Context<Env> {
  readonly req: {
    raw: Request;
    query: (name: string) => string | null;
    json: <T = unknown>() => Promise<T>;
    url: string;
  };
  readonly env: Env;

  constructor(private request: Request, env: Env) {
    const url = new URL(request.url);
    this.env = env;
    this.req = {
      raw: request,
      query: (name: string) => url.searchParams.get(name),
      json: async <T>() => (await request.clone().json()) as T,
      url: url.toString()
    };
  }

  json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  html(markup: string, status = 200): Response {
    return new Response(markup, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
}

export class Hono<App extends { Bindings: unknown }> {
  private routes: Record<string, Map<string, Handler<App['Bindings']>>> = {
    GET: new Map(),
    POST: new Map()
  };

  get(path: string, handler: Handler<App['Bindings']>): void {
    this.routes.GET.set(path, handler);
  }

  post(path: string, handler: Handler<App['Bindings']>): void {
    this.routes.POST.set(path, handler);
  }

  async fetch(request: Request, env: App['Bindings']): Promise<Response> {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const handler = this.routes[method]?.get(url.pathname);
    if (!handler) {
      return new Response('Not Found', { status: 404 });
    }
    const context = new Context(request, env);
    return await handler(context);
  }
}
