/**
 * Розрахунки для автопідбору ворогів за KPI (DPR / Total HP).
 * Реекспорт з модулів: dice, dpr, stats.
 */

export type { DiceGroup } from "./dice";
export {
  getDiceAverage,
  getDiceSlots,
  getTotalDiceCount,
  mergeDiceFormulas,
  parseDiceNotationToGroups,
} from "./dice";
export type { MagicMainSkillId } from "./dpr";
export { getNonMagicBranchDpr, getSpellDprFromBranchLevels, MAGIC_MAIN_SKILL_IDS } from "./dpr";
export type {
  AllyStats,
  CharacterDprBreakdown,
  DifficultyRatio,
  GetCharacterStatsParams,
  SuggestedEnemy,
  UnitStats,
} from "./stats";
export {
  DIFFICULTY_DPR_HP_RATIOS,
  getCharacterStats,
  getUnitStats,
  suggestEnemyUnits,
} from "./stats";
