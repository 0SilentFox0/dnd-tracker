/**
 * Контр-удар (Reaction): перевірка та виконання
 */

import { getDiceAverage } from "../balance";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";

type IncomingAttackType = AttackType | "magic";

function counterFlags(defender: BattleParticipant, participants: BattleParticipant[]) {
  return findFlags(withSelf(participants, defender), defender.basicInfo.id, "counterAttack");
}

export function getCounterDamagePercent(defender: BattleParticipant, participants: BattleParticipant[] = [defender]): number {
  return counterFlags(defender, participants).reduce((sum, f) => sum + f.bonusPercent, 0);
}

export function canPerformReaction(
  defender: BattleParticipant,
  incomingAttackType: IncomingAttackType = AttackType.MELEE,
  participants: BattleParticipant[] = [defender],
): boolean {
  if (defender.actionFlags.hasUsedReaction) return false;

  const kind = incomingAttackType === "magic" ? "magic" : incomingAttackType === AttackType.RANGED ? "ranged" : "melee";

  return counterFlags(defender, participants).some((f) => f.attackKinds.includes(kind));
}

export function performReaction(
  defender: BattleParticipant,
  attacker: BattleParticipant,
  participants: BattleParticipant[] = [defender],
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
    getAttackAbilityModifier(defender.abilities, reactionAttack.type);

  baseDamage += statModifier;

  if (defender.basicInfo.sourceType === "character") {
    baseDamage += defender.abilities.level;

    const heroDice = getHeroDamageDiceForLevel(
      defender.abilities.level,
      reactionAttack.type as AttackType,
    );

    baseDamage += getDiceAverage(heroDice);
  }

  const counterPercent = getCounterDamagePercent(defender, participants);

  const reactionDamage = Math.floor(baseDamage * (1 + counterPercent / 100));

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
  participants: BattleParticipant[] = [defender],
): { damage: number; baseDamage: number; bonusPercent: number } {
  const defenderCopy = {
    ...defender,
    actionFlags: { ...defender.actionFlags, hasUsedReaction: false },
  };

  const result = performReaction(defenderCopy, _attacker, participants);

  return {
    damage: result.damage,
    baseDamage: result.baseDamage,
    bonusPercent: result.bonusPercent,
  };
}
