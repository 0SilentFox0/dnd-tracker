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

  if (currentMorale === 0) {
    return {
      ...result,
      message: `${participant.basicInfo.name} має нейтральну мораль`,
    };
  }

  // Шанс 10% означає що потрібно викинути рівно 10 на d10
  // Шанс 20% означає що потрібно викинути 10 або 9
  // Шанс 30% означає що потрібно викинути 10, 9 або 8
  const moraleValue = Math.abs(currentMorale);

  const chance = moraleValue * 10; // 1 мораль = 10%, 2 = 20%, тощо

  const minRoll = 11 - (chance / 10); // Для 10% = 11 - 1 = 10, для 20% = 11 - 2 = 9, тощо

  if (currentMorale > 0) {
    if (d10Roll >= minRoll) {
      result.hasExtraTurn = true;
      result.message = `⭐ ${participant.basicInfo.name} отримав додатковий хід! (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    } else {
      result.message = `${participant.basicInfo.name} не отримав додатковий хід (Мораль +${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    }
  } else {
    if (d10Roll >= minRoll) {
      result.shouldSkipTurn = true;
      result.message = `😔 ${participant.basicInfo.name} пропустив хід через низьку мораль (Мораль ${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    } else {
      result.message = `${participant.basicInfo.name} не пропустив хід (Мораль ${currentMorale}, кидок: ${d10Roll}, потрібно: >=${Math.ceil(minRoll)})`;
    }
  }

  return result;
}
