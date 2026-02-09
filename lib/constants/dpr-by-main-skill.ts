/**
 * Константи для розрахунку DPR від основних навичок (баланс / підбір ворогів).
 * Редагуйте значення тут для зміни внеску магії та немагічних навичок у DPR.
 */

import { SkillLevel } from "@/lib/types/skill-tree";

/** ID (slug) основних навичок, які вважаються школами магії */
export const MAGIC_MAIN_SKILL_IDS = [
  "sorcery",
  "light_magic",
  "dark_magic",
  "chaos_magic",
  "summoning_magic",
] as const;

export type MagicMainSkillId = (typeof MAGIC_MAIN_SKILL_IDS)[number];

/**
 * Нормалізовані назви шкіл магії (lowercase, пробіли → _).
 * Якщо MainSkill.name після нормалізації збігається з одним із цих рядків — вважаємо школу магією.
 */
export const MAGIC_MAIN_SKILL_NAME_ALIASES: readonly string[] = [
  ...MAGIC_MAIN_SKILL_IDS,
  "магія світла",
  "магія_світла",
  "магія призиву",
  "магія_призиву",
  "магія темряви",
  "магія_темряви",
  "магія хаосу",
  "магія_хаосу",
  "сорсерія",
];

/**
 * DPR за рівень прокачки школи магії (лише одна школа — найвищий рівень).
 * Школа магії - Базова / Просунута / Експертна.
 */
export const DPR_BY_LEVEL_MAGIC: Record<SkillLevel, number> = {
  [SkillLevel.BASIC]: 25,
  [SkillLevel.ADVANCED]: 50,
  [SkillLevel.EXPERT]: 75,
};

/**
 * DPR за рівень прокачки будь-якої немагічної основної навички.
 * Сумується по всіх таких навичках.
 * Базовий / Просунутий / Експертний.
 */
export const DPR_BY_LEVEL_NON_MAGIC: Record<SkillLevel, number> = {
  [SkillLevel.BASIC]: 15,
  [SkillLevel.ADVANCED]: 25,
  [SkillLevel.EXPERT]: 40,
};
