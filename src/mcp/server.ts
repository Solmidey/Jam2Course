import { Server } from '@modelcontextprotocol/sdk/server';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Env } from '../env';
import { checkpointPlanSchema, courseOutlineSchema, outlineFromThreadInputSchema, quizGenInputSchema, quizSchema } from './types';
import { checkpointTasks, outlineFromThread, quizGen } from './tools';

export function createMcpServer(env: Env): Server {
  const server = new Server({ name: 'Jam2Course MCP', version: '1.0.0' });

  server.tool('outline_from_thread', {
    description: 'Convert a Nullshot Jam thread into a course outline.',
    inputSchema: zodToJsonSchema(outlineFromThreadInputSchema, 'OutlineFromThreadInput'),
    outputSchema: zodToJsonSchema(courseOutlineSchema, 'CourseOutline'),
    handler: async ({ input }) => outlineFromThread(input, { env }),
  });

  server.tool('checkpoint_tasks', {
    description: 'Generate timed checkpoints for a course outline.',
    inputSchema: zodToJsonSchema(courseOutlineSchema, 'CourseOutline'),
    outputSchema: zodToJsonSchema(checkpointPlanSchema, 'CheckpointPlan'),
    handler: async ({ input }) => checkpointTasks({ outline: input }, { env }),
  });

  server.tool('quiz_gen', {
    description: 'Generate multiple-choice quiz questions for a course outline.',
    inputSchema: zodToJsonSchema(quizGenInputSchema, 'QuizGenInput'),
    outputSchema: zodToJsonSchema(quizSchema, 'Quiz'),
    handler: async ({ input }) => quizGen(input, { env }),
  });

  return server;
}
