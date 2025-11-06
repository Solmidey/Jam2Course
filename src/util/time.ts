export function distributeMinutes(total: number, segments: number): number[] {
  const base = Math.floor(total / segments);
  const remainder = total % segments;
  const minutes: number[] = [];
  for (let i = 0; i < segments; i++) {
    minutes.push(base + (i < remainder ? 1 : 0));
  }
  return minutes;
}

export function cumulativeMinutes(minutes: number[]): number[] {
  let acc = 0;
  return minutes.map((m) => {
    acc += m;
    return acc;
  });
}

export function clampTotal(minutes: number[], target: number): number[] {
  const sum = minutes.reduce((acc, value) => acc + value, 0);
  if (sum === target) return minutes;
  const diff = target - sum;
  const adjusted = [...minutes];
  const step = diff > 0 ? 1 : -1;
  let remaining = Math.abs(diff);
  let index = 0;
  while (remaining > 0 && adjusted.length > 0) {
    adjusted[index] = Math.max(5, adjusted[index] + step);
    remaining -= 1;
    index = (index + 1) % adjusted.length;
  }
  return adjusted;
}
