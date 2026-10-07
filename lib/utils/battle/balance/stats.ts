/**
 * Статистика героїв і юнітів (DPR / HP)
 */

import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "./dpr";

import { AttackType } from "@/lib/constants/battle";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { averageOf, diceAverage, parseDiceLenient } from "@/lib/utils/common/dice";
import type { BranchLevel } from "@/lib/utils/skills/progression";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { CharacterDprBreakdown } from "@/types/battle-setup";

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
