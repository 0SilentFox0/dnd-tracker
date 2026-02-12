/**
 * Утиліта для обчислення breakdown урону (для превью в UI).
 * Використовує ту саму логіку, що й processAttack, але без застосування до цілі.
 */

import { calculateDamageWithModifiers } from "./battle-damage-calculations";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "./battle-triggers";
import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import {
  getDiceAverage,
  getTotalDiceCount,
  mergeDiceFormulas,
} from "@/lib/utils/battle/balance-calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export interface DamageBreakdownResult {
  breakdown: string[];
  totalDamage: number;
}

export interface ComputeDamageBreakdownParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  /** Якщо true — застосовуємо подвійний урон від криту */
  isCritical?: boolean;
}

export function computeDamageBreakdown(
  params: ComputeDamageBreakdownParams,
): DamageBreakdownResult {
  const {
    attacker,
    target,
    attack,
    damageRolls,
    allParticipants,
    isCritical = false,
  } = params;

  const baseDamage = damageRolls.reduce((sum, roll) => sum + roll, 0);
  const typeStr = String(attack.type ?? "").toLowerCase();
  const isMelee = typeStr === "melee";
  const attackTypeSafe: AttackType = isMelee
    ? AttackType.MELEE
    : AttackType.RANGED;
  const statModifier = isMelee
    ? Math.floor((attacker.abilities.strength - 10) / 2)
    : Math.floor((attacker.abilities.dexterity - 10) / 2);

  const isHero = attacker.basicInfo.sourceType === "character";
  const heroLevelPart = isHero ? attacker.abilities.level : 0;
  const heroDiceNotation = isHero
    ? getHeroDamageDiceForLevel(
        attacker.abilities.level,
        attackTypeSafe,
      )
    : "";
  const weaponDiceCount = getTotalDiceCount(attack.damageDice ?? "");
  const heroDiceCount = getTotalDiceCount(heroDiceNotation);
  const fullDiceCount = weaponDiceCount + heroDiceCount;
  const clientSentFullRolls =
    isHero && fullDiceCount > 0 && damageRolls.length === fullDiceCount;
  const heroDicePart =
    heroDiceNotation && !clientSentFullRolls
      ? getDiceAverage(heroDiceNotation)
      : 0;

  const onAttackAbilities = getPassiveAbilitiesByTrigger(
    attacker,
    "on_attack",
  );
  const additionalDamageModifiers: Array<{ type: string; value: number }> = [];
  for (const ability of onAttackAbilities) {
    if (
      checkTriggerCondition(ability.trigger, attacker, {
        target,
        allParticipants,
      })
    ) {
      if (ability.effect.type === "additional_damage") {
        const modifierType =
          (ability.effect as { damageType?: string }).damageType || "fire";
        const modifierValue = ability.effect.value || 0;
        additionalDamageModifiers.push({ type: modifierType, value: modifierValue });
      }
    }
  }

  const weaponDiceNotationForBreakdown = clientSentFullRolls
    ? mergeDiceFormulas(attack.damageDice ?? "", heroDiceNotation)
    : undefined;
  const heroDiceNotationForBreakdown = clientSentFullRolls
    ? ""
    : heroDiceNotation;

  const damageCalculation = calculateDamageWithModifiers(
    attacker,
    baseDamage,
    statModifier,
    attackTypeSafe,
    {
      allParticipants,
      additionalDamage: additionalDamageModifiers,
      heroLevelPart,
      heroDicePart,
      heroDiceNotation: heroDiceNotationForBreakdown,
      weaponDiceNotation:
        weaponDiceNotationForBreakdown || attack.damageDice || undefined,
    },
  );

  let totalDamage = damageCalculation.totalDamage;
  const breakdown = [...damageCalculation.breakdown];

  if (isCritical) {
    totalDamage *= 2;
    breakdown.push(`──────────`);
    breakdown.push(`× 2 (крит) = ${totalDamage} урону`);
  }

  return {
    breakdown,
    totalDamage,
  };
}
