/**
 * Утиліти для роботи зі скілами (підтримка обох структур)
 */

import type { GroupedSkill, Skill } from "@/types/skills";

/**
 * Отримує ID скіла
 */
export function getSkillId(skill: Skill | GroupedSkill): string {
  return skill.id;
}

/**
 * Отримує назву скіла
 */
export function getSkillName(skill: Skill | GroupedSkill): string {
  return 'basicInfo' in skill ? (skill.basicInfo?.name || "") : (skill.name || "");
}

/**
 * Отримує опис скіла
 */
export function getSkillDescription(skill: Skill | GroupedSkill): string | null {
  return 'basicInfo' in skill 
    ? (skill.basicInfo?.description || null)
    : (skill.description || null);
}

/**
 * Отримує іконку скіла
 */
export function getSkillIcon(skill: Skill | GroupedSkill): string | null {
  return 'basicInfo' in skill
    ? (skill.basicInfo?.icon || null)
    : (skill.icon || null);
}

/**
 * Раси скіла (прибрано з моделі — завжди порожній масив для сумісності)
 */
export function getSkillRaces(skill: Skill | GroupedSkill): string[] {
  void skill;

  return [];
}

/**
 * Чи скіл расовий (прибрано з моделі — завжди false для сумісності)
 */
export function getSkillIsRacial(skill: Skill | GroupedSkill): boolean {
  void skill;

  return false;
}

/**
 * Отримує mainSkillId скіла
 */
export function getSkillMainSkillId(skill: Skill | GroupedSkill): string | null | undefined {
  if ('mainSkillData' in skill) {
    return skill.mainSkillData?.mainSkillId;
  }

  // TypeScript тепер знає, що це Skill
  return (skill as Skill).mainSkillId;
}

/**
 * Отримує spell дані скіла
 */
export function getSkillSpell(skill: Skill | GroupedSkill): {
  id: string;
  name: string;
} | null {
  return skill.spell || null;
}
