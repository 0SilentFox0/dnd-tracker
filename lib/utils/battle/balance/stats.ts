/**
 * Статистика союзників/ворогів та підбір юнітів за DPR/HP
 */

import { getDiceAverage } from "./dice";
import {
  getNonMagicMainSkillDprFromProgress,
  getSpellDprFromProgress,
  type TreeIdToMainSkillIds,
} from "./dpr";

import { AttackType } from "@/lib/constants/battle";
import {
  getHeroDamageDiceForLevel,
  getHeroMaxHp,
} from "@/lib/constants/hero-scaling";
import { getAbilityModifier } from "@/lib/utils/common/calculations";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

export type DifficultyRatio = "easy" | "medium" | "hard";

export const DIFFICULTY_DPR_HP_RATIOS: Record<DifficultyRatio, number> = {
  easy: 0.5,
  medium: 1,
  hard: 1.5,
};

export interface AllyStats {
  dpr: number;
  totalHp: number;
  kpi: number;
  allyCount: number;
}

export interface UnitStats {
  unitId: string;
  name: string;
  dpr: number;
  hp: number;
  kpi: number;
  level: number;
  groupId: string | null;
  race: string | null;
}

export interface SuggestedEnemy {
  unitId: string;
  name: string;
  quantity: number;
  dpr: number;
  hp: number;
  totalDpr: number;
  totalHp: number;
}

export interface CharacterDprBreakdown {
  physicalDpr: number;
  meleeAvg: number;
  rangedAvg: number;
  spellDpr: number;
  nonMagicDpr: number;
  logLines: string[];
}

export interface GetCharacterStatsParams {
  id: string;
  name: string;
  level: number;
  strength: number;
  dexterity?: number;
  attacks?: Array<{
    damageDice?: string;
    type?: string;
    attackBonus?: number;
  }>;
  skillTreeProgress?: SkillTreeProgress | null;
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null;
  magicMainSkillIds?: Set<string> | null;
}

export function getUnitStats(unit: {
  id: string;
  name: string;
  maxHp: number;
  level: number;
  groupId?: string | null;
  race?: string | null;
  strength?: number;
  dexterity?: number;
  attacks: Array<{
    damageDice?: string;
    damageType?: string;
    type?: string;
    attackBonus?: number;
  }>;
}): UnitStats {
  const strMod = getAbilityModifier(unit.strength ?? 10);

  const dexMod = getAbilityModifier(unit.dexterity ?? 10);

  let meleeAvg = 0;

  let rangedAvg = 0;

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  for (const a of attacks) {
    const dice = (a.damageDice as string) || "1d6";

    const avg = getDiceAverage(dice);

    const isRanged = (a.type as string) === AttackType.RANGED;

    const mod = isRanged ? dexMod : strMod;

    const total = avg + mod;

    if (isRanged) rangedAvg += total;
    else meleeAvg += total;
  }

  const dpr =
    Math.max(meleeAvg, rangedAvg) || getDiceAverage("1d6");

  const hp = unit.maxHp;

  const kpi = hp > 0 ? dpr / hp : 0;

  return {
    unitId: unit.id,
    name: unit.name,
    dpr,
    hp,
    kpi,
    level: unit.level,
    groupId: unit.groupId ?? null,
    race: unit.race ?? null,
  };
}

export function getCharacterStats(character: GetCharacterStatsParams): {
  dpr: number;
  hp: number;
  kpi: number;
  spellDpr: number;
  dprBreakdown: CharacterDprBreakdown;
} {
  const level = character.level;

  const strMod = getAbilityModifier(character.strength);

  const dexMod = getAbilityModifier(character.dexterity ?? 10);

  const logLines: string[] = [];

  const meleeDice = getHeroDamageDiceForLevel(level, AttackType.MELEE);

  const rangedDice = getHeroDamageDiceForLevel(level, AttackType.RANGED);

  const heroMeleeBase = level + strMod + getDiceAverage(meleeDice);

  const heroRangedBase = level + dexMod + getDiceAverage(rangedDice);

  logLines.push(
    `Рівень ${level}: база melee = ${level} + ${strMod}(STR) + кубики(${meleeDice}) = ${Math.round(heroMeleeBase * 10) / 10}`,
  );
  logLines.push(
    `Рівень ${level}: база ranged = ${level} + ${dexMod}(DEX) + кубики(${rangedDice}) = ${Math.round(heroRangedBase * 10) / 10}`,
  );

  let meleeWeapon = 0;

  let rangedWeapon = 0;

  const attacks = character.attacks ?? [];

  for (const a of attacks) {
    const dice = (a.damageDice as string) || "";

    const avg = dice ? getDiceAverage(dice) : 0;

    const isRanged = (a.type as string) === AttackType.RANGED;

    if (isRanged) rangedWeapon += avg;
    else meleeWeapon += avg;
  }

  if (meleeWeapon > 0 || rangedWeapon > 0) {
    logLines.push(
      `Зброя: melee +${Math.round(meleeWeapon * 10) / 10}, ranged +${Math.round(rangedWeapon * 10) / 10}`,
    );
  }

  const meleeAvg = heroMeleeBase + meleeWeapon;

  const rangedAvg = heroRangedBase + rangedWeapon;

  const physicalDpr = Math.max(meleeAvg, rangedAvg);

  logLines.push(
    `Melee total = ${Math.round(meleeAvg * 10) / 10}, Ranged total = ${Math.round(rangedAvg * 10) / 10} → фізичний DPR = max = ${Math.round(physicalDpr * 10) / 10}`,
  );

  const spellDpr = getSpellDprFromProgress(
    character.skillTreeProgress,
    character.treeIdToMainSkillIds,
    character.magicMainSkillIds,
  );

  const nonMagicDpr = getNonMagicMainSkillDprFromProgress(
    character.skillTreeProgress,
    character.treeIdToMainSkillIds,
    character.magicMainSkillIds,
  );

  logLines.push(`Школа магії (найвищий рівень): +${spellDpr} DPR`);
  logLines.push(`Немагічні основні навички (сума): +${nonMagicDpr} DPR`);

  const dpr = physicalDpr + spellDpr + nonMagicDpr;

  logLines.push(
    `Разом DPR = ${Math.round(physicalDpr * 10) / 10} + ${spellDpr} + ${nonMagicDpr} = ${Math.round(dpr * 10) / 10}`,
  );

  const hp = getHeroMaxHp(level, character.strength);

  const kpi = hp > 0 ? dpr / hp : 0;

  return {
    dpr,
    hp,
    kpi,
    spellDpr,
    dprBreakdown: {
      physicalDpr,
      meleeAvg,
      rangedAvg,
      spellDpr,
      nonMagicDpr,
      logLines,
    },
  };
}

export function suggestEnemyUnits(
  unitsWithStats: UnitStats[],
  targetDpr: number,
  targetHp: number,
): SuggestedEnemy[] {
  if (unitsWithStats.length === 0) return [];

  const byTier = new Map<number, UnitStats[]>();

  for (const u of unitsWithStats) {
    const tier = u.level;

    if (!byTier.has(tier)) byTier.set(tier, []);

    byTier.get(tier)?.push(u);
  }

  const tiersDesc = [...byTier.keys()].sort((a, b) => b - a);

  const targetRatio = targetHp > 0 ? targetDpr / targetHp : 0;

  const result: SuggestedEnemy[] = [];

  let totalDpr = 0;

  let totalHp = 0;

  for (const tier of tiersDesc) {
    const units = byTier.get(tier) ?? [];

    if (units.length === 0) continue;

    const best = units.reduce((a, b) => {
      const ar = a.hp > 0 ? a.dpr / a.hp : 0;

      const br = b.hp > 0 ? b.dpr / b.hp : 0;

      return Math.abs(ar - targetRatio) <= Math.abs(br - targetRatio) ? a : b;
    });

    result.push({
      unitId: best.unitId,
      name: best.name,
      quantity: 1,
      dpr: best.dpr,
      hp: best.hp,
      totalDpr: best.dpr,
      totalHp: best.hp,
    });
    totalDpr += best.dpr;
    totalHp += best.hp;
  }

  const targetDprMin = targetDpr * 0.9;

  const targetHpMin = targetHp * 0.9;

  let index = 0;

  while (
    result.length > 0 &&
    (totalDpr < targetDprMin || totalHp < targetHpMin)
  ) {
    if (result.every((e) => e.quantity >= 10)) break;

    const entry = result[index % result.length];

    if (entry.quantity >= 10) {
      index++;
      continue;
    }

    entry.quantity += 1;
    entry.totalDpr = entry.dpr * entry.quantity;
    entry.totalHp = entry.hp * entry.quantity;
    totalDpr += entry.dpr;
    totalHp += entry.hp;
    index++;
  }

  return result;
}
