/**
 * Утиліти для перевірки моралі в бою
 */

import { BattleParticipant } from "@/types/battle";

/**
 * Результат перевірки моралі
 */
export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: string;
}

/**
 * Перевіряє мораль учасника та визначає наслідки
 * @param participant - учасник бою
 * @param d10Roll - результат кидка 1d10 (від 1 до 10)
 * @returns результат перевірки моралі
 */
export function checkMorale(
  participant: BattleParticipant,
  d10Roll: number
): MoraleCheckResult {
  const result: MoraleCheckResult = {
    shouldSkipTurn: false,
    hasExtraTurn: false,
    message: "",
  };

  // Расові модифікатори
  let currentMorale = participant.combatStats.morale;

  // Люди: негативна мораль завжди = 0
  if (participant.abilities.race === "human" && currentMorale < 0) {
    currentMorale = 0;
  }

  // Некроманти: мораль завжди = 0 (пропускають перевірку)
  if (participant.abilities.race === "necromancer") {
    return {
      ...result,
      message: `${participant.basicInfo.name} (Некромант) - мораль не впливає`,
    };
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

/**
 * Валідує результат кидка 1d10
 * @param roll - результат кидка
 * @returns true якщо валідний
 */
export function validateD10Roll(roll: number): boolean {
  return roll >= 1 && roll <= 10 && Number.isInteger(roll);
}

/**
 * Отримує текст для UI з описом перевірки моралі
 * @param participant - учасник бою
 * @returns текст для відображення
 */
export function getMoraleCheckDescription(
  participant: BattleParticipant
): string {
  let currentMorale = participant.combatStats.morale;

  // Расові модифікатори
  if (participant.abilities.race === "human" && currentMorale < 0) {
    currentMorale = 0;
  }

  if (participant.abilities.race === "necromancer") {
    return "Некромант - мораль не впливає";
  }

  if (currentMorale === 0) {
    return "Нейтральна мораль - немає ефекту";
  }

  const moraleValue = Math.abs(currentMorale);

  const chance = moraleValue * 10;

  if (currentMorale > 0) {
    return `Мораль: +${currentMorale} | Шанс додаткового ходу: ${chance}%`;
  } else {
    return `Мораль: ${currentMorale} | Шанс пропуску ходу: ${chance}%`;
  }
}
