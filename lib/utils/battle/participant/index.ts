/**
 * Утиліти для створення та роботи з BattleParticipant.
 * Публічний API — реекспорт з модулів.
 */

export type { CampaignSpellContext } from "../types/participant";
export type { ParticipantExtras } from "./extras";
export {
  getParticipantExtras,
  setParticipantExtras,
} from "./extras";
export { createBattleParticipantFromCharacter } from "./from-character";
export { createBattleParticipantFromUnit } from "./from-unit";
export {
  applyMainActionUsed,
  getAllies,
  getEffectiveArmorClass,
  getParticipantActiveSkills,
  getParticipantArmorClass,
  getParticipantAttacks,
  getParticipantCurrentHp,
  getParticipantHasExtraTurn,
  getParticipantHasUsedAction,
  getParticipantHasUsedBonusAction,
  getParticipantHasUsedReaction,
  getParticipantId,
  getParticipantLevel,
  getParticipantMaxHp,
  getParticipantMorale,
  getParticipantName,
  getParticipantSide,
  getParticipantSpeed,
  getParticipantStatus,
  hasAnyAllyLowHp,
  hasLowHp,
} from "./helpers";
export { parseMainSkillLevelId } from "./parse";
export { applyPassiveSkillEffects } from "./passive";
