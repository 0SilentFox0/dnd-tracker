/**
 * Розрахунки для автопідбору ворогів за KPI (DPR / Total HP).
 * Реекспорт з модулів: dpr, stats.
 */

export type { MagicMainSkillId } from "./dpr";
export { getNonMagicBranchDpr, getSpellDprFromBranchLevels, MAGIC_MAIN_SKILL_IDS } from "./dpr";
export { isMagicMainSkill, magicMainSkillIds } from "./magic-school";
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
