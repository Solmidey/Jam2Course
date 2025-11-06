import { fetchJamThread } from '../services/jam_fetch';
import { composeOutline } from '../services/summarize';
import { planCheckpoints } from '../services/checkpoints';
import { buildQuiz } from '../services/quiz';
import type { Env } from '../env';
import {
  checkpointInputSchema,
  checkpointPlanSchema,
  courseOutlineSchema,
  outlineFromThreadInputSchema,
  quizGenInputSchema,
  quizSchema,
  type CheckpointPlan,
  type CourseOutline,
  type Quiz,
} from './types';

export interface ToolContext {
  env: Env;
}

export async function outlineFromThread(input: unknown, context: ToolContext): Promise<CourseOutline> {
  const parsed = outlineFromThreadInputSchema.parse(input);
  const targetMinutes = parsed.targetMinutes ?? 60;
  const thread = await fetchJamThread(parsed.threadUrl);
  const outline = await composeOutline(thread, targetMinutes, {
    DETERMINISTIC: context.env.DETERMINISTIC,
  });
  return courseOutlineSchema.parse(outline);
}

export async function checkpointTasks(input: unknown, context: ToolContext): Promise<CheckpointPlan> {
  const parsed = checkpointInputSchema.parse(input);
  const outline = courseOutlineSchema.parse(parsed.outline);
  const plan = planCheckpoints(outline);
  return checkpointPlanSchema.parse(plan);
}

export async function quizGen(input: unknown, context: ToolContext): Promise<Quiz> {
  const parsed = quizGenInputSchema.parse(input);
  const outline = courseOutlineSchema.parse(parsed.outline);
  const amount = parsed.questions ?? 10;
  const quiz = buildQuiz(outline, amount);
  return quizSchema.parse(quiz);
}
