import { CourseOutline } from '../mcp/types';
import { chunkParagraphs, dedupeLines, extractKeywords, normalizeWhitespace, sentenceSplit } from '../util/text';
import { clampTotal, distributeMinutes } from '../util/time';
import type { JamThread } from './jam_fetch';

export interface SummarizeEnv {
  DETERMINISTIC?: string;
}

export async function callLLM(prompt: string, _env: SummarizeEnv, fallback: () => string): Promise<string> {
  // In deterministic environments we rely on the provided fallback.
  return fallback();
}

function deriveLearningOutcomes(text: string): string[] {
  const keywords = extractKeywords(text, 8);
  const outcomes = keywords.slice(0, 5).map((keyword) => `Explain how ${keyword} influences consistent content creation.`);
  return dedupeLines(outcomes).slice(0, 5).slice(0, Math.max(3, Math.min(5, outcomes.length)));
}

function makeModuleTitle(text: string, index: number): string {
  const sentences = sentenceSplit(text);
  const first = sentences[0] ?? `Module ${index + 1}`;
  return first.length > 80 ? `${first.slice(0, 77)}...` : first;
}

function deriveKeyPoints(text: string): string[] {
  const sentences = sentenceSplit(text).slice(0, 4);
  if (sentences.length === 0) {
    return [normalizeWhitespace(text).slice(0, 100) || 'Core idea'];
  }
  return sentences.map((sentence) => normalizeWhitespace(sentence));
}

export async function composeOutline(
  thread: JamThread,
  targetMinutes: number,
  env: SummarizeEnv
): Promise<CourseOutline> {
  const combined = thread.posts.map((p) => p.body).join('\n');
  const rawOutcomes = await callLLM('learning outcomes', env, () => deriveLearningOutcomes(combined).join('\n'));
  const learningOutcomes = rawOutcomes
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .slice(0, 5);
  while (learningOutcomes.length < 3 && thread.posts.length > 0) {
    learningOutcomes.push(`Apply insights from ${thread.posts[learningOutcomes.length]?.author ?? 'the thread'} to your work.`);
  }

  const chunkCount = Math.min(6, Math.max(4, Math.ceil(thread.posts.length / 3)));
  const paragraphs = chunkParagraphs(combined, Math.max(300, Math.floor(combined.length / chunkCount)));
  let modulesRaw = paragraphs.slice(0, chunkCount);
  if (modulesRaw.length < chunkCount) {
    const perModule = Math.ceil(thread.posts.length / chunkCount);
    modulesRaw = [];
    for (let i = 0; i < chunkCount; i++) {
      const slice = thread.posts
        .slice(i * perModule, (i + 1) * perModule)
        .map((post) => post.body)
        .join(' ');
      if (slice.trim().length > 0) {
        modulesRaw.push(slice);
      }
    }
  }
  while (modulesRaw.length < 4) {
    modulesRaw.push(combined);
  }
  modulesRaw = modulesRaw.slice(0, Math.min(6, Math.max(4, modulesRaw.length)));
  const durations = clampTotal(distributeMinutes(targetMinutes, modulesRaw.length), targetMinutes);

  const modules = modulesRaw.map((text, index) => {
    const summaryLines = sentenceSplit(text).slice(0, 2);
    const summary = summaryLines.join(' ') || normalizeWhitespace(text).slice(0, 140);
    return {
      id: `module-${index + 1}`,
      title: makeModuleTitle(text, index) || `Module ${index + 1}`,
      minutes: durations[index] ?? Math.max(10, Math.round(targetMinutes / modulesRaw.length)),
      summary,
      key_points: deriveKeyPoints(text),
    };
  });

  const duration = modules.reduce((acc, module) => acc + module.minutes, 0);

  return {
    title: thread.title || 'Jam Conversion Course',
    duration_minutes: duration,
    learning_outcomes: learningOutcomes.slice(0, 5),
    modules,
  };
}
