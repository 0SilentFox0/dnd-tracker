/**
 * Статистика союзників/ворогів та підбір юнітів за DPR/HP
 */

import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "./dpr";

import { AttackType } from "@/lib/constants/battle";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { averageOf, diceAverage, parseDiceLenient } from "@/lib/utils/common/dice";
import type { BranchLevel } from "@/lib/utils/skills/progression";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { CharacterDprBreakdown, SuggestedEnemy } from "@/types/battle-setup";

export type DifficultyRatio = "easy" | "medium" | "hard";

export const DIFFICULTY_DPR_HP_RATIOS: Record<DifficultyRatio, number> = {
  easy: 0.5,
  medium: 1,
  hard: 1.5,
};

export interface UnitStats {
  unitId: string;
  name: string;
  dpr: number;
  hp: number;
  kpi: number;
  level: number;
  raceId: string | null;
}

export interface GetCharacterStatsParams {
  participant: BattleParticipant;
  branchLevels?: Record<string, BranchLevel> | null;
  magicMainSkillIds?: Set<string> | null;
}

export function getUnitStats(unit: {
  id: string;
  name: string;
  maxHp: number;
  level: number;
  raceId?: string | null;
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

    const avg = averageOf(parseDiceLenient(dice));

    const isRanged = (a.type as string) === AttackType.RANGED;

    const mod = isRanged ? dexMod : strMod;

    const total = avg + mod;

    if (isRanged) rangedAvg += total;
    else meleeAvg += total;
  }

  const dpr =
    Math.max(meleeAvg, rangedAvg) || diceAverage("1d6");

  const hp = unit.maxHp;

  const kpi = hp > 0 ? dpr / hp : 0;

  return {
    unitId: unit.id,
    name: unit.name,
    dpr,
    hp,
    kpi,
    level: unit.level,
    raceId: unit.raceId ?? null,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function bestAverage(p: BattleParticipant, type: AttackType): number {
  const own = p.battleData.attacks.filter((a) => (a.type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE) === type);

  const options: BattleAttack[] = own.length > 0 ? own : [{ name: "", type, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack];

  return Math.max(...options.map((a) => averageAttackDamage(p, a, [p]).total));
}

export function getCharacterStats({ participant, branchLevels, magicMainSkillIds }: GetCharacterStatsParams): {
  dpr: number;
  hp: number;
  kpi: number;
  spellDpr: number;
  dprBreakdown: CharacterDprBreakdown;
} {
  const meleeAvg = bestAverage(participant, AttackType.MELEE);

  const rangedAvg = bestAverage(participant, AttackType.RANGED);

  const physicalDpr = Math.max(meleeAvg, rangedAvg);

  const spellDpr = getSpellDprFromBranchLevels(branchLevels ?? {}, magicMainSkillIds);

  const nonMagicDpr = getNonMagicBranchDpr(branchLevels ?? {}, magicMainSkillIds);

  const dpr = physicalDpr + spellDpr + nonMagicDpr;

  const hp = participant.combatStats.maxHp;

  return {
    dpr,
    hp,
    kpi: hp > 0 ? dpr / hp : 0,
    spellDpr,
    dprBreakdown: {
      physicalDpr,
      meleeAvg,
      rangedAvg,
      spellDpr,
      nonMagicDpr,
      logLines: [
        `Ближній бій ${round1(meleeAvg)}, дальній ${round1(rangedAvg)} → фізичний DPR = ${round1(physicalDpr)}`,
        `Школа магії (найвищий рівень): +${spellDpr} DPR`,
        `Немагічні основні навички (сума): +${nonMagicDpr} DPR`,
        `Разом DPR = ${round1(physicalDpr)} + ${spellDpr} + ${nonMagicDpr} = ${round1(dpr)}`,
      ],
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
