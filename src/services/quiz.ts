import { nanoid } from 'nanoid';
import { CourseOutline, Quiz } from '../mcp/types';
import { normalizeWhitespace } from '../util/text';

const distractors = [
  'Focus solely on aesthetics without considering the audience.',
  'Delay any action until more data is available.',
  'Ignore team feedback to preserve originality.',
  'Outsource every task regardless of scope.',
  'Set no measurable goals to encourage creativity.',
  'Reduce content cadence dramatically without communication.',
];

export function buildQuiz(outline: CourseOutline, questions = 10): Quiz {
  const modules = outline.modules;
  const questionsToBuild = Math.min(questions, modules.length * 2);
  const results = [];
  for (let i = 0; i < questionsToBuild; i++) {
    const module = modules[i % modules.length];
    const point = module.key_points[i % module.key_points.length];
    const prompt = `Within ${module.title}, what best summarizes this key point?`;
    const correct = normalizeWhitespace(point);
    const choices = new Set<string>();
    choices.add(correct);
    let distractorIndex = i;
    while (choices.size < 4) {
      const candidate = distractors[(distractorIndex + choices.size) % distractors.length];
      choices.add(candidate);
      distractorIndex += 1;
    }
    const options = [...choices];
    const correctIndex = options.indexOf(correct);
    if (correctIndex === -1) {
      options[0] = correct;
    }
    results.push({
      id: nanoid(8),
      prompt,
      options,
      correct_index: options.indexOf(correct),
      rationale: `The module emphasizes: ${correct}.`,
      module_ref: module.id,
    });
  }
  return { questions: results };
}
