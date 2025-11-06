import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import fixture from './fixtures/thread.json';

const THREAD_URL = 'https://preview.test/thread';

describe('Preview worker routes', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === THREAD_URL) {
        return new Response(JSON.stringify(fixture), {
          headers: { 'content-type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok for /health', async () => {
    const res = await env.fetch('http://localhost/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('renders preview HTML', async () => {
    const res = await env.fetch(`http://localhost/preview?thread=${encodeURIComponent(THREAD_URL)}&minutes=60&questions=6`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain(fixture.title);
    expect(body).toContain('Learning Outcomes');
    expect(body).toMatch(/Module\s+1/);
    expect(body).toContain('Quiz');
  });
});
