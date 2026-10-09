import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "./dpr";
import { damageKey } from "./resist";

import { AttackType } from "@/lib/constants/battle";
import { MIN_UNIT_STAT, TYPICAL_TARGETS } from "@/lib/constants/battle-balance";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { applyHeroDmDamageMultiplier, heroMagicMultiplier } from "@/lib/utils/battle/damage/hero-dm-multiplier";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { averageOf, diceAverage, parseDiceLenient } from "@/lib/utils/common/dice";
import type { BranchLevel } from "@/lib/utils/skills/progression";
import { spellDice } from "@/lib/utils/spells/model/dice";
import { readSpellDefinition, spellEffects, spellTargeting } from "@/lib/utils/spells/model/read";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
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
  ac?: number;
  attackBonus?: number;
  /** Best weapon's `kind:damageType` (party profile when the unit is an ally). */
  damageKey?: string;
  resist?: Record<string, number>;
}

export interface GetCharacterStatsParams {
  participant: BattleParticipant;
  branchLevels?: Record<string, BranchLevel> | null;
  magicMainSkillIds?: Set<string> | null;
  /** Branches tied to a spell school: their DPR comes from spells, which ignore AC. */
  spellSchoolIds?: Set<string> | null;
}

export interface UnitSpellInput {
  dice?: number | null;
  targeting?: unknown;
  spellEffects?: unknown;
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
  armorClass?: number;
  proficiencyBonus?: number;
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

function spellTargets(targeting: SpellTargeting): number {
  switch (targeting.kind) {
    case "enemy":
      return 1;
    case "area":
      return targeting.side === "enemy" ? Math.min(targeting.maxTargets, TYPICAL_TARGETS) : 0;
    case "allEnemies":
    case "everyone":
      return TYPICAL_TARGETS;
    default:
      return 0;
  }
}

function bestSpellDpr(spells: UnitSpellInput[], level: number): number {
  let best = 0;

  for (const [index, s] of spells.entries()) {
    const row = { id: String(index), dice: s.dice, targeting: s.targeting, spellEffects: s.spellEffects };

    const targets = spellTargets(spellTargeting(row));

    const damage = spellEffects(row).find((e) => e.kind === "dealDamage");

    const dice = spellDice({ kind: "unit", level }, { dice: readSpellDefinition(row).dice, groupId: null }, () => null);

    if (!damage || targets === 0 || dice.count === 0) continue;

    const share = damage.falloff ? damage.falloff.slice(0, targets).reduce((a, b) => a + b, 0) / 100 : targets;

    best = Math.max(best, dice.count * 3.5 * share);
  }

  return best;
}

export function getUnitStats(unit: UnitStatsInput): UnitStats {
  const strMod = getAbilityModifier(unit.strength ?? 10);

  const dexMod = getAbilityModifier(unit.dexterity ?? 10);

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  let weaponDpr = 0;

  let weaponToHit: number | undefined;

  let weaponKey: string | undefined;

  for (const a of attacks) {
    const isRanged = (a.type as string) === AttackType.RANGED;

    // A hit deals only the rolled dice (`computeHitDamage`): the "+N" of `damageDice` never lands, so it is not power.
    const avg = averageOf({ ...parseDiceLenient((a.damageDice as string) || "1d6"), flat: 0 }) + (isRanged ? dexMod : strMod);

    const reach = a.targetType === "aoe" ? a.maxTargets || unit.maxTargets || 1 : unit.maxTargets || 1;

    const targets = isRanged ? Math.min(reach, TYPICAL_TARGETS) : 1;

    if (weaponToHit === undefined || avg * targets > weaponDpr) {
      weaponDpr = Math.max(weaponDpr, avg * targets);
      weaponToHit = (a.attackBonus ?? 0) + (isRanged ? dexMod : strMod) + (unit.proficiencyBonus ?? 0);
      weaponKey = damageKey(isRanged ? AttackType.RANGED : AttackType.MELEE, a.damageType);
    }
  }

  const spellDpr = bestSpellDpr(unit.spells ?? [], unit.level);

  const dpr = Math.max(MIN_UNIT_STAT, Math.max(weaponDpr, spellDpr) || diceAverage("1d6"));

  const weaponLeads = weaponToHit !== undefined && weaponDpr >= spellDpr;

  const attackBonus = unit.proficiencyBonus !== undefined && weaponLeads ? weaponToHit : undefined;

  const hp = Math.max(MIN_UNIT_STAT, unit.maxHp);

  return {
    unitId: unit.id,
    name: unit.name,
    dpr,
    hp,
    kpi: dpr / hp,
    level: unit.level,
    raceId: unit.raceId ?? null,
    ...(unit.armorClass !== undefined && { ac: unit.armorClass }),
    ...(attackBonus !== undefined && { attackBonus }),
    ...(weaponLeads && weaponKey && { damageKey: weaponKey }),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function bestAttack(p: BattleParticipant, type: AttackType): { avg: number; attack: BattleAttack } {
  const own = p.battleData.attacks.filter((a) => attackKindOf(a.type) === type);

  const options: BattleAttack[] = own.length > 0 ? own : [{ name: "", type, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack];

  return options.map((attack) => ({ avg: averageAttackDamage(p, attack, [p]).total, attack })).reduce((best, o) => (o.avg > best.avg ? o : best));
}

export function getCharacterStats({ participant, branchLevels, magicMainSkillIds, spellSchoolIds }: GetCharacterStatsParams): {
  dpr: number;
  hp: number;
  kpi: number;
  spellDpr: number;
  toHit: number;
  ac: number;
  weaponDpr: number;
  damageKey: string;
  dprBreakdown: CharacterDprBreakdown;
} {
  const melee = bestAttack(participant, AttackType.MELEE);

  const ranged = bestAttack(participant, AttackType.RANGED);

  const meleeAvg = melee.avg;

  const rangedAvg = ranged.avg;

  const physicalDpr = Math.max(meleeAvg, rangedAvg);

  const best = (rangedAvg > meleeAvg ? ranged : melee).attack;

  const toHit = calculateAttackBonus(participant, best, [participant]);

  const magicIds = new Set([...(magicMainSkillIds ?? []), ...(spellSchoolIds ?? [])]);

  const racialMagicPercent = collectModifiers([participant], participant.basicInfo.id, { damage: { kind: "magic" } }).percent;

  const spellDpr = getSpellDprFromBranchLevels(branchLevels ?? {}, magicIds) * heroMagicMultiplier(participant) * (1 + racialMagicPercent / 100);

  const bestKindMultiplier = applyHeroDmDamageMultiplier(participant, attackKindOf(best.type), 1).multiplier;

  const nonMagicDpr = getNonMagicBranchDpr(branchLevels ?? {}, magicIds) * bestKindMultiplier;

  const dpr = physicalDpr + spellDpr + nonMagicDpr;

  const weaponBranches = Object.fromEntries(Object.entries(branchLevels ?? {}).filter(([id]) => !spellSchoolIds?.has(id)));

  const weaponDpr = physicalDpr + getNonMagicBranchDpr(weaponBranches, magicIds) * bestKindMultiplier;

  const hp = participant.combatStats.maxHp;

  return {
    dpr,
    hp,
    kpi: hp > 0 ? dpr / hp : 0,
    spellDpr,
    toHit,
    ac: getEffectiveArmorClass(participant),
    weaponDpr,
    damageKey: damageKey(attackKindOf(best.type), best.damageType),
    dprBreakdown: {
      physicalDpr,
      meleeAvg,
      rangedAvg,
      spellDpr,
      nonMagicDpr,
      logLines: [
        `Ближній бій ${round1(meleeAvg)}, дальній ${round1(rangedAvg)} → фізичний DPR = ${round1(physicalDpr)}`,
        `Школа магії (найвищий рівень): +${round1(spellDpr)} DPR`,
        `Немагічні основні навички (сума): +${round1(nonMagicDpr)} DPR`,
        `Разом DPR = ${round1(physicalDpr)} + ${round1(spellDpr)} + ${round1(nonMagicDpr)} = ${round1(dpr)}`,
      ],
    },
  };
}
