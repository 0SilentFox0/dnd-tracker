/**
 * Масштабування героя: HP від рівня та сили; шкода = рівень + модифікатор + кубики (d4/d6/d8).
 * Рівномірна прогресія: d4 для проміжних етапів, щоб уникнути стрибків (напр. 1→2 не ×2, 11–20 не однаково).
 */

import { AttackType } from "@/lib/constants/battle";
import { getAbilityModifier } from "@/lib/utils/common/calculations";

/** Допустимі кубики для шкоди героя */
export const HERO_DAMAGE_DICE_SIDES = [4, 6, 8] as const;

/** Коефіцієнти масштабування (можна перевизначити на рівні кампанії) */
export interface HeroScalingOptions {
  /** HP: level * (hpBasePerLevel + strMod * hpStrCoefficient) * hpMultiplier */
  hpBasePerLevel?: number;
  hpStrCoefficient?: number;
  hpMultiplier?: number;
  /**
   * Таблиця рівень → нотація кубиків для melee (d4/d6/d8, можна 2d8+1d6).
   * Якщо не задано, використовується дефолтна рівномірна прогресія.
   */
  meleeDiceByLevel?: Record<number, string>;
  /** Те саме для ranged */
  rangedDiceByLevel?: Record<number, string>;
}

const DEFAULTS: Required<Pick<HeroScalingOptions, "hpBasePerLevel" | "hpStrCoefficient" | "hpMultiplier">> = {
  hpBasePerLevel: 10,
  hpStrCoefficient: 1.5,
  hpMultiplier: 1,
};

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

function withDefaults(opts?: HeroScalingOptions | null) {
  if (!opts) return DEFAULTS;
  return {
    hpBasePerLevel: opts.hpBasePerLevel ?? DEFAULTS.hpBasePerLevel,
    hpStrCoefficient: opts.hpStrCoefficient ?? DEFAULTS.hpStrCoefficient,
    hpMultiplier: opts.hpMultiplier ?? DEFAULTS.hpMultiplier,
  };
}

/**
 * Максимальне HP героя за рівнем та силою.
 * Формула: level * (hpBasePerLevel + strMod * hpStrCoefficient) * hpMultiplier
 */
export function getHeroMaxHp(
  level: number,
  strength: number,
  options?: HeroScalingOptions | null
): number {
  const o = withDefaults(options);
  const strMod = getAbilityModifier(strength);
  const perLevel = o.hpBasePerLevel + strMod * o.hpStrCoefficient;
  return Math.max(1, Math.floor(level * perLevel * o.hpMultiplier));
}

/**
 * Розбивка обрахунку HP для відображення (як у damage breakdown).
 */
export function getHeroMaxHpBreakdown(
  level: number,
  strength: number,
  options?: HeroScalingOptions | null
): { total: number; breakdown: string[] } {
  const o = withDefaults(options);
  const strMod = getAbilityModifier(strength);
  const perLevel = o.hpBasePerLevel + strMod * o.hpStrCoefficient;
  const total = Math.max(1, Math.floor(level * perLevel * o.hpMultiplier));
  const breakdown: string[] = [];
  breakdown.push(
    `рівень × (база за рівень + мод. сили × коеф.) × множ. = ${level} × (${o.hpBasePerLevel} + ${strMod} × ${o.hpStrCoefficient}) × ${o.hpMultiplier}`
  );
  breakdown.push(`= ${level} × ${perLevel} × ${o.hpMultiplier} = ${total}`);
  return { total, breakdown };
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

/**
 * Компоненти базового урону героя "з руки": level + statMod + кубики(level).
 * Для підсумку: baseDamage = weaponDiceAverage + level + diceAverage + statMod.
 * Повертає level, нотацію кубиків та середнє по кубиках (обчислює викликач через getDiceAverage).
 */
export function getHeroDamageComponents(
  level: number,
  attackType: AttackType,
  options?: HeroScalingOptions | null
): { levelPart: number; diceNotation: string } {
  const diceNotation = getHeroDamageDiceForLevel(level, attackType, options);
  return { levelPart: level, diceNotation };
}

export { DEFAULTS as HERO_SCALING_DEFAULTS };
