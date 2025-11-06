import { getJamFetcher } from '../services/jam_fetch.js';
import { generateOutline } from '../services/summarize.js';
import { buildCheckpointPlan } from '../services/checkpoints.js';
import { createQuiz } from '../services/quiz.js';
import {
  CourseOutlineSchema,
  OutlineFromThreadInputSchema,
  QuizGenInputSchema,
  CheckpointInputSchema,
  CourseOutline,
  CheckpointPlan,
  Quiz
} from './types.js';

type EnvBindings = {
  DETERMINISTIC?: string;
};

export async function outline_from_thread(
  input: unknown,
  env: EnvBindings
): Promise<CourseOutline> {
  const { threadUrl, targetMinutes } = OutlineFromThreadInputSchema.parse(input);
  const fetcher = getJamFetcher();
  const thread = await fetcher.fetchThread(threadUrl);
  const outline = generateOutline(thread, targetMinutes ?? 60, env);
  return CourseOutlineSchema.parse(outline);
}

export async function checkpoint_tasks(input: unknown): Promise<CheckpointPlan> {
  const { outline } = CheckpointInputSchema.parse(input);
  const plan = buildCheckpointPlan(outline.modules, outline.duration_minutes);
  return plan;
}

export async function quiz_gen(input: unknown): Promise<Quiz> {
  const { outline, questions, difficulty } = QuizGenInputSchema.parse(input);
  const quiz = createQuiz(outline, { questions, difficulty });
  return quiz;
}
