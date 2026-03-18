/**
 * Утиліти для перевірки тригерів пасивних здібностей (PassiveAbility).
 * Для тригерів скілів використовуйте lib/utils/skills/triggers.
 */

import { hasAnyAllyLowHp } from "../participant";
import type { TriggerContextBase } from "./context";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { BattleParticipant, PassiveAbility } from "@/types/battle";

export type { SkillTriggerContext,TriggerContextBase } from "./context";
export type { TriggerContext } from "./evaluator";
export { evaluateTrigger } from "./evaluator";

export function checkTriggerCondition(
  trigger: PassiveAbility["trigger"],
  participant: BattleParticipant,
  context?: TriggerContextBase
): boolean {
  if (trigger.type === "always") return true;

  if (trigger.chance !== undefined) return true;

  if (trigger.type === "ally_low_hp" && context?.allParticipants) {
    const threshold = trigger.lowHpThresholdPercent ?? BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT;

    return hasAnyAllyLowHp(participant, context.allParticipants, threshold);
  }

  return false;
}

export function getPassiveAbilitiesByTrigger(
  participant: BattleParticipant,
  triggerType: PassiveAbility["trigger"]["type"]
): PassiveAbility[] {
  return participant.battleData.passiveAbilities.filter(
    (ability) => ability.trigger.type === triggerType
  );
}

export function evaluateCondition(
  condition: string,
  participant: BattleParticipant,
  context?: TriggerContextBase
): boolean {
  if (condition.includes("ally_hp") && context?.allParticipants) {
    const threshold = parseFloat(condition.match(/(\d+)%?/)?.[1] || String(BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT));

    return hasAnyAllyLowHp(participant, context.allParticipants, threshold);
  }

  return false;
}
