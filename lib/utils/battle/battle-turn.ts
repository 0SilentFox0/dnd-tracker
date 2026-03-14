/**
 * Утиліти для обробки ходу в бою
 */

import { applyDOTEffects, decreaseEffectDurations } from "./battle-effects";
import { calculateInitiative } from "./battle-start";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "./battle-triggers";

import {
  applyOnBattleStartEffectsToNewAllies,
  executeStartOfRoundTriggers,
} from "@/lib/utils/skills/skill-triggers-execution";
import { BattleParticipant } from "@/types/battle";

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
  allParticipants: BattleParticipant[],
): StartOfTurnResult {
  let updatedParticipant = { ...participant };

  const damageMessages: string[] = [];

  const triggeredAbilities: string[] = [];

  // 1. Застосовуємо DOT ефекти
  const dotResult = applyDOTEffects(updatedParticipant);

  updatedParticipant = {
    ...updatedParticipant,
    combatStats: {
      ...updatedParticipant.combatStats,
      currentHp: dotResult.newHp,
    },
  };
  damageMessages.push(...dotResult.damageMessages);

  // 2. Зменшуємо тривалість всіх ефектів
  const durationResult = decreaseEffectDurations(updatedParticipant);

  updatedParticipant = {
    ...updatedParticipant,
    battleData: {
      ...updatedParticipant.battleData,
      activeEffects: durationResult.updatedEffects,
    },
  };

  // 3. Перевіряємо чи учасник впав в непритомність або помер
  let statusChanged = false;

  if (
    updatedParticipant.combatStats.currentHp <= 0 &&
    updatedParticipant.combatStats.status !== "dead"
  ) {
    updatedParticipant = {
      ...updatedParticipant,
      combatStats: {
        ...updatedParticipant.combatStats,
        status:
          updatedParticipant.combatStats.currentHp < 0 ? "dead" : "unconscious",
      },
    };
    statusChanged = true;
  }

  // 4. Перевіряємо пасивки з тригером "start_of_turn"
  const startOfTurnAbilities = getPassiveAbilitiesByTrigger(
    updatedParticipant,
    "start_of_turn",
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

  // 5. Скидаємо флаги дій; ефекти no_bonus_action / no_reaction блокують відповідні дії
  const hasNoBonusAction = updatedParticipant.battleData.activeEffects.some(
    (e) => e.effects.some((d) => d.type === "no_bonus_action"),
  );

  const hasNoReaction = updatedParticipant.battleData.activeEffects.some(
    (e) => e.effects.some((d) => d.type === "no_reaction"),
  );

  updatedParticipant = {
    ...updatedParticipant,
    actionFlags: {
      ...updatedParticipant.actionFlags,
      hasUsedAction: false,
      hasUsedBonusAction: hasNoBonusAction,
      hasUsedReaction: hasNoReaction,
    },
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
 * @returns новий індекс ходу та раунд
 */
export function processEndOfTurn(
  currentTurnIndex: number,
  initiativeOrder: BattleParticipant[],
  currentRound: number,
): { nextTurnIndex: number; nextRound: number } {
  let nextTurnIndex = currentTurnIndex;

  let nextRound = currentRound;

  let attempts = 0;

  const maxAttempts = initiativeOrder.length;

  do {
    nextTurnIndex += 1;
    attempts += 1;

    // Якщо досягли кінця черги, переходимо до наступного раунду
    if (nextTurnIndex >= initiativeOrder.length) {
      nextTurnIndex = 0;
      nextRound += 1;
    }

    // Перевіряємо, чи може наступний учасник ходити (не мертвий і не непритомний)
    const nextParticipant = initiativeOrder[nextTurnIndex];

    if (
      nextParticipant &&
      nextParticipant.combatStats.status !== "dead" &&
      nextParticipant.combatStats.status !== "unconscious"
    ) {
      break;
    }

    // Якщо ми перевірили всіх і нікого живого немає - зупиняємось (безпека)
    if (attempts >= maxAttempts) break;
  } while (true);

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
  pendingSummons: BattleParticipant[] = [],
): {
  updatedInitiativeOrder: BattleParticipant[];
  message: string;
  triggerMessages: string[];
} {
  // 0. Видаляємо тимчасові слоти додаткових ходів з попереднього раунду
  const baseOrder = (initiativeOrder || []).filter(
    (p) => !p.basicInfo?.isExtraTurnSlot,
  );

  // Додаємо призваних істот до baseOrder
  const updatedOrder = [...baseOrder, ...pendingSummons];

  // Застосовуємо onBattleStart (all_allies) від союзників до нових призваних — щоб скіли типу Ізабель діяли на союзників
  const newSummonIds = new Set(pendingSummons.map((p) => p.basicInfo.id));

  const orderWithAllyBuffs = applyOnBattleStartEffectsToNewAllies(
    updatedOrder,
    newSummonIds,
    currentRound,
  );

  // Оновлюємо abilities.initiative з activeEffects (бо бонуси Ізабель тощо змінюють ініціативу)
  const orderWithInitiative = orderWithAllyBuffs.map((p) => ({
    ...p,
    abilities: {
      ...p.abilities,
      initiative: calculateInitiative(p),
    },
  }));

  // Виконуємо тригери startRound для всіх учасників
  const triggerResult = executeStartOfRoundTriggers(
    orderWithInitiative,
    currentRound,
  );

  // Пересортуємо з урахуванням можливих змін ініціативи
  // (якщо ефекти змінили initiative, треба пересортувати)
  const sortedOrder = triggerResult.updatedParticipants.sort((a, b) => {
    if (b.abilities.initiative !== a.abilities.initiative) {
      return b.abilities.initiative - a.abilities.initiative;
    }

    if (b.abilities.baseInitiative !== a.abilities.baseInitiative) {
      return b.abilities.baseInitiative - a.abilities.baseInitiative;
    }

    return b.abilities.dexterity - a.abilities.dexterity;
  });

  return {
    updatedInitiativeOrder: sortedOrder,
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: triggerResult.messages,
  };
}
