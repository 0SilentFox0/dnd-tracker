/**
 * Утиліти для обробки ходу в бою
 */

import { applyDOTEffects, decreaseEffectDurations } from "./battle-effects";
import { calculateInitiative, sortByInitiative } from "./battle-start";

import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { findParticipant, isUp, replaceParticipant } from "@/lib/utils/abilities/engine/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/types";
import { BattleParticipant } from "@/types/battle";

/**
 * Результат обробки початку ходу
 */
export interface StartOfTurnResult {
  participant: BattleParticipant;
  /** повний список: вміння turnStart і смерть від DOT можуть змінити інших */
  participants: BattleParticipant[];
  damageMessages: string[];
  expiredEffects: string[];
  abilityMessages: string[];
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
  rng: Rng = Math.random,
): StartOfTurnResult {
  let updatedParticipant = { ...participant };

  // до зменшення тривалостей: обмеження на 1 раунд має подіяти в цей хід
  const restrictedBy = (type: string) =>
    participant.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === type));

  const hasNoBonusAction = restrictedBy("no_bonus_action");

  const hasNoReaction = restrictedBy("no_reaction");

  const damageMessages: string[] = [];

  let expiredEffects: string[] = [];

  // DoT і зменшення тривалості ефектів — на початку ходу цієї цілі (Decay тощо)
  if (
    updatedParticipant.combatStats.status !== "dead" &&
    updatedParticipant.combatStats.status !== "unconscious"
  ) {
    const dotResult = applyDOTEffects(updatedParticipant);

    updatedParticipant = {
      ...updatedParticipant,
      combatStats: {
        ...updatedParticipant.combatStats,
        currentHp: dotResult.newHp,
      },
    };
    damageMessages.push(...dotResult.damageMessages);

    const durationResult = decreaseEffectDurations(updatedParticipant);

    expiredEffects = durationResult.expiredEffects;
    updatedParticipant = {
      ...updatedParticipant,
      battleData: {
        ...updatedParticipant.battleData,
        activeEffects: durationResult.updatedEffects,
      },
    };
  }

  // 1. Перевіряємо чи учасник впав в непритомність або помер (після DoT)
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

  // 5. Скидаємо флаги дій; ефекти no_bonus_action / no_reaction блокують відповідні дії
  updatedParticipant = {
    ...updatedParticipant,
    actionFlags: {
      ...updatedParticipant.actionFlags,
      hasUsedAction: false,
      hasUsedBonusAction: hasNoBonusAction,
      hasUsedReaction: hasNoReaction,
    },
  };

  const id = participant.basicInfo.id;

  const ctx = { round: currentRound, rng };

  let participants = allParticipants.some((p) => p.basicInfo.id === id)
    ? replaceParticipant(allParticipants, updatedParticipant)
    : [updatedParticipant];

  const abilityMessages: string[] = [];

  if (statusChanged) {
    const r = resolveDowned(participants, { victimId: id, actorId: null }, ctx);

    participants = r.participants;
    abilityMessages.push(...r.messages);
  } else if (isUp(updatedParticipant)) {
    const r = runAbilities(participants, { type: "turnStart", actorId: id }, ctx);

    participants = r.participants;
    abilityMessages.push(...r.messages);
  }

  return {
    participant: findParticipant(participants, id) ?? updatedParticipant,
    participants,
    damageMessages,
    expiredEffects,
    abilityMessages,
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
  rng: Rng = Math.random,
): {
  updatedInitiativeOrder: BattleParticipant[];
  message: string;
  triggerMessages: string[];
} {
  // 0. Видаляємо тимчасові слоти додаткових ходів з попереднього раунду
  const baseOrder = (initiativeOrder || []).filter((p) => !p.basicInfo?.isExtraTurnSlot);

  // Додаємо призваних істот до baseOrder
  const updatedOrder = [...baseOrder, ...pendingSummons];

  const newSummonIds = new Set(pendingSummons.map((p) => p.basicInfo.id));

  const ctx = { round: currentRound, rng };

  const messages: string[] = [];

  let order = updatedOrder;

  if (newSummonIds.size > 0) {
    order = applyBakedAuras(order, newSummonIds);

    const joined = runAbilities(order, { type: "battleStart", newcomerIds: [...newSummonIds] }, ctx);

    order = joined.participants;
    messages.push(...joined.messages);
  }

  const round = runAbilities(order, { type: "roundStart" }, ctx);

  messages.push(...round.messages);

  const sortedOrder = sortByInitiative(
    round.participants.map((p) => ({ ...p, abilities: { ...p.abilities, initiative: calculateInitiative(p, round.participants) } })),
  );

  // DoT і зменшення тривалості ефектів тепер на початку ходу кожного учасника (processStartOfTurn)
  return {
    updatedInitiativeOrder: sortedOrder,
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: messages,
  };
}
