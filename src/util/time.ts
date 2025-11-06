import type { CourseOutline } from '../mcp/types.js';

export function normalizeModuleMinutes(outline: CourseOutline, targetMinutes: number): CourseOutline {
  const total = outline.modules.reduce((sum, module) => sum + module.minutes, 0);
  if (total === targetMinutes) {
    return { ...outline, duration_minutes: targetMinutes };
  }

  const scale = targetMinutes / total;
  const adjusted = outline.modules.map((module, index) => {
    const scaled = Math.max(5, Math.round(module.minutes * scale));
    return { ...module, minutes: scaled, id: module.id || `module-${index + 1}` };
  });

  const diff = targetMinutes - adjusted.reduce((sum, module) => sum + module.minutes, 0);
  if (diff !== 0 && adjusted.length > 0) {
    adjusted[adjusted.length - 1] = {
      ...adjusted[adjusted.length - 1],
      minutes: Math.max(5, adjusted[adjusted.length - 1].minutes + diff)
    };
  }

  return {
    ...outline,
    duration_minutes: targetMinutes,
    modules: adjusted
  };
}

export function computeCheckpointTimes(
  totalMinutes: number,
  segments: number
): number[] {
  if (segments <= 0) return [];
  const interval = Math.max(10, Math.round(totalMinutes / (segments + 1)));
  return Array.from({ length: segments }, (_, index) => Math.min(totalMinutes, interval * (index + 1)));
}
