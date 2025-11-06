import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createTools } from '../src/mcp/tools.js';
import type { CourseOutline } from '../src/mcp/types.js';
import { MockJamFetcher } from '../src/services/jam_fetch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturePath = join(__dirname, 'fixtures', 'thread.json');
const thread = JSON.parse(readFileSync(fixturePath, 'utf8'));

const tools = createTools({ env: { DETERMINISTIC: 'true' }, fetcher: new MockJamFetcher({ ...thread, source: 'fixture' }) });

describe('MCP tools', () => {
  it('outline_from_thread returns modules within range and minutes near target', async () => {
    const result = await tools.outline_from_thread({ threadUrl: 'http://localhost/thread.json', targetMinutes: 60 });
    if ('error' in result) {
      throw new Error(result.error.message);
    }
    const outline = result.data as CourseOutline;
    expect(outline.modules.length).toBeGreaterThanOrEqual(4);
    expect(outline.modules.length).toBeLessThanOrEqual(6);
    const total = outline.modules.reduce((sum, module) => sum + module.minutes, 0);
    expect(Math.abs(total - 60)).toBeLessThanOrEqual(5);
  });

  it('quiz_gen produces valid options and correct indices', async () => {
    const outlineResult = await tools.outline_from_thread({ threadUrl: 'http://localhost/thread.json', targetMinutes: 60 });
    if ('error' in outlineResult) throw new Error(outlineResult.error.message);
    const quizResult = await tools.quiz_gen({ outline: outlineResult.data, questions: 6, difficulty: 'med' });
    if ('error' in quizResult) throw new Error(quizResult.error.message);
    expect(quizResult.data.questions).toHaveLength(6);
    for (const question of quizResult.data.questions) {
      expect(question.options).toHaveLength(4);
      expect(question.correct_index).toBeGreaterThanOrEqual(0);
      expect(question.correct_index).toBeLessThan(4);
      const correctOption = question.options[question.correct_index];
      expect(question.options.filter((option) => option === correctOption)).toHaveLength(1);
    }
  });

  it('checkpoint_tasks returns increasing minutes with valid module ids', async () => {
    const outlineResult = await tools.outline_from_thread({ threadUrl: 'http://localhost/thread.json', targetMinutes: 60 });
    if ('error' in outlineResult) throw new Error(outlineResult.error.message);
    const checkpointResult = await tools.checkpoint_tasks({ outline: outlineResult.data });
    if ('error' in checkpointResult) throw new Error(checkpointResult.error.message);
    const minutes = checkpointResult.data.checkpoints.map((checkpoint) => checkpoint.at_minute);
    const sorted = [...minutes].sort((a, b) => a - b);
    expect(minutes).toEqual(sorted);
    const moduleIds = new Set(outlineResult.data.modules.map((module) => module.id));
    for (const checkpoint of checkpointResult.data.checkpoints) {
      expect(moduleIds.has(checkpoint.module_id)).toBe(true);
    }
  });
});
