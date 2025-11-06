export interface JamPost {
  id: string;
  content: string;
  created_at?: string;
  author?: string;
}

export interface JamThread {
  title: string;
  posts: JamPost[];
}

export interface JamFetchOptions {
  signal?: AbortSignal;
}

export interface JamFetcher {
  fetchThread(url: string, options?: JamFetchOptions): Promise<JamThread>;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

class HttpJamFetcher implements JamFetcher {
  async fetchThread(url: string, options?: JamFetchOptions): Promise<JamThread> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(url, {
      signal: options?.signal ?? controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Failed to fetch thread: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as JamThread;
      return {
        title: data.title ?? 'Untitled Jam',
        posts: (data.posts ?? []).map((post, index) => ({
          id: post.id ?? `post-${index + 1}`,
          content: sanitizeHtml(post.content ?? ''),
          created_at: post.created_at,
          author: post.author
        }))
      };
    }

    const text = await response.text();
    const sanitized = sanitizeHtml(text);
    const chunks = sanitized
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
    return {
      title: chunks[0] ?? 'Untitled Jam',
      posts: chunks.slice(1).map((chunk, index) => ({
        id: `post-${index + 1}`,
        content: chunk
      }))
    };
  }
}

let activeFetcher: JamFetcher = new HttpJamFetcher();

export function setJamFetcher(fetcher: JamFetcher): void {
  activeFetcher = fetcher;
}

export function getJamFetcher(): JamFetcher {
  return activeFetcher;
}
