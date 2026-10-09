/**
 * Масштабування героя: HP від рівня, ВИТ і архетипу; шкода = рівень + модифікатор + кубики (d4/d6/d8).
 * Рівномірна прогресія: d4 для проміжних етапів, щоб уникнути стрибків (напр. 1→2 не ×2, 11–20 не однаково).
 */

import { AttackType } from "@/lib/constants/battle";
import { heroArchetype } from "@/lib/constants/hero-archetypes";
import { getAbilityModifier } from "@/lib/utils/common/calculations";

/** Коефіцієнти масштабування (можна перевизначити на рівні кампанії) */
export interface HeroScalingOptions {
  /**
   * Таблиця рівень → нотація кубиків для melee (d4/d6/d8, можна 2d8+1d6).
   * Якщо не задано, використовується дефолтна рівномірна прогресія.
   */
  meleeDiceByLevel?: Record<number, string>;
  /** Те саме для ranged */
  rangedDiceByLevel?: Record<number, string>;
}

const HP_CON_COEFFICIENT = 1.5;

const HP_BASE_LEVELS = 3;

/**
 * Рівномірна прогресія кубиків за рівнем (d4, d6, d8).
 * Середній урон від кубиків плавно зростає (~+0.8–1.2 за рівень), без подвоєння 1→2 і без плоскої ділянки 11–20.
 */
const DEFAULT_DICE_BY_LEVEL: Record<number, string> = {
  1: "1d4",
  2: "1d6",
  3: "2d4",
  4: "1d4+1d6",
  5: "2d6",
  6: "1d6+1d8",
  7: "2d8",
  8: "2d6+1d8",
  9: "3d8",
  10: "3d8+1d4",
  11: "3d8+1d6",
  12: "4d8",
  13: "4d8+1d4",
  14: "4d8+1d6",
  15: "4d8+2d6",
  16: "5d8+1d4",
  17: "5d8+1d6",
  18: "6d8",
  19: "6d8+1d4",
  20: "6d8+1d6",
};

function getDiceForLevel(level: number, attackType: AttackType, opts?: HeroScalingOptions | null): string {
  const table = attackType === AttackType.MELEE ? opts?.meleeDiceByLevel : opts?.rangedDiceByLevel;

  const resolved = table ?? DEFAULT_DICE_BY_LEVEL;

  const clamped = Math.max(1, Math.min(20, level));

  return resolved[clamped] ?? resolved[20] ?? "1d4";
}

export function getHeroMaxHpBreakdown(level: number, constitution: number, archetype: string | null | undefined): { total: number; breakdown: string[] } {
  const a = heroArchetype(archetype);

  const conMod = getAbilityModifier(constitution);

  const base = HP_BASE_LEVELS * a.hpPerLevel;

  const perLevel = a.hpPerLevel + conMod * HP_CON_COEFFICIENT;

  const total = Math.max(1, Math.floor(base + level * perLevel));

  return {
    total,
    breakdown: [`${a.name}: ${HP_BASE_LEVELS} × ${a.hpPerLevel} + рівень × (${a.hpPerLevel} + мод. ВИТ ${conMod} × ${HP_CON_COEFFICIENT})`, `= ${base} + ${level} × ${perLevel} = ${total}`],
  };
}

export function getHeroMaxHp(level: number, constitution: number, archetype: string | null | undefined): number {
  return getHeroMaxHpBreakdown(level, constitution, archetype).total;
}

/**
 * Нотація кубиків урону за рівнем (d4/d6/d8, можливо кілька блоків через +).
 * Наприклад: 1 → "1d4", 10 → "3d8+1d4", 20 → "6d8".
 */
export function getHeroDamageDiceForLevel(
  level: number,
  attackType: AttackType,
  options?: HeroScalingOptions | null
): string {
  return getDiceForLevel(level, attackType, options);
}
