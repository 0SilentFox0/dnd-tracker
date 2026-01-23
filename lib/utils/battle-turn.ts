/**
 * Утиліти для обробки ходу в бою
 */

import { applyDOTEffects, decreaseEffectDurations } from "./battle-effects";
import { checkTriggerCondition,getPassiveAbilitiesByTrigger } from "./battle-triggers";

import { ActiveEffect,BattleParticipant } from "@/types/battle";

/**
 * Результат обробки початку ходу
 */
export interface StartOfTurnResult {
  participant: BattleParticipant;
  damageMessages: string[];
  expiredEffects: string[];
  triggeredAbilities: string[];
  statusChanged: boolean; // чи змінився статус (unconscious/dead)
}

/**
 * Обробляє початок ходу учасника
 * @param participant - учасник бою
 * @param currentRound - поточний раунд
 * @param allParticipants - всі учасники бою (для контексту пасивок)
 * @returns результат обробки
 */
export function processStartOfTurn(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants: BattleParticipant[]
): StartOfTurnResult {
  let updatedParticipant = { ...participant };

  const damageMessages: string[] = [];

  const triggeredAbilities: string[] = [];

  // 1. Застосовуємо DOT ефекти
  const dotResult = applyDOTEffects(updatedParticipant);

  updatedParticipant = {
    ...updatedParticipant,
    currentHp: dotResult.newHp,
  };
  damageMessages.push(...dotResult.damageMessages);

  // 2. Зменшуємо тривалість всіх ефектів
  const durationResult = decreaseEffectDurations(updatedParticipant);

  updatedParticipant = {
    ...updatedParticipant,
    activeEffects: durationResult.updatedEffects,
  };

  // 3. Перевіряємо чи учасник впав в непритомність або помер
  let statusChanged = false;

  if (updatedParticipant.currentHp <= 0 && updatedParticipant.status !== "dead") {
    updatedParticipant = {
      ...updatedParticipant,
      status: updatedParticipant.currentHp < 0 ? "dead" : "unconscious",
    };
    statusChanged = true;
  }

  // 4. Перевіряємо пасивки з тригером "start_of_turn"
  const startOfTurnAbilities = getPassiveAbilitiesByTrigger(
    updatedParticipant,
    "start_of_turn"
  );

  for (const ability of startOfTurnAbilities) {
    if (
      checkTriggerCondition(ability.trigger, updatedParticipant, {
        allParticipants,
        currentRound,
      })
    ) {
      triggeredAbilities.push(ability.name);
      // Тут можна застосувати ефект зі здібності (наприклад, додати activeEffect)
      // Поки що просто відмічаємо що здібність спрацювала
    }
  }

  // 5. Скидаємо флаги дій
  updatedParticipant = {
    ...updatedParticipant,
    hasUsedAction: false,
    hasUsedBonusAction: false,
    hasUsedReaction: false,
  };

  return {
    participant: updatedParticipant,
    damageMessages,
    expiredEffects: durationResult.expiredEffects,
    triggeredAbilities,
    statusChanged,
  };
}

/**
 * Обробляє завершення ходу та перехід до наступного
 * @param currentTurnIndex - поточний індекс ходу
 * @param initiativeOrder - масив учасників
 * @param currentRound - поточний раунд
 * @param hasExtraTurn - чи є додатковий хід
 * @returns новий індекс ходу та раунд
 */
export function processEndOfTurn(
  currentTurnIndex: number,
  initiativeOrder: BattleParticipant[],
  currentRound: number,
  hasExtraTurn: boolean
): { nextTurnIndex: number; nextRound: number } {
  // Якщо є додатковий хід, залишаємося на тому ж учаснику
  if (hasExtraTurn) {
    return {
      nextTurnIndex: currentTurnIndex,
      nextRound: currentRound,
    };
  }

  // Переходимо до наступного учасника
  let nextTurnIndex = currentTurnIndex + 1;

  let nextRound = currentRound;

  // Якщо досягли кінця черги, переходимо до наступного раунду
  if (nextTurnIndex >= initiativeOrder.length) {
    nextTurnIndex = 0;
    nextRound += 1;
  }

  return {
    nextTurnIndex,
    nextRound,
  };
}

/**
 * Обробляє початок нового раунду
 * @param initiativeOrder - масив учасників
 * @param currentRound - поточний раунд
 * @param pendingSummons - масив призваних істот що з'являться
 * @returns оновлений масив учасників та повідомлення
 */
export function processStartOfRound(
  initiativeOrder: BattleParticipant[],
  currentRound: number,
  pendingSummons: BattleParticipant[] = []
): {
  updatedInitiativeOrder: BattleParticipant[];
  message: string;
} {
  // Додаємо призваних істот до initiativeOrder
  const updatedOrder = [...initiativeOrder, ...pendingSummons];

  // Пересортуємо з урахуванням можливих змін ініціативи
  // (якщо ефекти змінили initiative, треба пересортувати)
  const sortedOrder = updatedOrder.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }

    if (b.baseInitiative !== a.baseInitiative) {
      return b.baseInitiative - a.baseInitiative;
    }

    return b.dexterity - a.dexterity;
  });

  return {
    updatedInitiativeOrder: sortedOrder,
    message: `🔁 Початок Раунду ${currentRound}`,
  };
}
