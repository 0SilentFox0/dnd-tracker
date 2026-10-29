import { CombatStatus } from "@/lib/constants/battle";
import { idleTurnIndex, isActive, sitsOutTurn } from "@/lib/utils/abilities/engine/core/participants";
import { rollDyingAt } from "@/lib/utils/battle/death-saves";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

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
  deathSaves?: { rules?: Ruleset; rng?: () => number },
): { nextTurnIndex: number; nextRound: number; participants?: BattleParticipant[]; messages?: LogLine[] } {
  let order = initiativeOrder;

  const messages: LogLine[] = [];

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

    // у новому раунді черга перевпорядковується: кидки для нього робить цикл ходу
    const rolled = nextRound === currentRound ? rollDyingAt(order, nextTurnIndex, deathSaves?.rules, deathSaves?.rng ?? Math.random) : null;

    if (rolled) {
      order = rolled.participants;
      messages.push(...rolled.messages);
    }

    const nextParticipant = order[nextTurnIndex];

    if (
      nextParticipant &&
      nextParticipant.combatStats.status !== CombatStatus.DEAD &&
      nextParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS &&
      !sitsOutTurn(nextParticipant, nextRound)
    ) {
      break;
    }

    // Якщо ми перевірили всіх і нікого живого немає - зупиняємось (безпека)
    if (attempts >= maxAttempts) {
      // у лабіринті живі можуть не ходити (сплять, вийшли): новий раунд починається з першого живого
      if (initiativeOrder.some(isActive)) nextTurnIndex = idleTurnIndex(initiativeOrder);

      break;
    }
  } while (true);

  return {
    nextTurnIndex,
    nextRound,
    ...(messages.length > 0 && { participants: order, messages }),
  };
}
