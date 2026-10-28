export type XpEdition = "2014" | "2024";

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
const THRESHOLDS_2014: Record<number, readonly number[]> = {
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
const BUDGET_2024: Record<number, readonly number[]> = {
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

const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

const clampLevel = (level: number) => Math.min(20, Math.max(1, Math.round(level)));

const orderOf = (edition: XpEdition): readonly XpDifficulty[] => XP_DIFFICULTIES[edition];

export function isXpDifficultyOf(edition: XpEdition, v: string | null | undefined): v is XpDifficulty {
  return !!v && (orderOf(edition) as readonly string[]).includes(v);
}

export const resolveXpDifficulty = (edition: XpEdition, v: string | null | undefined): XpDifficulty => (isXpDifficultyOf(edition, v) ? v : DEFAULT_XP_DIFFICULTY[edition]);

export function partyThresholds(edition: XpEdition, heroLevels: number[]): Partial<Record<XpDifficulty, number>> {
  const keys = orderOf(edition);

  const table = edition === "2014" ? THRESHOLDS_2014 : BUDGET_2024;

  const sums = keys.map((_, i) => heroLevels.reduce((sum, level) => sum + table[clampLevel(level)][i], 0));

  return Object.fromEntries(keys.map((k, i) => [k, sums[i]]));
}

export function encounterMultiplier(monsters: number, partySize: number): number {
  if (monsters <= 0) return 1;

  const base = monsters === 1 ? 1 : monsters === 2 ? 2 : monsters <= 6 ? 3 : monsters <= 10 ? 4 : monsters <= 14 ? 5 : 6;

  const step = partySize < 3 ? 1 : partySize >= 6 ? -1 : 0;

  return MULTIPLIERS[Math.min(MULTIPLIERS.length - 1, Math.max(0, base + step))];
}

export interface XpEnemy {
  unitId: string;
  quantity: number;
  xp: number | null;
}

export interface XpBudgetResult {
  edition: XpEdition;
  enemyXp: number;
  adjustedXp: number;
  multiplier: number;
  thresholds: Partial<Record<XpDifficulty, number>>;
  difficulty: XpVerdict;
  missingCr: string[];
}

export function computeXpBudget({ edition, heroLevels, enemies }: { edition: XpEdition; heroLevels: number[]; enemies: XpEnemy[] }): XpBudgetResult {
  const counted = enemies.filter((e) => e.xp !== null && e.quantity > 0);

  const missingCr = [...new Set(enemies.filter((e) => e.xp === null).map((e) => e.unitId))];

  const enemyXp = counted.reduce((sum, e) => sum + (e.xp ?? 0) * e.quantity, 0);

  const monsters = counted.reduce((sum, e) => sum + e.quantity, 0);

  const multiplier = edition === "2014" ? encounterMultiplier(monsters, heroLevels.length) : 1;

  const adjustedXp = Math.round(enemyXp * multiplier);

  const thresholds = partyThresholds(edition, heroLevels);

  const reached = orderOf(edition).filter((k) => (thresholds[k] ?? 0) > 0 && adjustedXp >= (thresholds[k] ?? 0));

  return { edition, enemyXp, adjustedXp, multiplier, thresholds, difficulty: reached.at(-1) ?? "trivial", missingCr };
}

export interface XpCandidate {
  unitId: string;
  xp?: number;
  raceId: string | null;
  summon?: boolean;
}

export function pickXpRoster(input: { edition: XpEdition; heroLevels: number[]; library: XpCandidate[]; difficulty: XpDifficulty; raceId?: string | null; maxQuantity?: number }): { unitId: string; quantity: number } | null {
  const { edition, heroLevels, library, difficulty, raceId, maxQuantity = 10 } = input;

  const thresholds = partyThresholds(edition, heroLevels);

  const order = orderOf(edition);

  const target = thresholds[difficulty] ?? 0;

  if (target <= 0) return null;

  const next = order[order.indexOf(difficulty) + 1];

  const upper = next ? (thresholds[next] ?? Infinity) : target * 1.5;

  let best: { unitId: string; quantity: number; score: number } | null = null;

  for (const u of library) {
    if (!u.xp || u.summon || (raceId && u.raceId !== raceId)) continue;

    for (let quantity = 1; quantity <= maxQuantity; quantity += 1) {
      const adjusted = computeXpBudget({ edition, heroLevels, enemies: [{ unitId: u.unitId, quantity, xp: u.xp }] }).adjustedXp;

      if (adjusted >= upper) break;

      const score = adjusted >= target ? adjusted - target : upper + target - adjusted;

      const better = !best || score < best.score || (score === best.score && (quantity < best.quantity || (quantity === best.quantity && u.unitId < best.unitId)));

      if (better) best = { unitId: u.unitId, quantity, score };
    }
  }

  return best && { unitId: best.unitId, quantity: best.quantity };
}
