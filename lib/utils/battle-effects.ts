/**
 * Утиліти для роботи з активними ефектами в бою
 */

import { ActiveEffect, BattleParticipant } from "@/types/battle";

/**
 * Застосовує DOT (Damage Over Time) ефекти на початку ходу
 * @param participant - учасник бою
 * @returns об'єкт зі зміненим HP та масивом повідомлень про урон
 */
export function applyDOTEffects(
  participant: BattleParticipant
): { newHp: number; damageMessages: string[] } {
  let currentHp = participant.currentHp;

  const damageMessages: string[] = [];

  for (const effect of participant.activeEffects) {
    if (effect.dotDamage) {
      const { damagePerRound, damageType } = effect.dotDamage;

      currentHp = Math.max(0, currentHp - damagePerRound);
      damageMessages.push(
        `${participant.name} отримав ${damagePerRound} ${damageType} урону від ${effect.name}`
      );
    }
  }

  return {
    newHp: currentHp,
    damageMessages,
  };
}

/**
 * Зменшує тривалість всіх активних ефектів на 1 раунд
 * Видаляє ефекти з duration <= 0
 * @param participant - учасник бою
 * @returns оновлені активні ефекти та масив назв завершених ефектів
 */
export function decreaseEffectDurations(
  participant: BattleParticipant
): {
  updatedEffects: ActiveEffect[];
  expiredEffects: string[];
} {
  const updatedEffects: ActiveEffect[] = [];

  const expiredEffects: string[] = [];

  for (const effect of participant.activeEffects) {
    const newDuration = effect.duration - 1;

    if (newDuration <= 0) {
      expiredEffects.push(effect.name);
    } else {
      updatedEffects.push({
        ...effect,
        duration: newDuration,
      });
    }
  }

  return {
    updatedEffects,
    expiredEffects,
  };
}

/**
 * Додає новий активний ефект до учасника
 * @param participant - учасник бою
 * @param effect - новий ефект для застосування
 * @param currentRound - поточний раунд
 * @returns оновлені активні ефекти
 */
export function addActiveEffect(
  participant: BattleParticipant,
  effect: Omit<ActiveEffect, "appliedAt">,
  currentRound: number
): ActiveEffect[] {
  const newEffect: ActiveEffect = {
    ...effect,
    appliedAt: {
      round: currentRound,
      timestamp: new Date(),
    },
  };

  return [...participant.activeEffects, newEffect];
}
