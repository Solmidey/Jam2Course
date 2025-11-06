import { JamThread } from './jam_fetch.js';
import { CourseOutline, CourseModuleSchema } from '../mcp/types.js';
import { chunkText, dedupeStrings, extractKeywords, splitSentences } from '../util/text.js';
import { normalizeModuleMinutes } from '../util/time.js';

type SummarizeEnv = {
  DETERMINISTIC?: string;
};

function callLLM(prompt: string, env?: SummarizeEnv): string {
  if (env?.DETERMINISTIC === 'true') {
    return prompt;
  }
  // Placeholder deterministic behaviour to avoid network calls.
  return prompt;
}

function selectLearningOutcomes(text: string): string[] {
  const keywords = extractKeywords(text, 8);
  const outcomes = keywords.slice(0, 5).map((keyword) => {
    const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    return `Explain the role of ${capitalized} in the course context.`;
  });
  return dedupeStrings(outcomes).slice(0, Math.max(3, Math.min(5, outcomes.length)) || 3);
}

function deriveModuleTitle(content: string, index: number): string {
  const headingMatch = content.match(/^(#+|[-*]\s+)(.+)$/m);
  if (headingMatch) {
    return headingMatch[2].trim();
  }
  const sentences = splitSentences(content);
  if (sentences.length > 0) {
    return sentences[0].slice(0, 80);
  }
  return `Module ${index + 1}`;
}

function summariseChunk(content: string): string {
  const sentences = splitSentences(content);
  return sentences.slice(0, 2).join(' ');
}

function deriveKeyPoints(content: string): string[] {
  const sentences = splitSentences(content);
  const points = sentences.slice(0, 4);
  return points.length > 0 ? points : [content.slice(0, 120)];
}

export function generateOutline(
  thread: JamThread,
  targetMinutes: number,
  env?: SummarizeEnv
): CourseOutline {
  const combinedText = thread.posts.map((post) => post.content).join('\n');
  callLLM('outline prompt', env); // placeholder for deterministic behaviour

  const moduleCount = Math.min(6, Math.max(4, Math.round(targetMinutes / 12)));
  const postChunks = chunkText(combinedText, Math.max(500, Math.round(combinedText.length / moduleCount)));
  const normalizedChunks = postChunks.slice(0, moduleCount);
  while (normalizedChunks.length < moduleCount) {
    normalizedChunks.push('Additional practice and reflection.');
  }

  const roughMinutes = Math.max(10, Math.round(targetMinutes / moduleCount));
  const modules = normalizedChunks.map((chunk, index) => ({
    id: `module-${index + 1}`,
    title: deriveModuleTitle(chunk, index),
    minutes: roughMinutes,
    summary: summariseChunk(chunk),
    key_points: dedupeStrings(deriveKeyPoints(chunk))
  }));

  const normalizedModules = normalizeModuleMinutes(modules, targetMinutes);
  normalizedModules.forEach((module) => CourseModuleSchema.parse(module));

  const outcomes = selectLearningOutcomes(combinedText);
  while (outcomes.length < 3) {
    outcomes.push('Apply the lessons from the jam thread to real-world practice.');
  }

  return {
    title: thread.title || 'Jam Micro-course',
    duration_minutes: targetMinutes,
    learning_outcomes: outcomes.slice(0, 5),
    modules: normalizedModules
  };
}
