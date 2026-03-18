/**
 * Контр-удар (Reaction): перевірка та виконання
 */

import { getDiceAverage } from "../balance";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { BattleParticipant } from "@/types/battle";

export function getCounterDamagePercent(defender: BattleParticipant): number {
  let total = 0;

  for (const skill of defender.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (
        effect.stat === "counter_damage" &&
        effect.isPercentage &&
        typeof effect.value === "number"
      ) {
        total += effect.value;
      }
    }
  }

  return total;
}

export function canPerformReaction(defender: BattleParticipant): boolean {
  if (defender.actionFlags.hasUsedReaction) return false;

  const counterPercent = getCounterDamagePercent(defender);

  if (counterPercent <= 0) return false;

  const hasCounterSkill = defender.battleData.activeSkills.some((skill) =>
    skill.effects.some(
      (e) =>
        e.stat === "counter_damage" &&
        e.isPercentage &&
        typeof e.value === "number" &&
        e.value > 0,
    ),
  );

  return hasCounterSkill;
}

export function performReaction(
  defender: BattleParticipant,
  attacker: BattleParticipant,
): {
  damage: number;
  baseDamage: number;
  bonusPercent: number;
  message: string;
  updatedDefender: BattleParticipant;
} {
  const reactionAttack = defender.battleData.attacks[0];

  if (!reactionAttack) {
    return {
      damage: 0,
      baseDamage: 0,
      bonusPercent: 0,
      message: "Немає доступної атаки для контр-удару",
      updatedDefender: defender,
    };
  }

  const diceMatch = reactionAttack.damageDice?.match(/(\d+)d(\d+)/);

  let baseDamage = 0;

  if (diceMatch) {
    const diceCount = parseInt(diceMatch[1], 10);

    const diceSize = parseInt(diceMatch[2], 10);

    baseDamage = Math.floor((diceCount * (diceSize + 1)) / 2);
  }

  const statModifier =
    reactionAttack.type === AttackType.MELEE
      ? Math.floor((defender.abilities.strength - 10) / 2)
      : Math.floor((defender.abilities.dexterity - 10) / 2);

  baseDamage += statModifier;

  if (defender.basicInfo.sourceType === "character") {
    baseDamage += defender.abilities.level;

    const heroDice = getHeroDamageDiceForLevel(
      defender.abilities.level,
      reactionAttack.type as AttackType,
    );

    baseDamage += getDiceAverage(heroDice);
  }

  const counterPercent = getCounterDamagePercent(defender);

  const multiplier = counterPercent > 0 ? 1 + counterPercent / 100 : 1.15;

  const reactionDamage = Math.floor(baseDamage * multiplier);

  const updatedDefender: BattleParticipant = {
    ...defender,
    actionFlags: {
      ...defender.actionFlags,
      hasUsedReaction: true,
    },
  };

  return {
    damage: reactionDamage,
    baseDamage,
    bonusPercent: counterPercent,
    message: `${defender.basicInfo.name} виконує контр-удар на ${attacker.basicInfo.name}!`,
    updatedDefender,
  };
}
