export function magicMainSkillIds(mainSkills: Array<{ id: string; role?: string | null; spellGroupId?: string | null }>): Set<string> {
  return new Set(mainSkills.filter((ms) => ms.role === "magic" || !!ms.spellGroupId).map((ms) => ms.id));
}
