import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { outline_from_thread, checkpoint_tasks, quiz_gen } from './tools.js';
import {
  OutlineFromThreadInputSchema,
  CheckpointInputSchema,
  QuizGenInputSchema,
  CourseOutlineSchema,
  CheckpointPlanSchema,
  QuizSchema
} from './types.js';

type EnvBindings = {
  DETERMINISTIC?: string;
};

export function createMcpServer(env: EnvBindings): McpServer {
  const server = new McpServer({
    name: 'jam2course',
    version: '1.0.0'
  });

  server.tool(
    'outline_from_thread',
    OutlineFromThreadInputSchema.shape satisfies Record<string, z.ZodTypeAny>,
    async (args) => {
      const outline = await outline_from_thread(args, env);
      return {
        content: [
          { type: 'text', text: JSON.stringify(outline, null, 2) }
        ],
        structuredContent: CourseOutlineSchema.parse(outline)
      };
    }
  );

  server.tool(
    'checkpoint_tasks',
    CheckpointInputSchema.shape satisfies Record<string, z.ZodTypeAny>,
    async (args) => {
      const plan = await checkpoint_tasks(args);
      return {
        content: [
          { type: 'text', text: JSON.stringify(plan, null, 2) }
        ],
        structuredContent: CheckpointPlanSchema.parse(plan)
      };
    }
  );

  server.tool(
    'quiz_gen',
    QuizGenInputSchema.shape satisfies Record<string, z.ZodTypeAny>,
    async (args) => {
      const quiz = await quiz_gen(args);
      return {
        content: [
          { type: 'text', text: JSON.stringify(quiz, null, 2) }
        ],
        structuredContent: QuizSchema.parse(quiz)
      };
    }
  );

  return server;
}

export type ToolName = 'outline_from_thread' | 'checkpoint_tasks' | 'quiz_gen';

export async function invokeTool(
  tool: ToolName,
  input: unknown,
  env: EnvBindings
): Promise<unknown> {
  switch (tool) {
    case 'outline_from_thread':
      return outline_from_thread(input, env);
    case 'checkpoint_tasks':
      return checkpoint_tasks(input);
    case 'quiz_gen':
      return quiz_gen(input);
    default:
      throw new Error(`Unsupported tool ${tool}`);
  }
}
