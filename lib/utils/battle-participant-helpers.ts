/**
 * Допоміжні функції для роботи з BattleParticipant
 */

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { BattleParticipant } from "@/types/battle";

/**
 * Отримує всіх союзників учасника
 * @param participant - учасник бою
 * @param allParticipants - всі учасники бою
 * @returns масив союзників (без самого учасника)
 */
export function getAllies(
  participant: BattleParticipant,
  allParticipants: BattleParticipant[]
): BattleParticipant[] {
  return allParticipants.filter(
    (p) => p.side === participant.side && p.id !== participant.id
  );
}

/**
 * Перевіряє чи має союзник низьке HP (нижче порогу)
 * @param ally - союзник
 * @param thresholdPercent - поріг у відсотках (за замовчуванням з константи)
 * @returns true якщо HP союзника нижче порогу
 */
export function hasLowHp(
  ally: BattleParticipant,
  thresholdPercent: number = BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT
): boolean {
  const hpPercentage = (ally.currentHp / ally.maxHp) * 100;

  return hpPercentage <= thresholdPercent;
}

/**
 * Перевіряє чи є хтось з союзників з низьким HP
 * @param participant - учасник бою
 * @param allParticipants - всі учасники бою
 * @param thresholdPercent - поріг у відсотках (за замовчуванням з константи)
 * @returns true якщо є союзник з HP нижче порогу
 */
export function hasAnyAllyLowHp(
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  thresholdPercent: number = BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT
): boolean {
  const allies = getAllies(participant, allParticipants);

  return allies.some((ally) => hasLowHp(ally, thresholdPercent));
}
