export type TimedModule = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  key_points: string[];
};

export function normalizeModuleMinutes<T extends TimedModule>(
  modules: Array<T & { minutes: number }>,
  targetMinutes: number
): T[] {
  const total = modules.reduce((acc, module) => acc + module.minutes, 0);
  if (total === 0) {
    const even = Math.max(1, Math.floor(targetMinutes / modules.length));
    return modules.map((module) => ({ ...module, minutes: even }));
  }

  const scaled = modules.map((module) => ({
    module,
    value: (module.minutes * targetMinutes) / total
  }));

  const baseMinutes = scaled.map(({ module, value }) => ({
    module,
    minutes: Math.max(5, Math.floor(value))
  }));

  let assigned = baseMinutes.reduce((acc, item) => acc + item.minutes, 0);
  const remainder = targetMinutes - assigned;
  if (remainder !== 0) {
    const sorted = [...baseMinutes].sort((a, b) => b.module.minutes - a.module.minutes);
    const direction = remainder > 0 ? 1 : -1;
    let remaining = Math.abs(remainder);
    let index = 0;
    while (remaining > 0) {
      const item = sorted[index % sorted.length];
      item.minutes = Math.max(5, item.minutes + direction);
      remaining -= 1;
      index += 1;
    }
  }

  return baseMinutes.map(({ module, minutes }) => ({ ...module, minutes }));
}

export function accumulateModuleMinutes(modules: TimedModule[]): number[] {
  const marks: number[] = [];
  let current = 0;
  for (const module of modules) {
    current += module.minutes;
    marks.push(current);
  }
  return marks;
}

export function checkpointMinuteTargets(total: number): number[] {
  const checkpoints: number[] = [];
  const interval = Math.max(10, Math.round(total / 5));
  for (let minute = interval; minute < total; minute += interval) {
    checkpoints.push(minute);
  }
  return checkpoints;
}
