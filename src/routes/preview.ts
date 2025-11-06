import type { Hono } from 'hono';
import { html } from 'hono/html';

import type { Env } from '../types.js';
import type { ToolsApi } from '../mcp/tools.js';
import { isError } from '../mcp/tools.js';

interface PreviewResult {
  outline: Awaited<ReturnType<ToolsApi['outline_from_thread']>> extends { data: infer T }
    ? T
    : never;
  checkpoints: Awaited<ReturnType<ToolsApi['checkpoint_tasks']>> extends { data: infer T }
    ? T
    : never;
  quiz: Awaited<ReturnType<ToolsApi['quiz_gen']>> extends { data: infer T }
    ? T
    : never;
}

async function hashKey(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchFromCache(env: Env, key: string) {
  const id = env.CourseCacheDO.idFromName('global');
  const stub = env.CourseCacheDO.get(id);
  const response = await stub.fetch('https://cache', {
    method: 'POST',
    body: JSON.stringify({ action: 'get', key })
  });
  if (!response.ok) return null;
  const json = await response.json();
  return json.value ?? null;
}

async function storeInCache(env: Env, key: string, value: PreviewResult) {
  const id = env.CourseCacheDO.idFromName('global');
  const stub = env.CourseCacheDO.get(id);
  await stub.fetch('https://cache', {
    method: 'POST',
    body: JSON.stringify({ action: 'put', key, value })
  });
}

function renderPage(result: PreviewResult) {
  const { outline, checkpoints, quiz } = result;
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${outline.title}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.13/dist/tailwind.min.css" />
        <style>
          body { font-family: 'Inter', sans-serif; }
          .module-card { page-break-inside: avoid; }
        </style>
      </head>
      <body class="bg-slate-50 text-slate-900">
        <main class="max-w-4xl mx-auto py-8 px-4">
          <header class="mb-8">
            <h1 class="text-3xl font-bold mb-2">${outline.title}</h1>
            <p class="text-slate-600">Estimated Duration: ${outline.duration_minutes} minutes</p>
          </header>
          <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-3">Learning Outcomes</h2>
            <ul class="list-disc ml-6 space-y-2">
              ${outline.learning_outcomes.map((outcome) => html`<li>${outcome}</li>`)}
            </ul>
          </section>
          <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-3">Modules</h2>
            <div class="space-y-6">
              ${outline.modules.map(
                (module, index) => html`<article class="bg-white shadow-sm rounded-lg p-5 module-card">
                  <h3 class="text-xl font-semibold mb-2">Module ${index + 1}: ${module.title}</h3>
                  <p class="text-sm text-slate-500 mb-2">${module.minutes} minutes</p>
                  <p class="mb-3">${module.summary}</p>
                  <ul class="list-disc ml-6 space-y-1">
                    ${module.key_points.map((point) => html`<li>${point}</li>`)}
                  </ul>
                </article>`
              )}
            </div>
          </section>
          <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-3">Checkpoints</h2>
            <ul class="space-y-3">
              ${checkpoints.checkpoints.map(
                (checkpoint) => html`<li class="bg-white rounded-lg shadow-sm p-4">
                  <p class="font-semibold">Minute ${checkpoint.at_minute} • ${checkpoint.task_type}</p>
                  <p>${checkpoint.instruction}</p>
                  ${checkpoint.expected_output ? html`<p class="text-sm text-slate-500">Expected: ${checkpoint.expected_output}</p>` : ''}
                </li>`
              )}
            </ul>
          </section>
          <section>
            <h2 class="text-2xl font-semibold mb-3">Quiz</h2>
            <ol class="space-y-4 list-decimal ml-6">
              ${quiz.questions.map(
                (question) => html`<li>
                  <p class="font-semibold mb-2">${question.prompt}</p>
                  <ul class="list-disc ml-5 space-y-1">
                    ${question.options.map((option, optionIndex) => html`<li>
                      ${String.fromCharCode(65 + optionIndex)}. ${option}
                      ${optionIndex === question.correct_index
                        ? html`<span class="text-green-600 font-medium">(Correct)</span>`
                        : ''}
                    </li>`)}
                  </ul>
                  ${question.rationale ? html`<p class="text-sm text-slate-500 mt-1">${question.rationale}</p>` : ''}
                </li>`
              )}
            </ol>
          </section>
        </main>
      </body>
    </html>`;
}

export function registerPreviewRoute(app: Hono<{ Bindings: Env }>, tools: ToolsApi) {
  app.get('/preview', async (c) => {
    const url = new URL(c.req.url);
    const thread = url.searchParams.get('thread');
    const minutesValue = Number(url.searchParams.get('minutes') ?? '60');
    const questionsValue = Number(url.searchParams.get('questions') ?? '10');
    const minutes = Number.isFinite(minutesValue) && minutesValue > 0 ? minutesValue : 60;
    const questions = Number.isFinite(questionsValue) && questionsValue > 0 ? questionsValue : 10;

    if (!thread) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'thread parameter is required' } }, 400);
    }

    const key = await hashKey(`${thread}|${minutes}|${questions}`);
    const cached = await fetchFromCache(c.env, key);

    if (cached) {
      return c.html(renderPage(cached));
    }

    const outlineResult = await tools.outline_from_thread({ threadUrl: thread, targetMinutes: minutes });
    if (isError(outlineResult)) {
      return c.json(outlineResult, 500);
    }

    const checkpointResult = await tools.checkpoint_tasks({ outline: outlineResult.data });
    if (isError(checkpointResult)) {
      return c.json(checkpointResult, 500);
    }

    const quizResult = await tools.quiz_gen({ outline: outlineResult.data, questions });
    if (isError(quizResult)) {
      return c.json(quizResult, 500);
    }

    const result: PreviewResult = {
      outline: outlineResult.data,
      checkpoints: checkpointResult.data,
      quiz: quizResult.data
    };

    await storeInCache(c.env, key, result);

    return c.html(renderPage(result));
  });
}
