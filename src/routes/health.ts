import type { Hono } from 'hono';

export function registerHealthRoute<T extends { Bindings: unknown }>(app: Hono<T>) {
  app.get('/health', (c) => c.json({ ok: true }));
}
