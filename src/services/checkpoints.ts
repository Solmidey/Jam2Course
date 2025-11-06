import { CheckpointPlan, CourseOutline } from '../mcp/types';
import { cumulativeMinutes } from '../util/time';

const taskTypes: Array<'Do' | 'Reflect' | 'Apply'> = ['Do', 'Reflect', 'Apply'];

function buildInstruction(moduleTitle: string, keyPoint: string, task: 'Do' | 'Reflect' | 'Apply'): string {
  switch (task) {
    case 'Do':
      return `Create a quick artifact demonstrating: ${keyPoint.toLowerCase()}.`;
    case 'Reflect':
      return `Write a short reflection on how ${moduleTitle.toLowerCase()} influences your workflow.`;
    case 'Apply':
      return `Identify one project to apply ${keyPoint.toLowerCase()} within the next week.`;
  }
}

export function planCheckpoints(outline: CourseOutline): CheckpointPlan {
  const totals = cumulativeMinutes(outline.modules.map((module) => module.minutes));
  const checkpoints = [];
  let taskIndex = 0;
  for (let i = 0; i < outline.modules.length; i++) {
    const module = outline.modules[i];
    const moduleEnd = totals[i];
    const moduleStart = moduleEnd - module.minutes;
    const moduleTasks = Math.min(2, Math.max(1, Math.round(module.minutes / 15)));
    for (let t = 0; t < moduleTasks; t++) {
      const offset = Math.min(module.minutes - 5, Math.max(5, Math.round((t + 1) * (module.minutes / (moduleTasks + 1)))));
      const atMinute = moduleStart + offset;
      const taskType = taskTypes[taskIndex % taskTypes.length];
      const keyPoint = module.key_points[(t + i) % module.key_points.length];
      checkpoints.push({
        module_id: module.id,
        at_minute: atMinute,
        task_type: taskType,
        instruction: buildInstruction(module.title, keyPoint, taskType),
        expected_output: taskType === 'Do' ? 'Share a concise summary or outline.' : undefined,
      });
      taskIndex += 1;
    }
  }
  checkpoints.sort((a, b) => a.at_minute - b.at_minute);
  return {
    total_minutes: outline.duration_minutes,
    checkpoints,
  };
}
