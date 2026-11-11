export function healWounds(i: { current: number; max: number; tb: number; days: number; multiplier: number; bonus: number }): number {
  return Math.min(i.max, i.current + i.tb * i.days * i.multiplier + i.bonus);
}
