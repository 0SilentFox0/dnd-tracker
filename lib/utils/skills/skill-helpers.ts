/**
 * Утиліти для роботи зі скілами (підтримка обох структур)
 */

import type { SkillEffect } from "@/types/battle";
import type { SkillTriggers } from "@/types/skill-triggers";
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
export function getSkillRaces(_skill: Skill | GroupedSkill): string[] {
  return [];
}

/**
 * Чи скіл расовий (прибрано з моделі — завжди false для сумісності)
 */
export function getSkillIsRacial(_skill: Skill | GroupedSkill): boolean {
  return false;
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
  effects?: SkillEffect[];
} {
  if ("combatStats" in skill) {
    return skill.combatStats || {};
  }

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
 * Отримує ефекти скіла (структуровані)
 */
export function getSkillEffects(skill: Skill | GroupedSkill): SkillEffect[] {
  if ("combatStats" in skill && skill.combatStats?.effects) {
    return skill.combatStats.effects;
  }
  return [];
}

/**
 * Отримує тригери скіла
 */
export function getSkillTriggers(skill: Skill | GroupedSkill): SkillTriggers {
  return skill.skillTriggers ?? [];
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
