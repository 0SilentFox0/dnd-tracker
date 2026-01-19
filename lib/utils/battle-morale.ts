/**
 * Утиліти для перевірки моралі в бою
 */

import { BattleParticipant } from "@/lib/types/battle";

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
  let currentMorale = participant.morale;

  // Люди: негативна мораль завжди = 0
  if (participant.race === "human" && currentMorale < 0) {
    currentMorale = 0;
  }

  // Некроманти: мораль завжди = 0 (пропускають перевірку)
  if (participant.race === "necromancer") {
    return {
      ...result,
      message: `${participant.name} (Некромант) - мораль не впливає`,
    };
  }

  // Якщо мораль = 0, перевірка не потрібна
  if (currentMorale === 0) {
    return {
      ...result,
      message: `${participant.name} має нейтральну мораль`,
    };
  }

  // Розрахунок шансу
  const moraleValue = Math.abs(currentMorale);
  const chance = moraleValue * 10; // 1 мораль = 10%, 2 = 20%, тощо

  if (currentMorale > 0) {
    // Позитивна мораль: шанс на додатковий хід
    if (d10Roll <= chance) {
      result.hasExtraTurn = true;
      result.message = `⭐ ${participant.name} отримав додатковий хід! (Мораль +${currentMorale}, кидок: ${d10Roll}/${chance})`;
    } else {
      result.message = `${participant.name} не отримав додатковий хід (Мораль +${currentMorale}, кидок: ${d10Roll}/${chance})`;
    }
  } else {
    // Негативна мораль: шанс пропустити хід
    if (d10Roll <= chance) {
      result.shouldSkipTurn = true;
      result.message = `😔 ${participant.name} пропустив хід через низьку мораль (Мораль ${currentMorale}, кидок: ${d10Roll}/${chance})`;
    } else {
      result.message = `${participant.name} не пропустив хід (Мораль ${currentMorale}, кидок: ${d10Roll}/${chance})`;
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
  let currentMorale = participant.morale;

  // Расові модифікатори
  if (participant.race === "human" && currentMorale < 0) {
    currentMorale = 0;
  }

  if (participant.race === "necromancer") {
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
