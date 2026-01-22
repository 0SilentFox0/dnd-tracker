/**
 * Утиліти для автоматичного додавання заклинань при вивченні скілів
 */

import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";
import { SkillLevel, type SkillLevelType } from "@/types/skill-tree";

/**
 * Визначає рівень магії на основі прокачки скілу
 * Базовий рівень -> 1-2 рівень магії
 * Просунутий рівень -> 3-4 рівень магії
 * Експертний рівень -> 5 рівень магії
 */
export function getSpellLevelsForSkillLevel(
  skillLevel: SkillLevelType
): number[] {
  switch (skillLevel) {
    case SkillLevel.BASIC:
      return [1, 2];
    case SkillLevel.ADVANCED:
      return [3, 4];
    case SkillLevel.EXPERT:
      return [5];
    default:
      return [];
  }
}

/**
 * Отримує заклинання з групи заклинань для певних рівнів
 */
export function getSpellsForLevels(
  spells: Spell[],
  levels: number[]
): Spell[] {
  return spells.filter((spell) => levels.includes(spell.level));
}

/**
 * Отримує всі заклинання, які мають бути автоматично додані при вивченні скілу
 * 
 * Логіка:
 * 1. Якщо скіл має spellGroupId -> додаємо всі заклинання цієї групи з відповідних рівнів (Базовий/Просунутий/Експертний)
 * 2. Якщо скіл має spellNewSpellId -> додаємо це заклинання
 */
export function getSpellsToAddForSkill(
  skill: Skill,
  allSpells: Spell[],
  skillLevel?: SkillLevelType
): string[] {
  const spellIdsToAdd: string[] = [];

  // Якщо скіл має групу заклинань та вказано рівень скілу
  if (skill.spellGroupId && skillLevel) {
    const levels = getSpellLevelsForSkillLevel(skillLevel);
    const groupSpells = allSpells.filter(
      (spell) =>
        spell.spellGroup?.id === skill.spellGroupId &&
        levels.includes(spell.level)
    );
    spellIdsToAdd.push(...groupSpells.map((s) => s.id));
  }

  // Якщо скіл додає нове заклинання
  if (skill.spellNewSpellId) {
    spellIdsToAdd.push(skill.spellNewSpellId);
  }

  return spellIdsToAdd;
}

/**
 * Обчислює список заклинань, які потрібно додати на основі прокачених скілів
 */
export function calculateSpellsToAdd(
  unlockedSkillIds: string[],
  allSkills: Skill[],
  allSpells: Spell[],
  skillTreeProgress?: Record<string, { level?: SkillLevelType; unlockedSkills?: string[] }>
): string[] {
  const newSpellIds: string[] = [];

  for (const skillId of unlockedSkillIds) {
    const skill = allSkills.find((s) => s.id === skillId);
    if (!skill) continue;

    // Знаходимо рівень прокачки скілу (якщо він є в skillTreeProgress)
    let skillLevel: SkillLevelType | undefined;

    if (skillTreeProgress) {
      for (const [mainSkillId, progress] of Object.entries(skillTreeProgress)) {
        if (
          progress.unlockedSkills?.includes(skillId) &&
          progress.level
        ) {
          skillLevel = progress.level;
          break;
        }
      }
    }

    const spellsToAdd = getSpellsToAddForSkill(skill, allSpells, skillLevel);
    newSpellIds.push(...spellsToAdd);
  }

  // Видаляємо дублікати
  return Array.from(new Set(newSpellIds));
}
