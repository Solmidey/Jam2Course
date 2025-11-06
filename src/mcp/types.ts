import { z } from 'zod';

export const moduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  minutes: z.number().int().positive(),
  summary: z.string(),
  key_points: z.array(z.string()).min(1),
});

export const courseOutlineSchema = z.object({
  title: z.string(),
  duration_minutes: z.number().int().positive(),
  learning_outcomes: z.array(z.string()).min(3).max(5),
  modules: z.array(moduleSchema).min(4).max(6),
});

export type CourseOutline = z.infer<typeof courseOutlineSchema>;

export const checkpointSchema = z.object({
  module_id: z.string(),
  at_minute: z.number().int().nonnegative(),
  task_type: z.enum(['Do', 'Reflect', 'Apply']),
  instruction: z.string(),
  expected_output: z.string().optional(),
});

export const checkpointPlanSchema = z.object({
  total_minutes: z.number().int().positive(),
  checkpoints: z.array(checkpointSchema).min(1),
});

export type CheckpointPlan = z.infer<typeof checkpointPlanSchema>;

export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
  rationale: z.string().optional(),
  module_ref: z.string().optional(),
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});

export type Quiz = z.infer<typeof quizSchema>;

export const outlineFromThreadInputSchema = z.object({
  threadUrl: z.string().url(),
  targetMinutes: z.number().int().min(30).max(120).optional(),
});

export const quizGenInputSchema = z.object({
  outline: courseOutlineSchema,
  questions: z.number().int().min(3).max(20).optional(),
  difficulty: z.enum(['easy', 'med', 'hard']).optional(),
});

export const checkpointInputSchema = z.object({
  outline: courseOutlineSchema,
});

export type OutlineFromThreadInput = z.infer<typeof outlineFromThreadInputSchema>;
export type QuizGenInput = z.infer<typeof quizGenInputSchema>;
export type CheckpointInput = z.infer<typeof checkpointInputSchema>;
