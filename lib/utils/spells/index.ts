/**
 * Публічний API модуля spell utils.
 * Експорт з окремих модулів збирається тут; імпортуйте з @/lib/utils/spells.
 */

export {
  calculateSpellsToAdd,
  getSpellsForLevels,
  getSpellsToAddForSkill,
} from "./spell-learning";
export {
  getLearnedSpellIdsFromProgress,
  getLearnedSpellIdsFromTree,
} from "./spell-learning-from-tree";
export { getSpellLevelsForSkillLevel } from "./spell-learning-internals";
