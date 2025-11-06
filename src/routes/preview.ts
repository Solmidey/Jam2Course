import type { Context } from 'hono';
import { html } from 'hono/html';
import type { Env } from '../env';
import type { CheckpointPlan, CourseOutline, Quiz } from '../mcp/types';
import { checkpointTasks, outlineFromThread, quizGen } from '../mcp/tools';

export interface PreviewBundle {
  outline: CourseOutline;
  checkpoints: CheckpointPlan;
  quiz: Quiz;
}

export async function resolveBundle(
  env: Env,
  threadUrl: string,
  minutes: number,
  questions: number
): Promise<PreviewBundle> {
  const outline = await outlineFromThread({ threadUrl, targetMinutes: minutes }, { env });
  const checkpoints = await checkpointTasks({ outline }, { env });
  const quiz = await quizGen({ outline, questions }, { env });
  return { outline, checkpoints, quiz };
}

export function renderPreview(bundle: PreviewBundle): string {
  const { outline, checkpoints, quiz } = bundle;
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${outline.title} – Jam2Course Preview</title>
        <link
          href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.3/dist/tailwind.min.css"
          rel="stylesheet"
        />
        <style>
          @media print {
            a[href]::after {
              content: "";
            }
          }
        </style>
      </head>
      <body class="bg-slate-50 text-slate-900">
        <main class="max-w-4xl mx-auto py-8 px-6 space-y-8">
          <header class="space-y-3">
            <p class="uppercase tracking-wide text-sm text-slate-500">60-minute micro-course</p>
            <h1 class="text-3xl font-bold">${outline.title}</h1>
            <p class="text-slate-600">Total duration: ${outline.duration_minutes} minutes</p>
          </header>

          <section>
            <h2 class="text-2xl font-semibold mb-3">Learning Outcomes</h2>
            <ul class="list-disc pl-6 space-y-2">
              ${outline.learning_outcomes.map((outcome) => html`<li>${outcome}</li>`)}
            </ul>
          </section>

          <section class="space-y-6">
            <h2 class="text-2xl font-semibold">Modules</h2>
            ${outline.modules.map(
              (module, index) => html`<article class="bg-white shadow rounded-lg p-5 border border-slate-200">
                <h3 class="text-xl font-semibold">Module ${index + 1}: ${module.title}</h3>
                <p class="text-sm text-slate-500 mb-2">${module.minutes} minutes</p>
                <p class="mb-3">${module.summary}</p>
                <ul class="list-disc pl-5 space-y-1">
                  ${module.key_points.map((point) => html`<li>${point}</li>`)}
                </ul>
              </article>`
            )}
          </section>

          <section>
            <h2 class="text-2xl font-semibold mb-4">Checkpoints</h2>
            <ol class="space-y-3">
              ${checkpoints.checkpoints.map(
                (checkpoint) => html`<li class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <div class="flex items-center justify-between text-sm text-slate-500">
                    <span>At ${checkpoint.at_minute}'</span>
                    <span class="uppercase tracking-wide font-semibold text-slate-600">${checkpoint.task_type}</span>
                  </div>
                  <p class="mt-2">${checkpoint.instruction}</p>
                  ${checkpoint.expected_output
                    ? html`<p class="mt-1 text-sm text-slate-500">Expected: ${checkpoint.expected_output}</p>`
                    : ''}
                </li>`
              )}
            </ol>
          </section>

          <section>
            <h2 class="text-2xl font-semibold mb-4">Quiz</h2>
            <ol class="space-y-4">
              ${quiz.questions.map(
                (question, index) => html`<li class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <h3 class="font-semibold">Question ${index + 1}</h3>
                  <p class="mt-1">${question.prompt}</p>
                  <ul class="list-decimal pl-6 mt-2 space-y-1">
                    ${question.options.map((option, idx) =>
                      html`<li class="${idx === question.correct_index ? 'font-semibold text-emerald-600' : ''}">${option}</li>`
                    )}
                  </ul>
                  ${question.rationale
                    ? html`<p class="mt-2 text-sm text-slate-500">Why: ${question.rationale}</p>`
                    : ''}
                </li>`
              )}
            </ol>
          </section>
        </main>
      </body>
    </html>`;
}

export async function previewRoute(c: Context<{ Bindings: Env }>, bundle: PreviewBundle): Promise<Response> {
  return c.html(renderPreview(bundle));
}
