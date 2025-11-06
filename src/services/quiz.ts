import type { CourseOutline, Quiz } from '../mcp/types.js';

const distractors = [
  'Focus exclusively on surface-level engagement metrics.',
  'Delay content reviews until after publication.',
  'Ignore collaborative feedback loops.',
  'Prioritize quantity over meaningful iteration.',
  'Rely on ad-hoc inspiration instead of systems.',
  'Treat audience questions as out-of-scope noise.'
];

function buildOptions(correct: string, moduleTitle: string, index: number): { options: string[]; correctIndex: number } {
  const options = new Set<string>();
  options.add(correct);
  options.add(`${moduleTitle} offers no actionable takeaways.`);
  options.add(distractors[index % distractors.length]);
  options.add(distractors[(index + 2) % distractors.length]);
  const filler = 'Embrace ambiguity without structure.';
  while (options.size < 4) {
    options.add(filler);
  }
  return { options: Array.from(options).slice(0, 4), correctIndex: 0 };
}

export function generateQuiz(
  outline: CourseOutline,
  desiredCount: number,
  _difficulty: 'easy' | 'med' | 'hard'
): Quiz {
  const questions = [] as Quiz['questions'];
  const modules = outline.modules;
  for (let i = 0; i < desiredCount; i++) {
    const module = modules[i % modules.length];
    const point = module.key_points[i % module.key_points.length];
    const stem = `In ${module.title}, what best captures the guidance around "${point}"?`;
    const { options, correctIndex } = buildOptions(point, module.title, i);
    questions.push({
      id: crypto.randomUUID(),
      prompt: stem,
      options,
      correct_index: correctIndex,
      rationale: `The module emphasises "${point}" as a central action.`,
      module_ref: module.id
    });
  }
  return { questions };
}
