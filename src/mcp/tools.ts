import { z } from 'zod';

import { createCheckpointPlan } from '../services/checkpoints.js';
import { HttpJamFetcher, type JamFetcher } from '../services/jam_fetch.js';
import { generateQuiz } from '../services/quiz.js';
import { outlineFromThread as summarizeOutline } from '../services/summarize.js';
import {
  CheckpointInputSchema,
  CheckpointPlanSchema,
  CourseOutlineSchema,
  OutlineFromThreadInputSchema,
  QuizGenInputSchema,
  QuizSchema,
  type CourseOutline,
  type Quiz
} from './types.js';

export interface ToolEnvironment {
  DETERMINISTIC?: string;
}

export interface ToolContext {
  env: ToolEnvironment;
  fetcher?: JamFetcher;
}

export type ToolResult<T> = { data: T } | { error: { code: string; message: string } };

function isError<T>(result: ToolResult<T>): result is { error: { code: string; message: string } } {
  return 'error' in result;
}

async function safeExecute<T>(fn: () => Promise<T>): Promise<ToolResult<T>> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: { code: 'INTERNAL_ERROR', message } };
  }
}

export function createTools(context: ToolContext) {
  const fetcher =
    context.fetcher ??
    new HttpJamFetcher({
      fetch: fetch
    });
  const deterministic = context.env.DETERMINISTIC === 'true';

  return {
    outline_from_thread: async (rawInput: unknown): Promise<ToolResult<CourseOutline>> => {
      return safeExecute(async () => {
        const input = OutlineFromThreadInputSchema.parse(rawInput);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        try {
          const thread = await fetcher.fetchThread(input.threadUrl, controller.signal);
          const outline = await summarizeOutline(thread, {
            targetMinutes: input.targetMinutes ?? 60,
            deterministic
          });
          return CourseOutlineSchema.parse(outline);
        } finally {
          clearTimeout(timeout);
        }
      });
    },
    checkpoint_tasks: async (rawInput: unknown) => {
      return safeExecute(async () => {
        const input = CheckpointInputSchema.parse(rawInput);
        const plan = createCheckpointPlan(input.outline);
        return CheckpointPlanSchema.parse(plan);
      });
    },
    quiz_gen: async (rawInput: unknown): Promise<ToolResult<Quiz>> => {
      return safeExecute(async () => {
        const input = QuizGenInputSchema.parse(rawInput);
        const quiz = generateQuiz(input.outline, input.questions ?? 10, input.difficulty ?? 'med');
        const validated = QuizSchema.parse(quiz);
        validated.questions.forEach((question, index) => {
          if (question.options.filter((option) => option === question.options[question.correct_index]).length !== 1) {
            throw new z.ZodError([
              {
                code: z.ZodIssueCode.custom,
                path: ['questions', index, 'options'],
                message: 'Each question must have a single unique correct option.'
              }
            ]);
          }
        });
        return validated;
      });
    }
  };
}

export type ToolsApi = ReturnType<typeof createTools>;
export { isError };
