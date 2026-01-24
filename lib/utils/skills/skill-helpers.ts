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
 * Отримує расы скіла
 */
export function getSkillRaces(skill: Skill | GroupedSkill): string[] {
  return 'basicInfo' in skill
    ? (skill.basicInfo?.races || [])
    : (skill.races || []);
}

/**
 * Отримує чи скіл расовий
 */
export function getSkillIsRacial(skill: Skill | GroupedSkill): boolean {
  return 'basicInfo' in skill
    ? (skill.basicInfo?.isRacial || false)
    : (skill.isRacial || false);
}

/**
 * Отримує бонуси скіла
 */
export function getSkillBonuses(skill: Skill | GroupedSkill): Record<string, number> {
  return skill.bonuses || {};
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
 * Отримує combat stats скіла
 */
export function getSkillCombatStats(skill: Skill | GroupedSkill): {
  damage?: number;
  armor?: number;
  speed?: number;
  physicalResistance?: number;
  magicalResistance?: number;
} {
  if ('combatStats' in skill) {
    return skill.combatStats || {};
  }

  // TypeScript тепер знає, що це Skill
  const skillData = skill as Skill;

  return {
    damage: skillData.damage || undefined,
    armor: skillData.armor || undefined,
    speed: skillData.speed || undefined,
    physicalResistance: skillData.physicalResistance || undefined,
    magicalResistance: skillData.magicalResistance || undefined,
  };
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
