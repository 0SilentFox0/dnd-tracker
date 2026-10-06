/**
 * Утиліти для створення та роботи з BattleParticipant.
 * Публічний API — реекспорт з модулів.
 */

export type { CampaignSpellContext } from "../types/participant";
export { createBattleParticipantFromCharacter } from "./from-character";
export { createBattleParticipantFromUnit } from "./from-unit";
export { applyMainActionUsed, getEffectiveArmorClass } from "./helpers";
