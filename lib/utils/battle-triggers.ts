/**
 * Утиліти для перевірки тригерів пасивних здібностей
 */

import { BattleParticipant, PassiveAbility } from "@/lib/types/battle";
import { hasAnyAllyLowHp } from "./battle-participant-helpers";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";

/**
 * Перевіряє чи виконана умова тригера
 * @param trigger - тригер з умовою
 * @param participant - учасник бою
 * @param context - додатковий контекст для перевірки умов
 * @returns true якщо тригер має спрацювати
 */
export function checkTriggerCondition(
  trigger: PassiveAbility["trigger"],
  participant: BattleParticipant,
  context?: {
    target?: BattleParticipant;
    allParticipants?: BattleParticipant[];
    damage?: number;
    currentRound?: number;
  }
): boolean {
  // Завжди активні здібності
  if (trigger.type === "always") {
    return true;
  }

  // Перевірка шансу спрацювання
  if (trigger.chance !== undefined) {
    // Це буде викликатися з UI де гравець вводить результат 1d100
    // Тут просто повертаємо що умова виконана, реальна перевірка буде в логіці бою
    return true;
  }

  // Перевірка умов типу "ally_low_hp"
  // Використовуємо налаштовуваний поріг з тригера або константу за замовчуванням
  if (trigger.type === "ally_low_hp" && context?.allParticipants) {
    const threshold = trigger.lowHpThresholdPercent ?? BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT;
    return hasAnyAllyLowHp(participant, context.allParticipants, threshold);
  }

  // Інші типи тригерів будуть перевірятися в конкретних місцях (on_attack, on_hit, тощо)
  // Тут тільки базова логіка

  return false;
}

/**
 * Отримує всі пасивні здібності що можуть спрацювати для даного типу тригера
 * @param participant - учасник бою
 * @param triggerType - тип тригера
 * @returns масив пасивних здібностей
 */
export function getPassiveAbilitiesByTrigger(
  participant: BattleParticipant,
  triggerType: PassiveAbility["trigger"]["type"]
): PassiveAbility[] {
  return participant.passiveAbilities.filter(
    (ability) => ability.trigger.type === triggerType
  );
}

/**
 * Перевіряє умову з рядка (наприклад, "ally_hp <= 15%")
 * @param condition - рядок з умовою
 * @param participant - учасник бою
 * @param context - контекст для перевірки
 * @returns true якщо умова виконана
 */
export function evaluateCondition(
  condition: string,
  participant: BattleParticipant,
  context?: {
    target?: BattleParticipant;
    allParticipants?: BattleParticipant[];
    damage?: number;
  }
): boolean {
  // Базова реалізація для найпоширеніших умов
  // В майбутньому можна розширити для складніших виразів

  if (condition.includes("ally_hp") && context?.allParticipants) {
    // Витягуємо поріг з умови (наприклад, "ally_hp <= 25%" → 25)
    // Якщо не вказано, використовуємо константу за замовчуванням
    const threshold = parseFloat(condition.match(/(\d+)%?/)?.[1] || String(BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT));
    return hasAnyAllyLowHp(participant, context.allParticipants, threshold);
  }

  return false;
}
