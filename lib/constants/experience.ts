export const XP_THRESHOLDS: Record<number, number> = {
  2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
  11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
};

export function xpForLevel(level: number): number | null {
  if (level === 1) return 0;

  return XP_THRESHOLDS[level] ?? null;
}

export function levelUpAvailable(c: { level: number; experience: number }, maxLevel: number): boolean {
  const next = xpForLevel(c.level + 1);

  return c.level < maxLevel && next !== null && c.experience >= next;
}

export function xpShare(amount: number, count: number, split: boolean): number {
  if (!split || count <= 1) return amount;

  return Math.sign(amount) * Math.floor(Math.abs(amount) / count);
}

export function addExperience(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
