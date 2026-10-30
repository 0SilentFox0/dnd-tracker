import { heroAttackDamageParts, heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiers } from "./index";
import { WEAPON_FLAT_LABEL } from "./weapon-flat";

import type { AbilityKey } from "@/lib/constants/abilities";
import { ParticipantSourceType } from "@/lib/constants/battle";
import { attackAbilityFor, attackDamageModifier, isFiveE } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { diceAverage } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export interface AverageDamage {
  total: number;
  statKey: AbilityKey;
  weaponAvg: number;
  heroDice: string;
  heroPart: number;
  statMod: number;
  steps: DamageStep[];
  multiplier: number;
}

export function averageAttackDamage(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]): AverageDamage {
  const type = attackKindOf(attack.type);

  const isHero = p.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

  const { weaponDice, heroDice } = heroAttackDamageParts(p, attack);

  const heroDiceAvg = diceAverage(heroDice);

  const weaponAvg = diceAverage(weaponDice);

  const statMod = attackDamageModifier(p, attack, all);

  const calc = calculateDamageWithModifiers(p, weaponAvg, statMod, type, {
    allParticipants: all,
    heroLevelPart: heroDamageContext(p, attack, []).heroLevelPart,
    heroDicePart: heroDiceAvg,
    heroDiceNotation: heroDice,
    weaponDiceNotation: attack.damageDice ?? undefined,
    statKey: attackAbilityFor(p, attack),
  });

  const bonus = attack.damageBonus ?? 0;

  const steps = bonus ? [...calc.steps, { label: WEAPON_FLAT_LABEL, side: "attacker" as const, kind: "flat" as const, value: bonus, after: calc.totalDamage + bonus }] : calc.steps;

  const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage + bonus);

  return { total: dm.damage, statKey: attackAbilityFor(p, attack), weaponAvg, heroDice, heroPart: isHero && !isFiveE(p) ? p.abilities.level + heroDiceAvg : 0, statMod, steps, multiplier: dm.multiplier };
}
