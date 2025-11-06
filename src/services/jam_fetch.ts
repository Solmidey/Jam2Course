import { sanitizeHtml } from '../util/text';

export interface JamPost {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface JamThread {
  title: string;
  posts: JamPost[];
}

export interface JamFetchOptions {
  timeoutMs?: number;
}

async function fetchWithTimeout(resource: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJamThread(
  threadUrl: string,
  options: JamFetchOptions = {}
): Promise<JamThread> {
  const response = await fetchWithTimeout(threadUrl, { headers: { Accept: 'application/json,text/html' } }, options.timeoutMs);
  if (!response.ok) {
    throw new Error(`Failed to fetch thread: ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json<JamThread>();
    if (!data || !data.title || !Array.isArray(data.posts)) {
      throw new Error('Invalid thread payload');
    }
    return {
      title: data.title,
      posts: data.posts.map((post, index) => ({
        id: post.id ?? `post-${index}`,
        author: post.author ?? 'unknown',
        body: sanitizeHtml(post.body ?? ''),
        createdAt: post.createdAt ?? new Date().toISOString(),
      })),
    };
  }
  const text = await response.text();
  const sanitized = sanitizeHtml(text);
  const lines = sanitized.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const posts: JamPost[] = lines.map((line, index) => ({
    id: `line-${index}`,
    author: 'unknown',
    body: line,
    createdAt: new Date().toISOString(),
  }));
  return { title: posts[0]?.body ?? 'Jam Thread', posts };
}
