import type { CourseOutline } from '../mcp/types.js';
import { dedupeStrings, chunkText, keywordExtract, sentenceSplit } from '../util/text.js';
import { normalizeModuleMinutes } from '../util/time.js';
import type { JamThread } from './jam_fetch.js';

export interface SummarizeOptions {
  targetMinutes: number;
  deterministic?: boolean;
}

export async function callLLM(_prompt: string): Promise<string> {
  // Placeholder for future LLM integration. Tests depend on deterministic mode.
  return '';
}

function heuristicOutcomes(keywords: string[]): string[] {
  const templates = [
    'Summarize the core idea of {keyword} in practice.',
    'Apply {keyword} to a Jam-style collaboration scenario.',
    'Identify pitfalls when working with {keyword}.',
    'Design a repeatable workflow using {keyword}.',
    'Evaluate success metrics linked to {keyword} initiatives.'
  ];
  const results: string[] = [];
  const unique = dedupeStrings(keywords);
  for (let i = 0; i < templates.length && i < unique.length; i++) {
    results.push(templates[i].replace('{keyword}', unique[i]));
  }
  while (results.length < 3) {
    results.push('Synthesize takeaways from the Jam conversation into an actionable plan.');
  }
  return results.slice(0, 5);
}

export function generateDeterministicOutline(
  thread: JamThread,
  options: SummarizeOptions
): CourseOutline {
  const joined = thread.posts.map((post) => post.content).join(' ');
  const keywords = keywordExtract(joined, 5);
  const sentences = sentenceSplit(joined);
  const moduleCount = Math.min(6, Math.max(4, Math.round(sentences.length / 5) || 4));
  const chunks = chunkText(joined, Math.max(2, Math.ceil(sentences.length / moduleCount)));
  const trimmedChunks = chunks.slice(0, moduleCount);
  while (trimmedChunks.length < moduleCount) {
    trimmedChunks.push(trimmedChunks[trimmedChunks.length - 1] ?? joined);
  }

  const topics = keywords.length > 0 ? keywords : ['Course Design', 'Workflow', 'Consistency'];

  const modules = trimmedChunks.map((chunk, index) => {
    const points = sentenceSplit(chunk)
      .slice(0, 3)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter((sentence) => sentence.length > 0);
    if (points.length === 0) {
      points.push('Discuss how the team framed the problem.');
    }
    const keyPoints = dedupeStrings(points).slice(0, 4);
    while (keyPoints.length < 3) {
      keyPoints.push(`Expand on insight ${keyPoints.length + 1} from the conversation.`);
    }
    return {
      id: `module-${index + 1}`,
      title: topics[index % topics.length],
      minutes: 10,
      summary: chunk.length > 160 ? `${chunk.slice(0, 157)}...` : chunk,
      key_points: keyPoints
    };
  });

  const outline: CourseOutline = {
    title: thread.title || 'Jam Conversation Deep Dive',
    duration_minutes: options.targetMinutes,
    learning_outcomes: heuristicOutcomes(keywords),
    modules
  };

  return normalizeModuleMinutes(outline, options.targetMinutes);
}

export async function outlineFromThread(
  thread: JamThread,
  options: SummarizeOptions
): Promise<CourseOutline> {
  if (options.deterministic) {
    return generateDeterministicOutline(thread, options);
  }

  const prompt = `You are summarizing a Jam thread titled "${thread.title}". Create a course outline.`;
  const response = await callLLM(prompt);
  if (!response) {
    return generateDeterministicOutline(thread, options);
  }

  // Fallback: simply use deterministic outline for now.
  return generateDeterministicOutline(thread, options);
}

export function makeOutlineId(): string {
  return crypto.randomUUID();
}
