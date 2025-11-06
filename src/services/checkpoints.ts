import type { CheckpointPlan, CourseOutline } from '../mcp/types.js';

const taskCycle: Array<'Do' | 'Reflect' | 'Apply'> = ['Do', 'Reflect', 'Apply'];

function buildInstruction(taskType: 'Do' | 'Reflect' | 'Apply', moduleTitle: string, keyPoint: string): string {
  switch (taskType) {
    case 'Do':
      return `Create a quick draft demonstrating "${keyPoint}" from ${moduleTitle}.`;
    case 'Reflect':
      return `Journal one paragraph on how ${moduleTitle} reshapes your view on "${keyPoint}".`;
    case 'Apply':
      return `Outline a real scenario where you will apply "${keyPoint}" after ${moduleTitle}.`;
  }
}

export function createCheckpointPlan(outline: CourseOutline): CheckpointPlan {
  const checkpoints: CheckpointPlan['checkpoints'] = [];
  let elapsed = 0;
  let taskIndex = 0;

  for (const module of outline.modules) {
    const midpoint = elapsed + Math.max(5, Math.round(module.minutes / 2));
    const primaryMinute = Math.min(midpoint, elapsed + module.minutes);
    const primaryType = taskCycle[taskIndex % taskCycle.length];
    checkpoints.push({
      module_id: module.id,
      at_minute: primaryMinute,
      task_type: primaryType,
      instruction: buildInstruction(primaryType, module.title, module.key_points[0])
    });
    taskIndex++;

    if (module.minutes >= 15) {
      const secondaryType = taskCycle[taskIndex % taskCycle.length];
      const secondaryMinute = Math.min(elapsed + module.minutes, primaryMinute + 10);
      checkpoints.push({
        module_id: module.id,
        at_minute: secondaryMinute,
        task_type: secondaryType,
        instruction: buildInstruction(
          secondaryType,
          module.title,
          module.key_points[module.key_points.length - 1]
        )
      });
      taskIndex++;
    }

    elapsed += module.minutes;
  }

  checkpoints.sort((a, b) => a.at_minute - b.at_minute);

  return {
    total_minutes: outline.duration_minutes,
    checkpoints
  };
}
