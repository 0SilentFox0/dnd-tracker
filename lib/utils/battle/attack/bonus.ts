/**
 * Бонус до атаки, Advantage, Disadvantage
 */

import { getParticipantExtras } from "../participant";

import { AttackType } from "@/lib/constants/battle";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function calculateAttackBonus(
  attacker: BattleParticipant,
  attack: BattleAttack,
): number {
  let bonus = attack.attackBonus || 0;

  const statModifier =
    attack.type === AttackType.MELEE
      ? attacker.abilities.modifiers.strength
      : attacker.abilities.modifiers.dexterity;

  bonus += statModifier;
  bonus += attacker.abilities.proficiencyBonus;

  for (const effect of attacker.battleData.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (
        effectDetail.type === "attack_bonus" ||
        effectDetail.type === "attack"
      ) {
        bonus += effectDetail.value || 0;
      }
    }
  }

  for (const artifact of attacker.battleData.equippedArtifacts) {
    for (const modifier of artifact.modifiers) {
      if (
        modifier.type.toLowerCase().includes("attack") &&
        !modifier.isPercentage
      ) {
        const raw = modifier.value;

        const num =
          typeof raw === "number" ? raw : Number.parseFloat(String(raw));

        bonus += Number.isFinite(num) ? num : 0;
      }
    }
  }

  return bonus;
}

export function hasAdvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
): boolean {
  const extras = getParticipantExtras(attacker);

  if (extras.advantageOnAllRolls) return true;

  if (
    attacker.abilities.race?.toLowerCase().includes("elf") &&
    attack.type === AttackType.RANGED
  ) {
    return true;
  }

  for (const effect of attacker.battleData.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (
        effectDetail.type === "advantage" ||
        effectDetail.type === "advantage_attack"
      ) {
        return true;
      }
    }
  }

  return false;
}

export function hasDisadvantage(
  attacker: BattleParticipant,
  _attack: BattleAttack,
): boolean {
  void _attack;
  for (const effect of attacker.battleData.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (effectDetail.type === "disadvantage_attack") {
        return true;
      }
    }
  }

  return false;
}
