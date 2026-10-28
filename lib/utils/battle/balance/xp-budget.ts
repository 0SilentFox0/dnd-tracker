import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import {
  BUDGET_2024,
  DEFAULT_XP_DIFFICULTY,
  ENCOUNTER_MULTIPLIERS,
  THRESHOLDS_2014,
  XP_DIFFICULTIES,
  XP_DIFFICULTY_LABELS,
  type XpDifficulty,
  type XpEdition,
  type XpVerdict,
} from "@/lib/constants/experience";

export { DEFAULT_XP_DIFFICULTY, XP_DIFFICULTIES, XP_DIFFICULTY_LABELS, type XpDifficulty, type XpEdition, type XpVerdict };

const clampLevel = (level: number) => Math.min(MAX_CLASS_LEVEL, Math.max(1, Math.round(level)));

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

  return ENCOUNTER_MULTIPLIERS[Math.min(ENCOUNTER_MULTIPLIERS.length - 1, Math.max(0, base + step))];
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
