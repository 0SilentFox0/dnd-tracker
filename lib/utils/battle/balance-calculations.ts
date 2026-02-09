/**
 * Розрахунки для автопідбору ворогів за KPI (Damage per Round / Total HP).
 * DPR = сума середнього урону за раунд (меле + дальність + магія за рівнем прокачки).
 */

import { AttackType } from "@/lib/constants/battle";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { SkillLevel } from "@/lib/types/skill-tree";

/** DPR-еквівалент магії за рівнем прокачки (базова / просунута / експертна) */
export const SPELL_DPR_BY_LEVEL: Record<SkillLevel, number> = {
  [SkillLevel.BASIC]: 25,
  [SkillLevel.ADVANCED]: 50,
  [SkillLevel.EXPERT]: 75,
};

/** ID основних навиків, які вважаються магією для розрахунку DPR */
export const MAGIC_MAIN_SKILL_IDS = [
  "sorcery",
  "light_magic",
  "dark_magic",
  "chaos_magic",
  "summoning_magic",
] as const;

export type MagicMainSkillId = (typeof MAGIC_MAIN_SKILL_IDS)[number];

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

/**
 * Мапа skillTreeId → id основних навиків у цьому дереві (з tree.mainSkills[].id).
 * Потрібна, бо в character.skillTreeProgress ключі — це skillTreeId, а не mainSkillId.
 */
export type TreeIdToMainSkillIds = Record<string, string[]>;

/**
 * Повертає DPR-бонус магії за найвищим рівнем прокачки серед магічних основних навиків.
 * Підтримує два формати ключів у progress:
 * - по mainSkillId (sorcery, light_magic, …) — перевіряє напряму;
 * - по skillTreeId — використовує treeIdToMainSkillIds: якщо в дереві є магічний навик, береться level з progress.
 */
export function getSpellDprFromProgress(
  skillTreeProgress: SkillTreeProgress | null | undefined,
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null,
): number {
  if (!skillTreeProgress || typeof skillTreeProgress !== "object") return 0;

  const magicIdsSet = new Set(MAGIC_MAIN_SKILL_IDS);
  let bestDpr = 0;

  for (const [key, progress] of Object.entries(skillTreeProgress)) {
    const hasProgress = progress?.unlockedSkills?.length || progress?.level;
    if (!hasProgress) continue;
    const level = (progress.level as SkillLevel) || SkillLevel.BASIC;
    const dpr = SPELL_DPR_BY_LEVEL[level] ?? SPELL_DPR_BY_LEVEL[SkillLevel.BASIC];
    if (dpr <= bestDpr) continue;

    const isMagicByMainSkillId = magicIdsSet.has(key as MagicMainSkillId);
    const mainSkillIdsInTree = treeIdToMainSkillIds?.[key];
    const treeHasMagic =
      mainSkillIdsInTree?.some((id) =>
        magicIdsSet.has(id as MagicMainSkillId)
      ) ?? false;

    if (isMagicByMainSkillId || treeHasMagic) bestDpr = dpr;
  }
  return bestDpr;
}

/** Середнє значення кубиків: 1d6 = 3.5, 2d6+3 = 10 */
export function getDiceAverage(diceNotation: string): number {
  const match = diceNotation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  const avgDice = (count * (sides + 1)) / 2;
  return avgDice + mod;
}

export type DifficultyRatio = "easy" | "medium" | "hard";

/** Співвідношення KPI союзників до ворогів: 2 = легкий, 1 = рівний, 0.5 = важкий */
export const DIFFICULTY_RATIOS: Record<DifficultyRatio, number> = {
  easy: 2,
  medium: 1,
  hard: 0.5,
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

/**
 * DPR та HP одного юніта з його атак та maxHp.
 */
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

  const dpr = meleeAvg + rangedAvg || getDiceAverage("1d6"); // fallback одна атака
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

/**
 * DPR та HP персонажа: атаки з інвентаря (меле + дальність) + магія за рівнем прокачки (константи).
 */
export function getCharacterStats(character: {
  id: string;
  name: string;
  maxHp: number;
  strength: number;
  dexterity: number;
  attacks?: Array<{
    damageDice?: string;
    type?: string;
    attackBonus?: number;
  }>;
  /** Прогрес по деревах скілів — для розрахунку DPR магії (basic/advanced/expert). */
  skillTreeProgress?: SkillTreeProgress | null;
  /** Мапа skillTreeId → mainSkillIds (якщо ключі в progress — skillTreeId). */
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null;
}): { dpr: number; hp: number; kpi: number; spellDpr: number } {
  const strMod = getAbilityModifier(character.strength);
  const dexMod = getAbilityModifier(character.dexterity);

  let meleeAvg = 0;
  let rangedAvg = 0;

  const attacks = character.attacks ?? [];
  for (const a of attacks) {
    const dice = (a.damageDice as string) || "1d6";
    const avg = getDiceAverage(dice);
    const isRanged = (a.type as string) === AttackType.RANGED;
    const mod = isRanged ? dexMod : strMod;
    const total = avg + mod;
    if (isRanged) rangedAvg += total;
    else meleeAvg += total;
  }

  const physicalDpr = meleeAvg + rangedAvg || getDiceAverage("1d6");
  const spellDpr = getSpellDprFromProgress(
    character.skillTreeProgress,
    character.treeIdToMainSkillIds,
  );
  const dpr = physicalDpr + spellDpr;
  const hp = character.maxHp;
  const kpi = hp > 0 ? dpr / hp : 0;

  return { dpr, hp, kpi, spellDpr };
}

const KPI_TOLERANCE = 0.3;

/**
 * Підбирає набір юнітів (з кількостями), щоб їхній сумарний KPI був близький до targetKpi,
 * а сумарні DPR та HP близькі до цілей (targetDpr, targetHp).
 */
export function suggestEnemyUnits(
  unitsWithStats: UnitStats[],
  targetKpi: number,
  targetDpr: number,
  targetHp: number,
): SuggestedEnemy[] {
  if (unitsWithStats.length === 0) return [];

  const sorted = [...unitsWithStats].sort(
    (a, b) => Math.abs(a.kpi - targetKpi) - Math.abs(b.kpi - targetKpi),
  );

  const result: SuggestedEnemy[] = [];
  let totalDpr = 0;
  let totalHp = 0;

  // Спочатку набираємо по одному юніту, найближчого за KPI
  for (const u of sorted) {
    const needMoreHp = targetHp - totalHp;
    const needMoreDpr = targetDpr - totalDpr;
    if (needMoreHp <= 0 && needMoreDpr <= 0) break;

    let qty = 1;
    if (u.hp > 0 && u.dpr > 0) {
      const byHp = Math.max(0, Math.ceil(needMoreHp / u.hp));
      const byDpr = Math.max(0, Math.ceil(needMoreDpr / u.dpr));
      qty = Math.min(Math.max(byHp, byDpr, 1), 10);
    }

    const addDpr = u.dpr * qty;
    const addHp = u.hp * qty;
    totalDpr += addDpr;
    totalHp += addHp;
    result.push({
      unitId: u.unitId,
      name: u.name,
      quantity: qty,
      dpr: u.dpr,
      hp: u.hp,
      totalDpr: addDpr,
      totalHp: addHp,
    });
    if (totalHp >= targetHp * 0.9 && totalDpr >= targetDpr * 0.9) break;
  }

  const finalKpi = totalHp > 0 ? totalDpr / totalHp : 0;
  if (Math.abs(finalKpi - targetKpi) > KPI_TOLERANCE && result.length > 0) {
    const last = result[result.length - 1];
    const diff = targetKpi * totalHp - totalDpr;
    if (Math.abs(diff) > 5) {
      const adjust = Math.round(diff / last.dpr);
      const newQty = Math.max(1, Math.min(10, last.quantity + adjust));
      if (newQty !== last.quantity) {
        last.quantity = newQty;
        last.totalDpr = last.dpr * newQty;
        last.totalHp = last.hp * newQty;
      }
    }
  }

  return result;
}
