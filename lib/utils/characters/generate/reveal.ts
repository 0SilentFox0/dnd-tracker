export const REVEAL_FIRST_MS = 500;

export const REVEAL_STEP_MS = 180;

export function revealSchedule(count: number, opts: { first?: number; step?: number } = {}): number[] {
  const { first = REVEAL_FIRST_MS, step = REVEAL_STEP_MS } = opts;

  return Array.from({ length: count }, (_, i) => first + i * step);
}
