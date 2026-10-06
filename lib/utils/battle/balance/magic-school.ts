import { MAGIC_MAIN_SKILL_IDS, MAGIC_MAIN_SKILL_NAME_ALIASES } from "@/lib/constants/dpr-by-main-skill";

const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, "_");

const ALIASES = new Set(MAGIC_MAIN_SKILL_NAME_ALIASES.map(normalize));

export function isMagicMainSkill(skill: { id: string; name?: string | null }): boolean {
  return (MAGIC_MAIN_SKILL_IDS as readonly string[]).includes(skill.id) || (!!skill.name && ALIASES.has(normalize(skill.name)));
}

export function magicMainSkillIds(mainSkills: Array<{ id: string; name: string }>): Set<string> {
  return new Set(mainSkills.filter(isMagicMainSkill).map((ms) => ms.id));
}
