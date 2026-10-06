import { heroAttackDamageParts } from "./hero-damage";
import { applyHeroDmDamageMultiplier } from "./hero-dm-multiplier";
import { calculateDamageWithModifiers } from "./index";

import { AttackType } from "@/lib/constants/battle";
import { attackAbilityLabel, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
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
  const type = attack.type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE;

  const isHero = p.basicInfo.sourceType === "character";

  const { weaponDice, heroDice } = heroAttackDamageParts(p, attack);

  const heroDiceAvg = diceAverage(heroDice);

  const weaponAvg = diceAverage(weaponDice);

  const statMod = getAttackAbilityModifier(p.abilities, type);

  const calc = calculateDamageWithModifiers(p, weaponAvg, statMod, type, {
    allParticipants: all,
    heroLevelPart: isHero ? p.abilities.level : 0,
    heroDicePart: heroDiceAvg,
    heroDiceNotation: heroDice,
    weaponDiceNotation: attack.damageDice ?? undefined,
    statLabel: attackAbilityLabel(p.abilities, type),
  });

  const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage);

  return { total: dm.damage, statLabel: attackAbilityLabel(p.abilities, type), weaponAvg, heroDice, heroPart: isHero ? p.abilities.level + heroDiceAvg : 0, statMod, steps: calc.steps, multiplier: dm.multiplier };
}
