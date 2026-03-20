/**
 * Розрахунок бонусів урону з артефактів та пасивних здібностей
 */

import { matchesAttackType } from "../common";
import { hasAnyAllyLowHp } from "../participant";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function calculateArtifactDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const artifact of attacker.battleData.equippedArtifacts) {
    for (const modifier of artifact.modifiers) {
      if (
        modifier.type.toLowerCase().includes("damage") &&
        matchesAttackType(modifier.type, attackType)
      ) {
        const raw = modifier.value;

        const num =
          typeof raw === "number" ? raw : Number.parseFloat(String(raw));

        const v = Number.isFinite(num) ? num : 0;

        if (modifier.isPercentage) {
          percent += v;
        } else {
          flat += v;
        }
      }
    }
  }

  return { percent, flat };
}

export function calculatePassiveAbilityDamageBonus(
  attacker: BattleParticipant,
  context?: {
    allParticipants?: BattleParticipant[];
    damage?: number;
  },
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const passive of attacker.battleData.passiveAbilities) {
    if (
      passive.effect.type === "modify_damage" ||
      passive.effect.type === "damage_bonus"
    ) {
      if (passive.trigger.type === "ally_low_hp" && context?.allParticipants) {
        const threshold =
          passive.trigger.lowHpThresholdPercent ??
          BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT;

        if (hasAnyAllyLowHp(attacker, context.allParticipants, threshold)) {
          const value = passive.effect.value || 0;

          if (typeof value === "number") {
            if (value > 1 && value < 100) {
              percent += value;
            } else if (value <= 1) {
              percent += value * 100;
            } else {
              flat += value;
            }
          }
        }
      }
    }
  }

  return { percent, flat };
}
