import { z } from 'zod';

export const CourseModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  minutes: z.number().int().positive(),
  summary: z.string().min(1),
  key_points: z.array(z.string().min(1)).min(1)
});

export const CourseOutlineSchema = z.object({
  title: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  learning_outcomes: z.array(z.string().min(1)).min(3).max(5),
  modules: z.array(CourseModuleSchema).min(4).max(6)
});

export type CourseOutline = z.infer<typeof CourseOutlineSchema>;

export const CheckpointSchema = z.object({
  module_id: z.string().min(1),
  at_minute: z.number().int().nonnegative(),
  task_type: z.enum(['Do', 'Reflect', 'Apply']),
  instruction: z.string().min(1),
  expected_output: z.string().optional()
});

export const CheckpointPlanSchema = z.object({
  total_minutes: z.number().int().positive(),
  checkpoints: z.array(CheckpointSchema).min(1)
});

export type CheckpointPlan = z.infer<typeof CheckpointPlanSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  rationale: z.string().optional(),
  module_ref: z.string().optional()
});

export const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1)
});

export type Quiz = z.infer<typeof QuizSchema>;

export const OutlineFromThreadInputSchema = z.object({
  threadUrl: z.string().url(),
  targetMinutes: z.number().int().positive().optional()
});

export const QuizGenInputSchema = z.object({
  outline: CourseOutlineSchema,
  questions: z.number().int().min(1).max(20).optional(),
  difficulty: z.enum(['easy', 'med', 'hard']).optional()
});

export const CheckpointInputSchema = z.object({
  outline: CourseOutlineSchema
});

export type OutlineFromThreadInput = z.infer<typeof OutlineFromThreadInputSchema>;
export type QuizGenInput = z.infer<typeof QuizGenInputSchema>;
export type CheckpointInput = z.infer<typeof CheckpointInputSchema>;
