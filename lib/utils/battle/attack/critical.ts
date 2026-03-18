/**
 * Застосування критичних ефектів до учасника бою
 */

import { addActiveEffect } from "../battle-effects";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { BattleParticipant } from "@/types/battle";

export function applyCriticalEffect(
  participant: BattleParticipant,
  effect: CriticalEffect,
  currentRound: number,
  target?: BattleParticipant,
): BattleParticipant {
  const targetParticipant = target || participant;

  let updated = { ...targetParticipant };

  switch (effect.effect.type) {
    case "stun":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-${effect.id}-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration || 1,
              effects: [{ type: "stun", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "disarm":
      break;

    case "extra_damage":
    case "double_damage":
    case "max_damage":
    case "additional_damage":
    case "ignore_reactions":
    case "simple_miss":
    case "half_damage":
    case "provoke_opportunity_attack":
      break;

    case "advantage_next_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration || 1,
              effects: [{ type: "advantage_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "ac_debuff":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-ac-debuff-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [
                {
                  type: "ac_bonus",
                  value:
                    typeof effect.effect.value === "number"
                      ? effect.effect.value
                      : -2,
                },
              ],
            },
            currentRound,
          ),
        },
      };
      break;

    case "free_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-free-attack-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "extra_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "block_bonus_action":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-block-bonus-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "no_bonus_action", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "advantage_on_target":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-on-target-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "advantage_against_me", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "combo_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-combo-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "combo_attack_disadvantage", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "prone":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-prone-${Date.now()}`,
              name: effect.name,
              type: "condition",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "prone", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "disadvantage_next_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-disadvantage-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "disadvantage_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "lose_bonus_action":
      updated = {
        ...updated,
        actionFlags: {
          ...updated.actionFlags,
          hasUsedBonusAction: true,
        },
      };
      break;

    case "lose_reaction":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-no-reaction-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "no_reaction", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "advantage_on_self":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-on-self-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "advantage_against_me", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "lose_action":
      updated = {
        ...updated,
        actionFlags: {
          ...updated.actionFlags,
          hasUsedAction: true,
        },
      };
      break;
  }

  return updated;
}
