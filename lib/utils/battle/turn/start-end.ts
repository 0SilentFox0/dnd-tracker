import { applyDOTEffects, applyHOTEffects, armEffects, countDownAtTurnStart, countDownInitiativeEffects } from "./effects";
import { calculateInitiative, sortByInitiative } from "./initiative";

import { CombatStatus } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { hazardHit, hazardUnder } from "@/lib/utils/battle/grid/hazard";
import { actionsPerTurnPool, setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { summonsOf } from "@/lib/utils/battle/participant/reserve";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

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
 * @param map - карта бою: небезпечна клітинка під учасником шкодить після DoT
 * @returns результат обробки
 */
export function processStartOfTurn(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants: BattleParticipant[],
  rng: Rng = Math.random,
  map?: BattleMapConfig | null,
): StartOfTurnResult {
  let updatedParticipant = { ...participant };

  const hasNoBonusAction = hasEffectMarker(participant, "no_bonus_action");

  const hasNoReaction = hasEffectMarker(participant, "no_reaction");

  const skipChances = participant.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === "skip_action").map((d) => ({ name: e.name, percent: d.value })));

  const damageMessages: string[] = [];

  let expiredEffects: string[] = [];

  const healMessages: string[] = [];

  // DoT/HoT — на початку ходу цілі; тривалості зменшуються наприкінці ходу (endTurnCleanup)
  if (
    updatedParticipant.combatStats.status !== CombatStatus.DEAD &&
    updatedParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS
  ) {
    const dotResult = applyDOTEffects(updatedParticipant, allParticipants);

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

    const hazard = map && updatedParticipant.combatStats.currentHp > 0 ? hazardUnder(map, updatedParticipant) : null;

    const hit = hazard && hazardHit(updatedParticipant, hazard, currentRound, allParticipants, rng);

    if (hit) {
      updatedParticipant = hit.participant;
      damageMessages.push(hit.message);
    }

    const hotResult = applyHOTEffects(updatedParticipant);

    updatedParticipant = { ...updatedParticipant, combatStats: { ...updatedParticipant.combatStats, currentHp: hotResult.newHp } };
    healMessages.push(...hotResult.healMessages);

    const { kept, expired } = countDownAtTurnStart(updatedParticipant.battleData.activeEffects);

    expiredEffects = expired;

    updatedParticipant = {
      ...updatedParticipant,
      battleData: {
        ...updatedParticipant.battleData,
        activeEffects: armEffects(kept),
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
    battleData: { ...updatedParticipant.battleData, retaliationsUsed: 0 },
  };

  if (updatedParticipant.battleData.movementUsed) {
    updatedParticipant = { ...updatedParticipant, battleData: { ...updatedParticipant.battleData, movementUsed: 0 } };
  }

  updatedParticipant = {
    ...updatedParticipant,
    battleData: { ...updatedParticipant.battleData, turnStartPosition: updatedParticipant.battleData.position, returnedThisTurn: undefined },
  };

  const id = participant.basicInfo.id;

  // додаткові дії, отримані поза своїм ходом, не переносяться — пул ходу це лише actionsPerTurn
  updatedParticipant = setExtraActionPool(updatedParticipant, isActive(updatedParticipant) ? actionsPerTurnPool(updatedParticipant, allParticipants) : 0);

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

  const summons = summonsOf(pendingSummons);

  const updatedOrder = [...baseOrder, ...summons];

  const newSummonIds = new Set(summons.map((p) => p.basicInfo.id));

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
    updatedInitiativeOrder: sortedOrder.map(countDownInitiativeEffects),
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: messages,
  };
}
