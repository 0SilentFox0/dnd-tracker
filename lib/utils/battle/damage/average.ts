import { heroAttackDamageParts, heroDamageContext } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiers } from "./index";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { attackAbilityLabelFor, attackDamageModifier, isFiveE } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { diceAverage } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export interface AverageDamage {
  total: number;
  statLabel: string;
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
    statLabel: attackAbilityLabelFor(p, attack),
  });

  const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage);

  return { total: dm.damage, statLabel: attackAbilityLabelFor(p, attack), weaponAvg, heroDice, heroPart: isHero && !isFiveE(p) ? p.abilities.level + heroDiceAvg : 0, statMod, steps: calc.steps, multiplier: dm.multiplier };
}
