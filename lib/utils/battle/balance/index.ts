/**
 * Баланс боїв: DPR/HP героїв і юнітів, масштабування ворогів, підбір складу.
 */

export type { MagicMainSkillId } from "./dpr";
export { getNonMagicBranchDpr, getSpellDprFromBranchLevels, MAGIC_MAIN_SKILL_IDS } from "./dpr";
export type {
  BalanceHint,
  BalanceHintChange,
  BalanceVerdict,
  FairScaling,
  PartyPower,
  Power,
  RosterEntry,
  UnitScale,
} from "./fair";
export { computeFairScaling, targetEnemyPower } from "./fair";
export { isMagicMainSkill, magicMainSkillIds } from "./magic-school";
export type { PickedEnemy, PickResult } from "./pick";
export { pickEnemyRoster } from "./pick";
export type { GetCharacterStatsParams, UnitStats } from "./stats";
export { getCharacterStats, getUnitStats } from "./stats";
