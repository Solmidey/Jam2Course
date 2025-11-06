import { CourseOutline, Quiz } from '../mcp/types.js';

const fallbackDistractors = [
  'Focus on unrelated social media metrics.',
  'Skip planning and improvise every session.',
  'Prioritise quantity over learner value.',
  'Ignore feedback loops entirely.'
];

function shuffle<T>(items: T[], seed = 1): T[] {
  const shuffled = [...items];
  let currentIndex = shuffled.length;
  let temp: T;
  let randomIndex: number;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.abs(Math.sin(seed + currentIndex)) * currentIndex);
    currentIndex -= 1;
    temp = shuffled[currentIndex];
    shuffled[currentIndex] = shuffled[randomIndex];
    shuffled[randomIndex] = temp;
  }
  return shuffled;
}

function createQuestionId(moduleId: string, index: number): string {
  return `${moduleId}-q${index + 1}`;
}

function buildOptions(correct: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const allOptions = shuffle([correct, ...distractors.slice(0, 3)], correct.length + distractors.length);
  while (allOptions.length < 4) {
    allOptions.push(fallbackDistractors[allOptions.length % fallbackDistractors.length]);
  }
  const correctIndex = allOptions.findIndex((option) => option === correct);
  return { options: allOptions.slice(0, 4), correctIndex };
}

function difficultyCue(difficulty: 'easy' | 'med' | 'hard'): string {
  switch (difficulty) {
    case 'hard':
      return 'Select the most precise answer:';
    case 'easy':
      return 'What is the main takeaway?';
    default:
      return 'Which statement best reflects the module insight?';
  }
}

export function createQuiz(
  outline: CourseOutline,
  options?: { questions?: number; difficulty?: 'easy' | 'med' | 'hard' }
): Quiz {
  const difficulty = options?.difficulty ?? 'med';
  const desiredQuestions = options?.questions ?? Math.max(6, outline.modules.length * 2);
  const prompts = outline.modules.flatMap((module, moduleIndex) =>
    module.key_points.map((point, pointIndex) => ({
      module,
      moduleIndex,
      prompt: `${difficultyCue(difficulty)} ${point}`,
      answer: point,
      distractors: outline.modules
        .filter((other) => other.id !== module.id)
        .flatMap((other) => other.key_points)
    }))
  );

  const selected = prompts.slice(0, desiredQuestions);

  const questions = selected.map((item, index) => {
    const { options: choices, correctIndex } = buildOptions(
      item.answer,
      item.distractors.length > 0 ? item.distractors : fallbackDistractors
    );

    return {
      id: createQuestionId(item.module.id, index),
      prompt: item.prompt,
      options: choices,
      correct_index: correctIndex,
      rationale: `Derived from module ${item.module.title}.`,
      module_ref: item.module.id
    };
  });

  const trimmed = questions.slice(0, desiredQuestions);

  return { questions: trimmed };
}
