import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CourseOutlineSchema,
  CheckpointPlanSchema,
  QuizSchema,
  OutlineFromThreadInputSchema,
  QuizGenInputSchema,
  CheckpointInputSchema
} from '../src/mcp/types.js';

const schemasDir = join(process.cwd(), 'schemas');
mkdirSync(schemasDir, { recursive: true });

const schemas = {
  CourseOutline: CourseOutlineSchema,
  CheckpointPlan: CheckpointPlanSchema,
  Quiz: QuizSchema,
  OutlineFromThreadInput: OutlineFromThreadInputSchema,
  QuizGenInput: QuizGenInputSchema,
  CheckpointInput: CheckpointInputSchema
};

for (const [name, schema] of Object.entries(schemas)) {
  const jsonSchema = zodToJsonSchema(schema, name, {
    $refStrategy: 'none'
  });
  writeFileSync(join(schemasDir, `${name}.json`), JSON.stringify(jsonSchema, null, 2));
}

console.log(`Schemas generated in ${schemasDir}`);
