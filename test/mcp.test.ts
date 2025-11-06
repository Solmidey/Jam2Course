import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../src/env';
import thread from './fixtures/thread.json';
import { outlineFromThread, quizGen, checkpointTasks } from '../src/mcp/tools';

vi.mock('../src/services/jam_fetch', () => ({
  fetchJamThread: vi.fn(async () => thread),
}));

describe('MCP tools', () => {
  const env = {
    DETERMINISTIC: 'true',
  } as unknown as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('outline_from_thread returns 4–6 modules close to target duration', async () => {
    const outline = await outlineFromThread(
      { threadUrl: 'https://example.com/thread', targetMinutes: 60 },
      { env }
    );
    expect(outline.modules.length).toBeGreaterThanOrEqual(4);
    expect(outline.modules.length).toBeLessThanOrEqual(6);
    const total = outline.modules.reduce((acc, module) => acc + module.minutes, 0);
    expect(Math.abs(total - 60)).toBeLessThanOrEqual(5);
  });

  it('quiz_gen creates questions with valid correct indices', async () => {
    const outline = await outlineFromThread({ threadUrl: 'https://example.com/thread' }, { env });
    const quiz = await quizGen({ outline, questions: 6 }, { env });
    expect(quiz.questions).toHaveLength(6);
    for (const question of quiz.questions) {
      expect(question.options).toHaveLength(4);
      expect(question.correct_index).toBeGreaterThanOrEqual(0);
      expect(question.correct_index).toBeLessThan(4);
      const correctOption = question.options[question.correct_index];
      expect(correctOption).toBeTruthy();
    }
  });

  it('checkpoint_tasks produces increasing checkpoints with valid module refs', async () => {
    const outline = await outlineFromThread({ threadUrl: 'https://example.com/thread' }, { env });
    const plan = await checkpointTasks({ outline }, { env });
    const moduleIds = new Set(outline.modules.map((module) => module.id));
    let previous = -1;
    for (const checkpoint of plan.checkpoints) {
      expect(moduleIds.has(checkpoint.module_id)).toBe(true);
      expect(checkpoint.at_minute).toBeGreaterThan(previous);
      previous = checkpoint.at_minute;
    }
  });
});
