/**
 * Утиліти для перевірки моралі в бою
 */

import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleParticipant } from "@/types/battle";

/**
 * Результат перевірки моралі
 */
export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: string;
  /** true = перевірка на додатковий хід (+мораль), false = перевірка на пропуск (-мораль) */
  moralePositive: boolean;
}

/** Перевіряє мораль учасника (d10Roll — кидок 1d10) та визначає наслідки. */
export function checkMorale(
  participant: BattleParticipant,
  d10Roll: number,
  participants: BattleParticipant[] = [participant],
): MoraleCheckResult {
  const { value: currentMorale, ignored } = effectiveMorale(participant, participants);

  const result: MoraleCheckResult = {
    shouldSkipTurn: false,
    hasExtraTurn: false,
    message: "",
    moralePositive: currentMorale > 0,
  };

  if (ignored) {
    return { ...result, message: `${participant.basicInfo.name}: мораль не діє` };
  }

  // Якщо мораль = 0, перевірка не потрібна
  if (currentMorale === 0) {
    return {
      ...result,
      message: `${participant.basicInfo.name} має нейтральну мораль`,
    };
  }

  // Розрахунок шансу
  // Шанс 10% означає що потрібно викинути рівно 10 на d10
  // Шанс 20% означає що потрібно викинути 10 або 9
  // Шанс 30% означає що потрібно викинути 10, 9 або 8
  // Тобто: шанс X% = потрібно викинути значення >= (11 - X/10)
  const moraleValue = Math.abs(currentMorale);

  const chance = moraleValue * 10; // 1 мораль = 10%, 2 = 20%, тощо

  const minRoll = 11 - (chance / 10); // Для 10% = 11 - 1 = 10, для 20% = 11 - 2 = 9, тощо

  if (currentMorale > 0) {
    // Позитивна мораль: шанс на додатковий хід
    // Потрібно викинути >= minRoll (наприклад, для 10% потрібно >= 10, тобто рівно 10)
    if (d10Roll >= minRoll) {
      result.hasExtraTurn = true;
      result.message = `⭐ ${participant.basicInfo.name} отримав додатковий хід! (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    } else {
      result.message = `${participant.basicInfo.name} не отримав додатковий хід (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    }
  } else {
    // Негативна мораль: шанс пропустити хід
    // Потрібно викинути >= minRoll (наприклад, для 10% потрібно >= 10, тобто рівно 10)
    if (d10Roll >= minRoll) {
      result.shouldSkipTurn = true;
      result.message = `😔 ${participant.basicInfo.name} пропустив хід через низьку мораль (Мораль ${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    } else {
      result.message = `${participant.basicInfo.name} не пропустив хід (Мораль ${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    }
  }

  return result;
}
