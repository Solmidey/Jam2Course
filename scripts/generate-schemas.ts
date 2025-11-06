import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { CheckpointPlanSchema, CourseOutlineSchema, QuizSchema } from '../src/mcp/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = join(__dirname, '..', 'schemas');
mkdirSync(outputDir, { recursive: true });

type SchemaEntry = {
  name: string;
  schema: ReturnType<typeof zodToJsonSchema>;
};

const schemas: SchemaEntry[] = [
  { name: 'course-outline.json', schema: zodToJsonSchema(CourseOutlineSchema, 'CourseOutline') },
  { name: 'checkpoint-plan.json', schema: zodToJsonSchema(CheckpointPlanSchema, 'CheckpointPlan') },
  { name: 'quiz.json', schema: zodToJsonSchema(QuizSchema, 'Quiz') }
];

for (const { name, schema } of schemas) {
  writeFileSync(join(outputDir, name), JSON.stringify(schema, null, 2), 'utf8');
}

console.log(`Schemas written to ${outputDir}`);
