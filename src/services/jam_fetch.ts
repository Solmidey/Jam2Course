export interface JamPost {
  author: string;
  content: string;
  created_at?: string;
}

export interface JamThread {
  title: string;
  posts: JamPost[];
  source: string;
}

export interface JamFetcher {
  fetchThread(url: string, signal?: AbortSignal): Promise<JamThread>;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

async function parseResponse(response: Response, source: string): Promise<JamThread> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (contentType.includes('application/json') || text.trim().startsWith('{')) {
    const json = JSON.parse(text);
    if (!json.title || !Array.isArray(json.posts)) {
      throw new Error('Invalid thread JSON');
    }
    const posts = json.posts.map((post: any) => ({
      author: String(post.author ?? 'unknown'),
      content: sanitizeHtml(String(post.content ?? '')),
      created_at: post.created_at ? String(post.created_at) : undefined
    }));
    return {
      title: String(json.title ?? 'Jam Thread'),
      posts,
      source
    };
  }

  const sanitized = sanitizeHtml(text);
  return {
    title: source,
    posts: [
      {
        author: 'unknown',
        content: sanitized
      }
    ],
    source
  };
}

export class HttpJamFetcher implements JamFetcher {
  constructor(private readonly env: { fetch: typeof fetch }) {}

  async fetchThread(url: string, signal?: AbortSignal): Promise<JamThread> {
    const response = await this.env.fetch(url, {
      method: 'GET',
      signal,
      headers: {
        'user-agent': 'Jam2Course/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch thread (${response.status})`);
    }
    return parseResponse(response, url);
  }
}

export class MockJamFetcher implements JamFetcher {
  constructor(private readonly thread: JamThread) {}

  async fetchThread(): Promise<JamThread> {
    return this.thread;
  }
}
