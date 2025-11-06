import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  courseOutlineSchema,
  checkpointPlanSchema,
  quizSchema,
  outlineFromThreadInputSchema,
  quizGenInputSchema,
  checkpointInputSchema,
} from '../src/mcp/types';

const schemas = {
  CourseOutline: courseOutlineSchema,
  CheckpointPlan: checkpointPlanSchema,
  Quiz: quizSchema,
  OutlineFromThreadInput: outlineFromThreadInputSchema,
  QuizGenInput: quizGenInputSchema,
  CheckpointInput: checkpointInputSchema,
};

const outDir = join(process.cwd(), 'schemas');
mkdirSync(outDir, { recursive: true });

for (const [name, schema] of Object.entries(schemas)) {
  const json = zodToJsonSchema(schema, name);
  const file = join(outDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(json, null, 2));
  console.log(`wrote ${file}`);
}
