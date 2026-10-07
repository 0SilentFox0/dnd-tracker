/**
 * Статистика героїв і юнітів (DPR / HP)
 */
import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "./dpr";

import { AttackType } from "@/lib/constants/battle";
import { MIN_UNIT_STAT, TYPICAL_TARGETS } from "@/lib/constants/battle-balance";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { averageOf, diceAverage, parseDiceLenient } from "@/lib/utils/common/dice";
import type { BranchLevel } from "@/lib/utils/skills/progression";
import { formatSpellDamageDiceRoll } from "@/lib/utils/spells/spell-calculations";
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

export interface UnitSpellInput {
  diceCount?: number | null;
  diceType?: string | null;
  type?: string | null;
  damageType?: string | null;
  target?: string | null;
  damageDistribution?: unknown;
}

export interface UnitStatsInput {
  id: string;
  name: string;
  maxHp: number;
  level: number;
  raceId?: string | null;
  strength?: number;
  dexterity?: number;
  maxTargets?: number | null;
  attacks: Array<{
    damageDice?: string;
    damageType?: string;
    type?: string;
    attackBonus?: number;
    targetType?: string;
    maxTargets?: number;
  }>;
  spells?: UnitSpellInput[];
}

function spellTargets(spell: UnitSpellInput): number {
  if (spell.type !== "aoe") return 1;

  const dist = Array.isArray(spell.damageDistribution) ? (spell.damageDistribution as unknown[]).filter((x): x is number => typeof x === "number") : [];

  if (dist.length === 0) return TYPICAL_TARGETS;

  return dist.slice(0, TYPICAL_TARGETS).reduce((a, b) => a + b, 0) / 100;
}

function bestSpellDpr(spells: UnitSpellInput[], level: number): number {
  let best = 0;

  for (const s of spells) {
    if (s.damageType !== "damage" && s.damageType !== "all") continue;

    if (s.target === "allies") continue;

    const dice = formatSpellDamageDiceRoll(s.diceCount, s.diceType);

    if (!dice) continue;

    best = Math.max(best, (diceAverage(dice) + level) * spellTargets(s));
  }

  return best;
}

export function getUnitStats(unit: UnitStatsInput): UnitStats {
  const strMod = getAbilityModifier(unit.strength ?? 10);

  const dexMod = getAbilityModifier(unit.dexterity ?? 10);

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  let weaponDpr = 0;

  for (const a of attacks) {
    const isRanged = (a.type as string) === AttackType.RANGED;

    const avg = averageOf(parseDiceLenient((a.damageDice as string) || "1d6")) + (isRanged ? dexMod : strMod);

    const reach = a.targetType === "aoe" ? a.maxTargets || unit.maxTargets || 1 : unit.maxTargets || 1;

    const targets = isRanged ? Math.min(reach, TYPICAL_TARGETS) : 1;

    weaponDpr = Math.max(weaponDpr, avg * targets);
  }

  const dpr = Math.max(MIN_UNIT_STAT, Math.max(weaponDpr, bestSpellDpr(unit.spells ?? [], unit.level)) || diceAverage("1d6"));

  const hp = Math.max(MIN_UNIT_STAT, unit.maxHp);

  return {
    unitId: unit.id,
    name: unit.name,
    dpr,
    hp,
    kpi: dpr / hp,
    level: unit.level,
    raceId: unit.raceId ?? null,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function bestAverage(p: BattleParticipant, type: AttackType): number {
  const own = p.battleData.attacks.filter((a) => attackKindOf(a.type) === type);

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
