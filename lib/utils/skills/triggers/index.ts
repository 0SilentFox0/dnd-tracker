/**
 * Утиліти для роботи з тригерами скілів (ActiveSkill.skillTriggers).
 * Для тригерів пасивних здібностей (PassiveAbility) використовуйте lib/utils/battle/triggers.
 */

import type { SkillTriggerContext } from "@/lib/utils/battle/triggers";
import type { ActiveSkill } from "@/types/battle";
import type { BattleParticipant } from "@/types/battle";
import type { ComplexSkillTrigger, SimpleSkillTrigger, SkillTrigger } from "@/types/skill-triggers";

function evaluateSimpleTrigger(
  trigger: SimpleSkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  switch (trigger) {
    case "passive":
      return true;
    case "onBattleStart":
      return context?.currentRound === 1;
    case "startRound":
      return context?.currentRound !== undefined;
    case "endRound":
      return context?.currentRound !== undefined;
    case "beforeOwnerAttack":
    case "afterOwnerAttack":
      return context?.isOwnerAction === true;
    case "beforeEnemyAttack":
    case "afterEnemyAttack":
      return context?.isOwnerAction === false;
    case "beforeOwnerSpellCast":
    case "afterOwnerSpellCast":
      return context?.isOwnerAction === true;
    case "beforeEnemySpellCast":
    case "afterEnemySpellCast":
      return context?.isOwnerAction === false;
    case "bonusAction":
      return !participant.actionFlags.hasUsedBonusAction;
    case "onHit":
      return context?.isOwnerAction === true;
    case "onAttack":
      return context?.isOwnerAction === true;
    case "onKill":
      return context?.isOwnerAction === true;
    case "onAllyDeath":
    case "onLethalDamage":
      return true;
    case "onCast":
      return context?.isOwnerAction === true;
    case "onFirstHitTakenPerRound":
      return !participant.actionFlags.hasUsedReaction;
    case "onFirstRangedAttack":
    case "onMoraleSuccess":
    case "allyMoraleCheck":
      return true;
    default:
      return false;
  }
}

function evaluateComplexTrigger(
  trigger: ComplexSkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  if (!context?.allParticipants) return false;

  const { target, operator, value, valueType, stat } = trigger;

  const targets = target === "ally"
    ? context.allParticipants.filter(p => p.basicInfo.side === participant.basicInfo.side && p.basicInfo.id !== participant.basicInfo.id)
    : context.allParticipants.filter(p => p.basicInfo.side !== participant.basicInfo.side);

  for (const targetParticipant of targets) {
    let statValue: number;

    switch (stat) {
      case "HP":
        statValue = valueType === "percent"
          ? (targetParticipant.combatStats.currentHp / targetParticipant.combatStats.maxHp) * 100
          : targetParticipant.combatStats.currentHp;
        break;
      case "Attack":
        statValue = 0;
        break;
      case "AC":
        statValue = targetParticipant.combatStats.armorClass;
        break;
      case "Speed":
        statValue = targetParticipant.combatStats.speed;
        break;
      case "Morale":
        statValue = targetParticipant.combatStats.morale;
        break;
      case "Level":
        statValue = targetParticipant.abilities.level;
        break;
      default:
        continue;
    }

    let conditionMet = false;

    const compareValue = value;

    switch (operator) {
      case ">":
        conditionMet = statValue > compareValue;
        break;
      case "<":
        conditionMet = statValue < compareValue;
        break;
      case "=":
        conditionMet = statValue === compareValue;
        break;
      case "<=":
        conditionMet = statValue <= compareValue;
        break;
      case ">=":
        conditionMet = statValue >= compareValue;
        break;
    }

    if (conditionMet) return true;
  }

  return false;
}

export function checkTriggerModifiers(
  trigger: SkillTrigger,
  skillId: string,
  skillUsageCounts?: Record<string, number>,
): boolean {
  const modifiers = trigger.modifiers;

  if (!modifiers) return true;

  if (modifiers.oncePerBattle && skillUsageCounts) {
    if ((skillUsageCounts[skillId] ?? 0) >= 1) return false;
  }

  if (modifiers.twicePerBattle && skillUsageCounts) {
    if ((skillUsageCounts[skillId] ?? 0) >= 2) return false;
  }

  if (modifiers.probability !== undefined && Math.random() >= modifiers.probability) return false;

  return true;
}

export function evaluateSkillTrigger(
  trigger: SkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  if (trigger.type === "simple") {
    return evaluateSimpleTrigger(trigger.trigger, participant, context);
  }

  return evaluateComplexTrigger(trigger, participant, context);
}

export function getSkillsByTrigger(
  activeSkills: ActiveSkill[],
  triggerType: SimpleSkillTrigger,
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  context?: Pick<SkillTriggerContext, "target" | "currentRound" | "isOwnerAction">,
  skillUsageCounts?: Record<string, number>,
): ActiveSkill[] {
  return activeSkills.filter((skill) => {
    if (!skill.skillTriggers || skill.skillTriggers.length === 0) return false;

    return skill.skillTriggers.some((trigger) => {
      if (trigger.type === "simple" && trigger.trigger === triggerType) {
        const triggerOk = evaluateSimpleTrigger(trigger.trigger, participant, { ...context, allParticipants });

        if (!triggerOk) return false;

        return checkTriggerModifiers(trigger, skill.skillId, skillUsageCounts);
      }

      if (trigger.type === "complex") {
        const triggerOk = evaluateComplexTrigger(trigger, participant, { ...context, allParticipants });

        if (!triggerOk) return false;

        return checkTriggerModifiers(trigger, skill.skillId, skillUsageCounts);
      }

      return false;
    });
  });
}
