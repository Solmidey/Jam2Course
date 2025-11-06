import { Hono } from 'hono';
import { AppBindings } from './preview.js';

export function registerHealthRoute(app: Hono<{ Bindings: AppBindings }>): void {
  app.get('/health', (c) => c.json({ ok: true }));
}
