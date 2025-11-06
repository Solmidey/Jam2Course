import { Context, Hono } from 'hono';
import { html } from 'hono/html';
import { outline_from_thread, checkpoint_tasks, quiz_gen } from '../mcp/tools.js';
import { CourseOutline, CheckpointPlan, Quiz } from '../mcp/types.js';

export type AppBindings = {
  COURSE_CACHE: DurableObjectNamespace;
  DETERMINISTIC?: string;
  REQUIRE_AUTH?: string;
  CACHE_TTL_SECONDS?: string;
  CACHE_CAPACITY?: string;
};

export interface CourseBundle {
  outline: CourseOutline;
  checkpoints: CheckpointPlan;
  quiz: Quiz;
  generated_at: string;
}

async function hashKey(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchCache(c: Context<{ Bindings: AppBindings }>, key: string): Promise<CourseBundle | null> {
  const id = c.env.COURSE_CACHE.idFromName('cache');
  const stub = c.env.COURSE_CACHE.get(id);
  const response = await stub.fetch(`https://cache.internal/?key=${key}`);
  if (response.ok) {
    return (await response.json()) as CourseBundle;
  }
  return null;
}

async function putCache(c: Context<{ Bindings: AppBindings }>, key: string, value: CourseBundle): Promise<void> {
  const id = c.env.COURSE_CACHE.idFromName('cache');
  const stub = c.env.COURSE_CACHE.get(id);
  await stub.fetch(`https://cache.internal/?key=${key}`, {
    method: 'PUT',
    body: JSON.stringify(value)
  });
}

function renderHtml(bundle: CourseBundle): string {
  const { outline, checkpoints, quiz } = bundle;
  return html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${outline.title} – Jam2Course Preview</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.4/dist/tailwind.min.css" />
      </head>
      <body class="bg-slate-50 text-slate-900">
        <main class="max-w-4xl mx-auto py-10 px-4 space-y-8">
          <header class="space-y-2">
            <p class="text-sm uppercase tracking-wide text-slate-500">Jam2Course Micro-course</p>
            <h1 class="text-4xl font-bold">${outline.title}</h1>
            <p class="text-slate-600">Designed for approximately ${outline.duration_minutes} minutes of guided learning.</p>
          </header>

          <section class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-semibold mb-4">Learning Outcomes</h2>
            <ul class="list-disc list-inside space-y-2">
              ${outline.learning_outcomes.map((outcome) => html`<li>${outcome}</li>`) }
            </ul>
          </section>

          <section class="space-y-4">
            <h2 class="text-2xl font-semibold">Modules</h2>
            ${outline.modules.map(
              (module, index) => html`
                <article class="bg-white shadow rounded-lg p-6">
                  <h3 class="text-xl font-semibold">Module ${index + 1}: ${module.title}</h3>
                  <p class="text-sm text-slate-500 mb-2">${module.minutes} minutes</p>
                  <p class="mb-3">${module.summary}</p>
                  <ul class="list-disc list-inside space-y-1">
                    ${module.key_points.map((point) => html`<li>${point}</li>`)}
                  </ul>
                </article>
              `
            )}
          </section>

          <section class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-semibold mb-4">Checkpoints</h2>
            <ol class="list-decimal list-inside space-y-3">
              ${checkpoints.checkpoints.map(
                (checkpoint) => html`
                  <li>
                    <p class="font-medium">At minute ${checkpoint.at_minute} – ${checkpoint.task_type}</p>
                    <p class="text-slate-600">${checkpoint.instruction}</p>
                  </li>
                `
              )}
            </ol>
          </section>

          <section class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-semibold mb-4">Quiz</h2>
            <ol class="space-y-6">
              ${quiz.questions.map(
                (question, index) => html`
                  <li>
                    <h3 class="font-semibold">Q${index + 1}. ${question.prompt}</h3>
                    <ul class="list-[upper-alpha] list-inside space-y-1">
                      ${question.options.map((option) => html`<li>${option}</li>`)}
                    </ul>
                    ${question.rationale ? html`<p class="text-sm text-slate-500 mt-1">${question.rationale}</p>` : ''}
                  </li>
                `
              )}
            </ol>
          </section>
        </main>
      </body>
    </html>
  `;
}

export function registerPreviewRoute(app: Hono<{ Bindings: AppBindings }>): void {
  app.get('/preview', async (c) => {
    const threadUrl = c.req.query('thread');
    if (!threadUrl) {
      return c.json({ error: { code: 'missing_thread', message: 'thread parameter is required' } }, 400);
    }
    const minutes = Number(c.req.query('minutes') ?? '60');
    const questions = Number(c.req.query('questions') ?? '10');
    const cacheKey = await hashKey(`${threadUrl}|${minutes}|${questions}`);
    const env = { DETERMINISTIC: c.env.DETERMINISTIC };

    try {
      let bundle = await fetchCache(c, cacheKey);
      if (!bundle) {
        const outline = await outline_from_thread({ threadUrl, targetMinutes: minutes }, env);
        const checkpoints = await checkpoint_tasks({ outline });
        const quiz = await quiz_gen({ outline, questions });
        bundle = {
          outline,
          checkpoints,
          quiz,
          generated_at: new Date().toISOString()
        };
        await putCache(c, cacheKey, bundle);
      }

      return c.html(renderHtml(bundle));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: { code: 'preview_failed', message } }, 500);
    }
  });
}
