/**
 * Допоміжні функції для роботи з BattleParticipant
 */

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { BattleParticipant } from "@/types/battle";

/**
 * Helper функції для доступу до полів BattleParticipant
 * (для зворотної сумісності після групування даних)
 */
export const getParticipantId = (p: BattleParticipant) => p.basicInfo.id;
export const getParticipantName = (p: BattleParticipant) => p.basicInfo.name;
export const getParticipantSide = (p: BattleParticipant) => p.basicInfo.side;
export const getParticipantLevel = (p: BattleParticipant) => p.abilities.level;
export const getParticipantCurrentHp = (p: BattleParticipant) => p.combatStats.currentHp;
export const getParticipantMaxHp = (p: BattleParticipant) => p.combatStats.maxHp;
export const getParticipantArmorClass = (p: BattleParticipant) => p.combatStats.armorClass;

/**
 * Ефективний AC з урахуванням активних ефектів (наприклад ac_bonus від критичних ефектів)
 */
export function getEffectiveArmorClass(p: BattleParticipant): number {
  let ac = p.combatStats.armorClass;
  for (const effect of p.battleData.activeEffects) {
    for (const d of effect.effects) {
      if (d.type === "ac_bonus") {
        ac += d.value ?? 0;
      }
    }
  }
  return ac;
}
export const getParticipantSpeed = (p: BattleParticipant) => p.combatStats.speed;
export const getParticipantMorale = (p: BattleParticipant) => p.combatStats.morale;
export const getParticipantStatus = (p: BattleParticipant) => p.combatStats.status;
export const getParticipantAttacks = (p: BattleParticipant) => p.battleData.attacks;
export const getParticipantActiveSkills = (p: BattleParticipant) => p.battleData.activeSkills;
export const getParticipantHasUsedAction = (p: BattleParticipant) => p.actionFlags.hasUsedAction;
export const getParticipantHasUsedBonusAction = (p: BattleParticipant) => p.actionFlags.hasUsedBonusAction;
export const getParticipantHasUsedReaction = (p: BattleParticipant) => p.actionFlags.hasUsedReaction;
export const getParticipantHasExtraTurn = (p: BattleParticipant) => p.actionFlags.hasExtraTurn;

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
    (p) => p.basicInfo.side === participant.basicInfo.side && p.basicInfo.id !== participant.basicInfo.id
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
  const hpPercentage = (ally.combatStats.currentHp / ally.combatStats.maxHp) * 100;

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
