import { applyDOTEffects, applyHOTEffects, decreaseEffectDurations } from "./battle-effects";
import { calculateInitiative, sortByInitiative } from "./battle-start";

import { CombatStatus } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/hp";
import { findParticipant, isActive, replaceParticipant, withSelf } from "@/lib/utils/abilities/engine/participants";
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

  const skipChances = participant.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === "skip_action").map((d) => ({ name: e.name, percent: d.value })));

  const damageMessages: string[] = [];

  let expiredEffects: string[] = [];

  const healMessages: string[] = [];

  // DoT і зменшення тривалості ефектів — на початку ходу цієї цілі (Decay тощо)
  if (
    updatedParticipant.combatStats.status !== CombatStatus.DEAD &&
    updatedParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS
  ) {
    const dotResult = applyDOTEffects(updatedParticipant);

    updatedParticipant = dropBreakOnDamage(
      {
        ...updatedParticipant,
        combatStats: {
          ...updatedParticipant.combatStats,
          currentHp: dotResult.newHp,
        },
      },
      updatedParticipant.combatStats.currentHp - dotResult.newHp,
    );
    damageMessages.push(...dotResult.damageMessages);

    const hotResult = applyHOTEffects(updatedParticipant);

    updatedParticipant = { ...updatedParticipant, combatStats: { ...updatedParticipant.combatStats, currentHp: hotResult.newHp } };
    healMessages.push(...hotResult.healMessages);

    const durationResult = decreaseEffectDurations(updatedParticipant);

    expiredEffects = durationResult.expiredEffects;

    const charmEnded = updatedParticipant.battleData.activeEffects.find((e) => e.charmOrigin && !durationResult.updatedEffects.some((u) => u.id === e.id));

    updatedParticipant = {
      ...updatedParticipant,
      battleData: {
        ...updatedParticipant.battleData,
        activeEffects: durationResult.updatedEffects,
        ...(charmEnded?.charmOrigin && { charmReturn: charmEnded.charmOrigin }),
      },
    };
  }

  // 1. Перевіряємо чи учасник впав в непритомність або помер (після DoT)
  let statusChanged = false;

  if (
    updatedParticipant.combatStats.currentHp <= 0 &&
    updatedParticipant.combatStats.status !== CombatStatus.DEAD
  ) {
    updatedParticipant = {
      ...updatedParticipant,
      combatStats: {
        ...updatedParticipant.combatStats,
        status:
          updatedParticipant.combatStats.currentHp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS,
      },
    };
    statusChanged = true;
  }

  const skippedBy = isActive(updatedParticipant) ? skipChances.find((s) => rng() * 100 < s.percent) : undefined;

  // 5. Скидаємо флаги дій; ефекти no_bonus_action / no_reaction блокують відповідні дії
  updatedParticipant = {
    ...updatedParticipant,
    actionFlags: {
      ...updatedParticipant.actionFlags,
      hasUsedAction: skippedBy !== undefined,
      hasUsedBonusAction: hasNoBonusAction,
      hasUsedReaction: hasNoReaction,
    },
  };

  const id = participant.basicInfo.id;

  // скидання перед нарахуванням: залишок пулу з минулого ходу не подвоює бонус
  const perTurn = Math.floor(collectModifiers(withSelf(allParticipants, updatedParticipant), id, { stat: "actionsPerTurn" }).flat);

  if (perTurn > 0 && isActive(updatedParticipant)) {
    updatedParticipant = { ...updatedParticipant, battleData: { ...updatedParticipant.battleData, pendingExtraActions: perTurn } };
  }

  const ctx = { round: currentRound, rng };

  let participants = allParticipants.some((p) => p.basicInfo.id === id)
    ? replaceParticipant(allParticipants, updatedParticipant)
    : [updatedParticipant];

  const abilityMessages: string[] = [...healMessages];

  if (skippedBy) abilityMessages.push(`💫 ${participant.basicInfo.name} втрачає дію (${skippedBy.name})`);

  if (statusChanged) {
    const r = resolveDowned(participants, { victimId: id, actorId: null }, ctx);

    participants = r.participants;
    abilityMessages.push(...r.messages);
  } else if (isActive(updatedParticipant)) {
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

    if (nextTurnIndex >= initiativeOrder.length) {
      nextTurnIndex = 0;
      nextRound += 1;
    }

    const nextParticipant = initiativeOrder[nextTurnIndex];

    if (
      nextParticipant &&
      nextParticipant.combatStats.status !== CombatStatus.DEAD &&
      nextParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS
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

  return {
    updatedInitiativeOrder: sortedOrder,
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: messages,
  };
}
