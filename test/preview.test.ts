import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/index.js';
import { setJamFetcher, JamFetcher, JamThread } from '../src/services/jam_fetch.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixturePath = join(process.cwd(), 'test/fixtures/thread.json');
const thread = JSON.parse(readFileSync(fixturePath, 'utf-8')) as JamThread;

const mockFetcher: JamFetcher = {
  async fetchThread() {
    return thread;
  }
};

class StubDurableObjectNamespace implements DurableObjectNamespace {
  idFromName(name: string): DurableObjectId {
    return { toString: () => name } as DurableObjectId;
  }

  idFromString(id: string): DurableObjectId {
    return { toString: () => id } as DurableObjectId;
  }

  newUniqueId(): DurableObjectId {
    return { toString: () => 'unique' } as DurableObjectId;
  }

  get(_id: DurableObjectId): DurableObjectStub {
    return {
      async fetch(_input: RequestInfo, init?: RequestInit) {
        if (!init || init.method === 'GET') {
          return new Response('Not found', { status: 404 });
        }
        return new Response(null, { status: 204 });
      }
    } as DurableObjectStub;
  }
}

const env = {
  COURSE_CACHE: new StubDurableObjectNamespace(),
  DETERMINISTIC: 'true'
};

beforeAll(() => {
  setJamFetcher(mockFetcher);
});

describe('routes', () => {
  it('health returns ok', async () => {
    const response = await app.fetch(new Request('https://example.com/health'), env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('preview returns html containing expected sections', async () => {
    const url = 'https://example.com/preview?thread=https://fixture.local/thread&minutes=60&questions=6';
    const response = await app.fetch(new Request(url), env);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('From Jam to Course');
    expect(html).toContain('Learning Outcomes');
    expect(html).toContain('Module 1');
    expect(html).toContain('Quiz');
  });
});
