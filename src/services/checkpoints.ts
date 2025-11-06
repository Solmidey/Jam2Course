import { CheckpointPlan } from '../mcp/types.js';
import { TimedModule, accumulateModuleMinutes, checkpointMinuteTargets } from '../util/time.js';

const taskLabels: Array<'Do' | 'Reflect' | 'Apply'> = ['Do', 'Reflect', 'Apply'];

function instructionForTask(module: TimedModule, taskType: 'Do' | 'Reflect' | 'Apply'): string {
  const focus = module.key_points[0] ?? module.summary;
  switch (taskType) {
    case 'Do':
      return `Practice the idea: ${focus}`;
    case 'Reflect':
      return `Journal how ${focus} connects to your workflow.`;
    case 'Apply':
      return `Plan an action to apply ${focus} within 24 hours.`;
  }
}

export function buildCheckpointPlan(modules: TimedModule[], totalMinutes: number): CheckpointPlan {
  const checkpoints = checkpointMinuteTargets(totalMinutes);
  const cumulative = accumulateModuleMinutes(modules);
  const plan: CheckpointPlan['checkpoints'] = [];
  let taskIndex = 0;

  for (const minute of checkpoints) {
    const moduleIndex = cumulative.findIndex((mark) => minute <= mark);
    const safeModuleIndex = moduleIndex >= 0 ? moduleIndex : modules.length - 1;
    const module = modules[safeModuleIndex];
    const taskType = taskLabels[taskIndex % taskLabels.length];
    plan.push({
      module_id: module.id,
      at_minute: minute,
      task_type: taskType,
      instruction: instructionForTask(module, taskType)
    });
    taskIndex += 1;
  }

  if (plan.length === 0 && modules.length > 0) {
    const module = modules[0];
    plan.push({
      module_id: module.id,
      at_minute: Math.min(10, totalMinutes),
      task_type: 'Reflect',
      instruction: instructionForTask(module, 'Reflect')
    });
  }

  return {
    total_minutes: totalMinutes,
    checkpoints: plan
  };
}
