/**
 * Контр-удар (Reaction): перевірка та виконання
 */

import { getDiceAverage } from "../balance";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { BattleParticipant } from "@/types/battle";
import type { SimpleSkillTriggerConfig } from "@/types/skill-triggers";

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

type IncomingAttackType = AttackType | "magic";

/** Чи підходить тип вхідної атаки під налаштування тригера контратаки */
function matchResponseType(
  responseType: "melee" | "ranged" | "magic" | undefined,
  incomingAttackType: IncomingAttackType,
): boolean {
  const expected = responseType ?? "melee";

  if (expected === "magic") return incomingAttackType === "magic";

  return incomingAttackType === expected;
}

/** Чи є у учасника скіл з тригером «перший удар за раунд» для потрібного типу атаки */
function hasOnFirstHitTakenPerRoundTrigger(
  defender: BattleParticipant,
  incomingAttackType: IncomingAttackType,
): boolean {
  const triggers = defender.battleData.activeSkills.flatMap(
    (s) => s.skillTriggers ?? [],
  );

  return triggers.some((t) => {
    if (t.type !== "simple") return false;

    const simple = t as SimpleSkillTriggerConfig;

    if (simple.trigger !== "onFirstHitTakenPerRound") return false;

    return matchResponseType(simple.modifiers?.responseType, incomingAttackType);
  });
}

/** Чи є у учасника скіл з ефектом counter_damage */
function hasCounterDamageEffect(defender: BattleParticipant): boolean {
  return defender.battleData.activeSkills.some((skill) =>
    skill.effects.some(
      (e) =>
        e.stat === "counter_damage" &&
        e.isPercentage &&
        typeof e.value === "number" &&
        e.value > 0,
    ),
  );
}

export function canPerformReaction(
  defender: BattleParticipant,
  incomingAttackType: IncomingAttackType = AttackType.MELEE,
): boolean {
  if (defender.actionFlags.hasUsedReaction) return false;

  const hasTrigger = hasOnFirstHitTakenPerRoundTrigger(
    defender,
    incomingAttackType,
  );

  const hasCounterEffect = hasCounterDamageEffect(defender);

  if (hasTrigger || (hasCounterEffect && incomingAttackType === AttackType.MELEE)) {
    const counterPercent = getCounterDamagePercent(defender);

    return counterPercent >= 0;
  }

  return false;
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

  const multiplier =
    counterPercent > 0 ? 1 + counterPercent / 100 : 1.15;

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

/**
 * Розраховує суму урону відповіді (контратаки) без зміни стану учасника.
 * Використовується в UI для підказки «Відповідь цілі».
 */
export function getReactionDamageAmount(
  defender: BattleParticipant,
  _attacker: BattleParticipant,
): { damage: number; baseDamage: number; bonusPercent: number } {
  const defenderCopy = {
    ...defender,
    actionFlags: { ...defender.actionFlags, hasUsedReaction: false },
  };

  const result = performReaction(defenderCopy, _attacker);

  return {
    damage: result.damage,
    baseDamage: result.baseDamage,
    bonusPercent: result.bonusPercent,
  };
}
