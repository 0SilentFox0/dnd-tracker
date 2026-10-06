/**
 * Публічний API модуля spell utils.
 * Експорт з окремих модулів збирається тут; імпортуйте з @/lib/utils/spells.
 */

export { learnedSpellIdsFromNodes } from "./spell-learning-from-tree";
export { getSpellLevelsForSkillLevel, type SpellSkillInfo, toSpellSkillInfo } from "./spell-learning-internals";
