import type { RulesEdition } from "@/lib/constants/rules";

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

export type XpEdition = RulesEdition;

export const XP_DIFFICULTIES = { "2014": ["easy", "medium", "hard", "deadly"], "2024": ["low", "moderate", "high"] } as const;

export type XpDifficulty = (typeof XP_DIFFICULTIES)[XpEdition][number];

export type XpVerdict = XpDifficulty | "trivial";

export const XP_DIFFICULTY_LABELS: Record<XpVerdict, string> = {
  trivial: "Дрібниця",
  easy: "Легка",
  medium: "Середня",
  hard: "Складна",
  deadly: "Смертельна",
  low: "Низька",
  moderate: "Помірна",
  high: "Висока",
};

export const DEFAULT_XP_DIFFICULTY = { "2014": "medium", "2024": "moderate" } as const satisfies Record<XpEdition, XpDifficulty>;

// DMG 2014: пороги XP на героя — легкий, середній, складний, смертельний
export const THRESHOLDS_2014: Record<number, readonly number[]> = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

// DMG 2024: бюджет XP на героя — низька, помірна, висока
export const BUDGET_2024: Record<number, readonly number[]> = {
  1: [50, 75, 100],
  2: [100, 150, 200],
  3: [150, 225, 400],
  4: [250, 375, 500],
  5: [500, 750, 1100],
  6: [600, 1000, 1400],
  7: [750, 1300, 1700],
  8: [1000, 1700, 2100],
  9: [1300, 2000, 2600],
  10: [1600, 2300, 3100],
  11: [1900, 2900, 4100],
  12: [2200, 3700, 4700],
  13: [2600, 4200, 5400],
  14: [2900, 4900, 6200],
  15: [3300, 5400, 7800],
  16: [3800, 6100, 9800],
  17: [4500, 7200, 11700],
  18: [5000, 8700, 14200],
  19: [5500, 10700, 17200],
  20: [6400, 13200, 22000],
};

export const ENCOUNTER_MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
