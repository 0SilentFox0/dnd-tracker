/**
 * Спільний контекст для перевірки тригерів.
 * Використовується в battle-triggers (PassiveAbility) та skill-triggers (ActiveSkill).
 * Дозволяє мати одну точку правди для форми контексту при оцінці умов.
 */

import type { BattleParticipant } from "@/types/battle";

/**
 * Базова форма контексту для оцінки тригерів у бою
 */
export interface TriggerContextBase {
  target?: BattleParticipant;
  allParticipants?: BattleParticipant[];
  currentRound?: number;
  damage?: number;
}

/**
 * Розширений контекст для тригерів скілів (isOwnerAction тощо)
 */
export interface SkillTriggerContext extends TriggerContextBase {
  isOwnerAction?: boolean;
}
