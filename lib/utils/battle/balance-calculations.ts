/**
 * Розрахунки для автопідбору ворогів за KPI (Damage per Round / Total HP).
 * DPR = фізика (melee або ranged) + магія (одна школа) + немагічні основні навички (сума).
 */

import { AttackType } from "@/lib/constants/battle";
import {
  DPR_BY_LEVEL_MAGIC,
  DPR_BY_LEVEL_NON_MAGIC,
  MAGIC_MAIN_SKILL_IDS,
  type MagicMainSkillId,
} from "@/lib/constants/dpr-by-main-skill";
import {
  getHeroDamageDiceForLevel,
  getHeroMaxHp,
} from "@/lib/constants/hero-scaling";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { SkillLevel } from "@/lib/types/skill-tree";

export { MAGIC_MAIN_SKILL_IDS, type MagicMainSkillId } from "@/lib/constants/dpr-by-main-skill";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

/**
 * Мапа skillTreeId → id основних навиків у цьому дереві (з tree.mainSkills[].id).
 * Потрібна, бо в character.skillTreeProgress ключі — це skillTreeId, а не mainSkillId.
 */
export type TreeIdToMainSkillIds = Record<string, string[]>;

/** Нормалізує збережений рівень (рядок "basic"/"advanced"/"expert" або число 1/2/3) до SkillLevel. */
function normalizeSkillLevel(
  level: string | number | undefined,
): SkillLevel {
  if (level === SkillLevel.EXPERT || level === "expert" || level === 3 || level === "3")
    return SkillLevel.EXPERT;
  if (level === SkillLevel.ADVANCED || level === "advanced" || level === 2 || level === "2")
    return SkillLevel.ADVANCED;
  return SkillLevel.BASIC;
}

/** Чи є серед unlockedSkills хоча б один із назвою магічної школи (для дерев без запису в treeIdToMainSkillIds, напр. мок). */
function hasMagicSchoolInUnlockedSkills(
  unlockedSkills: string[] | undefined,
): boolean {
  if (!unlockedSkills?.length) return false;
  const lower = unlockedSkills.join(" ").toLowerCase();
  return MAGIC_MAIN_SKILL_IDS.some((id) => lower.includes(id));
}

/** Чи вважається основний навик магічним: за slug (sorcery, …) або за CUID з кампанії. */
function isMagicMainSkill(
  id: string,
  magicMainSkillIds?: Set<string> | null,
): boolean {
  return (
    (MAGIC_MAIN_SKILL_IDS as readonly string[]).includes(id) ||
    (magicMainSkillIds?.has(id) ?? false)
  );
}

/**
 * Повертає DPR-бонус магії за найвищим рівнем прокачки серед магічних основних навиків.
 * Підтримує: mainSkillId (sorcery / CUID), skillTreeId через treeIdToMainSkillIds, або вивід з unlockedSkills (мок).
 */
export function getSpellDprFromProgress(
  skillTreeProgress: SkillTreeProgress | null | undefined,
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null,
  magicMainSkillIds?: Set<string> | null,
): number {
  if (!skillTreeProgress || typeof skillTreeProgress !== "object") return 0;

  let bestDpr = 0;

  for (const [key, progress] of Object.entries(skillTreeProgress)) {
    const hasProgress = progress?.unlockedSkills?.length || progress?.level;
    if (!hasProgress) continue;
    const level = normalizeSkillLevel(progress.level as string | number | undefined);
    const dpr = DPR_BY_LEVEL_MAGIC[level] ?? DPR_BY_LEVEL_MAGIC[SkillLevel.BASIC];
    if (dpr <= bestDpr) continue;

    const isMagicByMainSkillId = isMagicMainSkill(key, magicMainSkillIds);
    const mainSkillIdsInTree = treeIdToMainSkillIds?.[key];
    const treeHasMagic =
      mainSkillIdsInTree?.some((id) => isMagicMainSkill(id, magicMainSkillIds)) ??
      false;
    const inferredMagicFromSkills =
      !isMagicByMainSkillId && !treeHasMagic && mainSkillIdsInTree === undefined
        ? hasMagicSchoolInUnlockedSkills(progress?.unlockedSkills)
        : false;

    if (isMagicByMainSkillId || treeHasMagic || inferredMagicFromSkills)
      bestDpr = dpr;
  }
  return bestDpr;
}

/**
 * Повертає сумарний DPR від усіх немагічних основних навичок.
 * Додаємо лише коли дерево відоме (є в treeIdToMainSkillIds) і в ньому немає магії.
 * Невідомі ключі (напр. мок-дерева) не рахуються як немагічні, щоб не давати +40 помилково.
 */
export function getNonMagicMainSkillDprFromProgress(
  skillTreeProgress: SkillTreeProgress | null | undefined,
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null,
  magicMainSkillIds?: Set<string> | null,
): number {
  if (!skillTreeProgress || typeof skillTreeProgress !== "object") return 0;

  let total = 0;

  for (const [key, progress] of Object.entries(skillTreeProgress)) {
    const hasProgress = progress?.unlockedSkills?.length || progress?.level;
    if (!hasProgress) continue;

    const isMagicByMainSkillId = isMagicMainSkill(key, magicMainSkillIds);
    const mainSkillIdsInTree = treeIdToMainSkillIds?.[key];
    const treeHasMagic =
      mainSkillIdsInTree?.some((id) =>
        isMagicMainSkill(id, magicMainSkillIds),
      ) ?? false;

    // Невідоме дерево або дерево без розпарсених mainSkills: не рахуємо як немагічне
    if (!Array.isArray(mainSkillIdsInTree) || mainSkillIdsInTree.length === 0)
      continue;
    // Магічна школа (ключ або дерево з магією): не додаємо
    if (isMagicByMainSkillId || treeHasMagic) continue;

    const level = normalizeSkillLevel(progress.level as string | number | undefined);
    const dpr =
      DPR_BY_LEVEL_NON_MAGIC[level] ?? DPR_BY_LEVEL_NON_MAGIC[SkillLevel.BASIC];
    total += dpr;
  }
  return total;
}

/** Середнє одного блоку кубиків: 1d6 = 3.5, 2d6+3 = 10 */
function getDiceAverageSingle(notation: string): number {
  const match = notation.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  const avgDice = (count * (sides + 1)) / 2;
  return avgDice + mod;
}

/**
 * Середнє значення кубиків: 1d6 = 3.5, 2d6+3 = 10, 2d8+1d6 = 13.
 * Підтримка: один блок з модифікатором (2d6+3) або кілька блоків кубиків (2d8+1d6).
 */
export function getDiceAverage(diceNotation: string): number {
  if (!diceNotation || !diceNotation.trim()) return 0;
  const parts = diceNotation.split(/\s*\+\s*/);
  return parts.reduce((sum, part) => {
    const p = part.trim();
    const single = getDiceAverageSingle(p);
    if (single !== 0) return sum + single;
    const modMatch = p.match(/^([+-]?\d+)$/);
    return sum + (modMatch ? parseInt(modMatch[1], 10) : 0);
  }, 0);
}

export type DifficultyRatio = "easy" | "medium" | "hard";

/**
 * Множитель цільового DPR та HP ворогів відносно союзників.
 * Легкий = слабші вороги (0.5×), середній = 1:1, важкий = сильніші (1.5×).
 * KPI не використовується — лише співвідношення DPR та HP.
 */
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

  const dpr =
    Math.max(meleeAvg, rangedAvg) || getDiceAverage("1d6"); // лише більший з melee/ranged; fallback одна атака
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

/** Детальний розклад DPR персонажа для логу/відображення */
export interface CharacterDprBreakdown {
  /** Фізичний DPR = max(melee, ranged) */
  physicalDpr: number;
  meleeAvg: number;
  rangedAvg: number;
  /** DPR від школи магії (одна школа, за рівнем) */
  spellDpr: number;
  /** DPR від немагічних основних навичок (сума) */
  nonMagicDpr: number;
  /** Рядки для детального логу */
  logLines: string[];
}

export interface GetCharacterStatsParams {
  id: string;
  name: string;
  level: number;
  strength: number;
  dexterity: number;
  attacks?: Array<{
    damageDice?: string;
    type?: string;
    attackBonus?: number;
  }>;
  skillTreeProgress?: SkillTreeProgress | null;
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null;
  magicMainSkillIds?: Set<string> | null;
}

/**
 * DPR та HP персонажа: обчислене HP (getHeroMaxHp), DPR = фізика + магія + немагічні навички.
 */
export function getCharacterStats(character: GetCharacterStatsParams): {
  dpr: number;
  hp: number;
  kpi: number;
  spellDpr: number;
  dprBreakdown: CharacterDprBreakdown;
} {
  const level = character.level;
  const strMod = getAbilityModifier(character.strength);
  const dexMod = getAbilityModifier(character.dexterity);
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
    if (isRanged) {
      rangedWeapon += avg;
    } else {
      meleeWeapon += avg;
    }
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

/**
 * Підбирає ворогів за цільовим DPR та HP (KPI не використовується).
 * 1) Спочатку додається по одному юніту з кожного tier (від найвищого до найнижчого) — різноманітність.
 * 2) Потім збільшується кількість, починаючи з найвищого tier, поки не наберемо цільові DPR та HP.
 */
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

  // Фаза 1: по одному юніту з кожного tier (найближчий за співвідношенням DPR/HP до цільового)
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

  // Фаза 2: збільшуємо кількість (від найвищого tier), поки не досягнемо цілі
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
