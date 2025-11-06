import { describe, it, expect, beforeAll } from 'vitest';
import { outline_from_thread, checkpoint_tasks, quiz_gen } from '../src/mcp/tools.js';
import { setJamFetcher, JamFetcher, JamThread } from '../src/services/jam_fetch.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixturePath = join(process.cwd(), 'test/fixtures/thread.json');
const thread = JSON.parse(readFileSync(fixturePath, 'utf-8')) as JamThread;

const mockFetcher: JamFetcher = {
  async fetchThread() {
    return thread;
  }
};

beforeAll(() => {
  setJamFetcher(mockFetcher);
});

describe('MCP tools', () => {
  it('outline_from_thread returns 4-6 modules around target minutes', async () => {
    const outline = await outline_from_thread({ threadUrl: 'https://example.com/thread', targetMinutes: 60 }, { DETERMINISTIC: 'true' });
    expect(outline.modules.length).toBeGreaterThanOrEqual(4);
    expect(outline.modules.length).toBeLessThanOrEqual(6);
    const totalMinutes = outline.modules.reduce((sum, module) => sum + module.minutes, 0);
    expect(Math.abs(totalMinutes - 60)).toBeLessThanOrEqual(6);
  });

  it('checkpoint_tasks creates increasing checkpoints referencing modules', async () => {
    const outline = await outline_from_thread({ threadUrl: 'https://example.com/thread' }, { DETERMINISTIC: 'true' });
    const plan = await checkpoint_tasks({ outline });
    expect(plan.checkpoints.length).toBeGreaterThan(0);
    const minutes = plan.checkpoints.map((cp) => cp.at_minute);
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
    const moduleIds = new Set(outline.modules.map((m) => m.id));
    for (const checkpoint of plan.checkpoints) {
      expect(moduleIds.has(checkpoint.module_id)).toBe(true);
    }
  });

  it('quiz_gen creates questions with exactly one correct answer', async () => {
    const outline = await outline_from_thread({ threadUrl: 'https://example.com/thread' }, { DETERMINISTIC: 'true' });
    const quiz = await quiz_gen({ outline, questions: 6 });
    expect(quiz.questions.length).toBe(6);
    for (const question of quiz.questions) {
      expect(question.options).toHaveLength(4);
      expect(question.correct_index).toBeGreaterThanOrEqual(0);
      expect(question.correct_index).toBeLessThan(4);
    }
  });
});
