/**
 * Утиліти для роботи з тригерами скілів (ActiveSkill.skillTriggers).
 * Для тригерів пасивних здібностей (PassiveAbility) використовуйте battle-triggers.ts.
 * Спільний контекст: lib/utils/battle/trigger-context.ts
 */

import type { SkillTriggerContext } from "@/lib/utils/battle/trigger-context";
import type { ActiveSkill } from "@/types/battle";
import type { BattleParticipant } from "@/types/battle";
import type { ComplexSkillTrigger, SimpleSkillTrigger, SkillTrigger } from "@/types/skill-triggers";

/**
 * Перевіряє чи виконана умова простого тригера
 */
function evaluateSimpleTrigger(
  trigger: SimpleSkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  switch (trigger) {
    case "passive":
      // Пасивний — завжди активний (застосовується при ініціалізації)
      return true;

    case "onBattleStart":
      // Спрацьовує на початку бою (раунд 1, startRound)
      return context?.currentRound === 1;

    case "startRound":
      // Перевіряється на початку раунду
      return context?.currentRound !== undefined;
    
    case "endRound":
      // Перевіряється в кінці раунду
      return context?.currentRound !== undefined;
    
    case "beforeOwnerAttack":
    case "afterOwnerAttack":
      // Перевіряється перед/після атаки власника
      return context?.isOwnerAction === true;
    
    case "beforeEnemyAttack":
    case "afterEnemyAttack":
      // Перевіряється перед/після атаки ворога
      return context?.isOwnerAction === false;
    
    case "beforeOwnerSpellCast":
    case "afterOwnerSpellCast":
      // Перевіряється перед/після касту заклинання власника
      return context?.isOwnerAction === true;
    
    case "beforeEnemySpellCast":
    case "afterEnemySpellCast":
      // Перевіряється перед/після касту заклинання ворога
      return context?.isOwnerAction === false;
    
    case "bonusAction":
      // Бонусна дія — завжди доступна якщо не використана
      return !participant.actionFlags.hasUsedBonusAction;

    case "onHit":
      // Коли атака влучає — перевіряється після атаки
      return context?.isOwnerAction === true;

    case "onAttack":
      // Коли атакує — перевіряється перед/під час атаки
      return context?.isOwnerAction === true;

    case "onKill":
      // Коли вбиває ціль — перевіряється після вбивства (потребує контексту)
      return context?.isOwnerAction === true;

    case "onAllyDeath":
      // Коли гине союзник — перевіряється після смерті
      return true;

    case "onLethalDamage":
      // Коли отримує летальну шкоду — перевіряється при застосуванні урону
      return true;

    case "onCast":
      // Коли кастує заклинання
      return context?.isOwnerAction === true;

    case "onFirstHitTakenPerRound":
      // Перший удар по цьому учаснику за раунд
      return !participant.actionFlags.hasUsedReaction;

    case "onFirstRangedAttack":
      // Перша дальня атака за бій (перевіряється в спеціальному контексті)
      return true;

    case "onMoraleSuccess":
      // При успішній перевірці моралі
      return true;

    case "allyMoraleCheck":
      // При перевірці моралі союзника
      return true;

    default:
      return false;
  }
}

/**
 * Перевіряє чи виконана умова складного тригера
 */
function evaluateComplexTrigger(
  trigger: ComplexSkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  if (!context?.allParticipants) return false;

  const { target, operator, value, valueType, stat } = trigger;

  // Визначаємо ціль для перевірки
  const targets = target === "ally"
    ? context.allParticipants.filter(p => p.basicInfo.side === participant.basicInfo.side && p.basicInfo.id !== participant.basicInfo.id)
    : context.allParticipants.filter(p => p.basicInfo.side !== participant.basicInfo.side);

  // Перевіряємо кожну ціль
  for (const targetParticipant of targets) {
    let statValue: number;

    // Отримуємо значення статистики
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

    // Перевіряємо умову
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

    if (conditionMet) {
      return true;
    }
  }

  return false;
}

/**
 * Перевіряє модифікатори тригера (ймовірність, oncePerBattle, тощо)
 * Повертає true якщо тригер дозволений
 */
export function checkTriggerModifiers(
  trigger: SkillTrigger,
  skillId: string,
  skillUsageCounts?: Record<string, number>,
): boolean {
  const modifiers = trigger.modifiers;

  if (!modifiers) return true;

  // Перевірка oncePerBattle
  if (modifiers.oncePerBattle && skillUsageCounts) {
    const used = skillUsageCounts[skillId] ?? 0;

    if (used >= 1) return false;
  }

  // Перевірка twicePerBattle
  if (modifiers.twicePerBattle && skillUsageCounts) {
    const used = skillUsageCounts[skillId] ?? 0;

    if (used >= 2) return false;
  }

  // Перевірка ймовірності
  if (modifiers.probability !== undefined) {
    if (Math.random() >= modifiers.probability) return false;
  }

  return true;
}

/**
 * Перевіряє чи тригер скіла виконаний
 */
export function evaluateSkillTrigger(
  trigger: SkillTrigger,
  participant: BattleParticipant,
  context?: SkillTriggerContext
): boolean {
  if (trigger.type === "simple") {
    return evaluateSimpleTrigger(trigger.trigger, participant, context);
  } else {
    return evaluateComplexTrigger(trigger, participant, context);
  }
}

/**
 * Отримує всі скіли з певним тригером
 */
export function getSkillsByTrigger(
  activeSkills: ActiveSkill[],
  triggerType: SimpleSkillTrigger,
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  context?: Pick<SkillTriggerContext, "target" | "currentRound" | "isOwnerAction">,
  skillUsageCounts?: Record<string, number>,
): ActiveSkill[] {
  return activeSkills.filter((skill) => {
    if (!skill.skillTriggers || skill.skillTriggers.length === 0) {
      return false;
    }

    // Перевіряємо чи є тригер з потрібним типом
    return skill.skillTriggers.some((trigger) => {
      if (trigger.type === "simple" && trigger.trigger === triggerType) {
        // Для простих тригерів перевіряємо умову
        const triggerOk = evaluateSimpleTrigger(trigger.trigger, participant, {
          ...context,
          allParticipants,
        });

        if (!triggerOk) return false;

        // Перевіряємо модифікатори
        return checkTriggerModifiers(trigger, skill.skillId, skillUsageCounts);
      } else if (trigger.type === "complex") {
        // Для складних тригерів перевіряємо умову
        const triggerOk = evaluateComplexTrigger(trigger, participant, {
          ...context,
          allParticipants,
        });

        if (!triggerOk) return false;

        return checkTriggerModifiers(trigger, skill.skillId, skillUsageCounts);
      }

      return false;
    });
  });
}
