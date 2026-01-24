/**
 * Утиліти для роботи з тригерами скілів
 */

import type { ActiveSkill } from "@/types/battle";
import type { BattleParticipant } from "@/types/battle";
import type { ComplexSkillTrigger,SimpleSkillTrigger, SkillTrigger } from "@/types/skill-triggers";

/**
 * Перевіряє чи виконана умова простого тригера
 */
function evaluateSimpleTrigger(
  trigger: SimpleSkillTrigger,
  participant: BattleParticipant,
  context?: {
    target?: BattleParticipant;
    allParticipants?: BattleParticipant[];
    currentRound?: number;
    isOwnerAction?: boolean;
  }
): boolean {
  switch (trigger) {
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
      // Бонусна дія - завжди доступна якщо не використана
      return !participant.actionFlags.hasUsedBonusAction;
    
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
  context?: {
    target?: BattleParticipant;
    allParticipants?: BattleParticipant[];
  }
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
        statValue = targetParticipant.combatStats.currentHp;
        break;
      case "Attack":
        // TODO: Розрахувати значення атаки
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

    // Якщо це відсоток, конвертуємо значення
    const compareValue = valueType === "percent" && stat === "HP"
      ? (targetParticipant.combatStats.currentHp / targetParticipant.combatStats.maxHp) * 100
      : value;

    // Перевіряємо умову
    let conditionMet = false;

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
 * Перевіряє чи тригер скіла виконаний
 */
export function evaluateSkillTrigger(
  trigger: SkillTrigger,
  participant: BattleParticipant,
  context?: {
    target?: BattleParticipant;
    allParticipants?: BattleParticipant[];
    currentRound?: number;
    isOwnerAction?: boolean;
  }
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
  context?: {
    target?: BattleParticipant;
    currentRound?: number;
    isOwnerAction?: boolean;
  }
): ActiveSkill[] {
  return activeSkills.filter((skill) => {
    if (!skill.skillTriggers || skill.skillTriggers.length === 0) {
      return false;
    }

    // Перевіряємо чи є тригер з потрібним типом
    return skill.skillTriggers.some((trigger) => {
      if (trigger.type === "simple" && trigger.trigger === triggerType) {
        // Для простих тригерів перевіряємо умову
        return evaluateSimpleTrigger(trigger.trigger, participant, {
          ...context,
          allParticipants,
        });
      } else if (trigger.type === "complex") {
        // Для складних тригерів перевіряємо умову
        return evaluateComplexTrigger(trigger, participant, {
          ...context,
          allParticipants,
        });
      }

      return false;
    });
  });
}
