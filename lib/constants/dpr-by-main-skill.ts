/**
 * Константи для розрахунку DPR від основних навичок (баланс / підбір ворогів).
 * Редагуйте значення тут для зміни внеску магії та немагічних навичок у DPR.
 */

import { SkillLevel } from "@/types/skill-tree";

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
