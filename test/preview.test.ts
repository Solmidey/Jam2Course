import type { DurableObjectId, DurableObjectStub } from '@cloudflare/workers-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorkerApp } from '../src/index.js';
import type { Env } from '../src/types.js';

class MemoryDurableObject {
  private readonly cache = new Map<string, unknown>();

  async fetch(request: Request): Promise<Response> {
    const { action, key, value } = await request.json();
    if (action === 'get') {
      return Response.json({ value: this.cache.get(key) ?? null });
    }
    if (action === 'put') {
      this.cache.set(key, value);
      return Response.json({ value });
    }
    return Response.json({ error: { code: 'BAD_REQUEST', message: 'Unknown action' } }, { status: 400 });
  }
}

describe('Preview routes', () => {
  const memoryDO = new MemoryDurableObject();
  const env: Env = {
    CourseCacheDO: {
      idFromName() {
        return 'test-id' as unknown as DurableObjectId;
      },
      idFromString() {
        return 'test-id' as unknown as DurableObjectId;
      },
      newUniqueId() {
        return 'test-id' as unknown as DurableObjectId;
      },
      get() {
        return {
          fetch: (url: string | Request, init?: RequestInit) => {
            const request = url instanceof Request ? url : new Request(url, init);
            return memoryDO.fetch(request);
          }
        } as DurableObjectStub;
      }
    },
    REQUIRE_AUTH: 'false',
    DETERMINISTIC: 'true',
    CACHE_LIMIT: '8',
    CACHE_TTL_SECONDS: '86400'
  } as Env;

  const fixture = JSON.stringify(
    JSON.parse(
      `{"title":"From Jam to Course: Foundations of Consistent Content","posts":[{"author":"host","content":"Kickoff"}]}`
    )
  );

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(fixture, {
        headers: { 'content-type': 'application/json' }
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns health status', async () => {
    const app = createWorkerApp(env);
    const response = await app.request('http://localhost/health');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ ok: true });
  });

  it('renders preview HTML', async () => {
    const app = createWorkerApp(env);
    const response = await app.request('http://localhost/preview?thread=https://example.com/thread.json');
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('<h1');
    expect(text).toContain('Learning Outcomes');
    expect(text).toContain('Quiz');
  });
});
