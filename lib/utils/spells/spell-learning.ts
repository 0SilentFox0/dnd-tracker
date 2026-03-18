/**
 * Утиліти для автоматичного додавання заклинань при вивченні скілів.
 *
 * Основна логіка:
 * - Герой вивчає рівні основних навичок (MainSkill) у дереві прокачки.
 * - Кожна основна навичка може мати прив'язану групу заклинань (spellGroupId).
 * - При вивченні рівня:
 *     Основи (basic)    → заклинання 1–2 рівня цієї групи
 *     Просунутий (advanced) → заклинання 1–4 рівня (кумулятивно)
 *     Експертний (expert)   → заклинання 1–5 рівня (кумулятивно)
 */

import {
  getSkillSpellGroupId,
  getSkillSpellNewSpellId,
  getSpellLevelsForSkillLevel,
  type SkillLike,
} from "./spell-learning-internals";

import type { SkillLevelType } from "@/types/skill-tree";
import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";

/**
 * Отримує заклинання з групи заклинань для певних рівнів
 */
export function getSpellsForLevels(spells: Spell[], levels: number[]): Spell[] {
  return spells.filter((spell) => levels.includes(spell.level));
}

/**
 * Отримує всі заклинання, які мають бути автоматично додані при вивченні скілу.
 *
 * 1. Якщо скіл має spellGroupId → заклинання цієї групи відповідних рівнів
 * 2. Якщо скіл має spellNewSpellId → це окреме заклинання
 */
export function getSpellsToAddForSkill(
  skill: SkillLike,
  allSpells: Spell[],
  skillLevel?: SkillLevelType,
): string[] {
  const spellIdsToAdd: string[] = [];

  const spellGroupId = getSkillSpellGroupId(skill);

  if (spellGroupId && skillLevel) {
    const levels = getSpellLevelsForSkillLevel(skillLevel);

    const groupSpells = allSpells.filter(
      (spell) =>
        spell.spellGroup?.id === spellGroupId && levels.includes(spell.level),
    );

    spellIdsToAdd.push(...groupSpells.map((s) => s.id));
  }

  const spellNewSpellId = getSkillSpellNewSpellId(skill);

  if (spellNewSpellId) {
    spellIdsToAdd.push(spellNewSpellId);
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
  skillTreeProgress?: Record<
    string,
    { level?: SkillLevelType; unlockedSkills?: string[] }
  >,
): string[] {
  const newSpellIds: string[] = [];

  for (const skillId of unlockedSkillIds) {
    const skill = allSkills.find((s) => s.id === skillId);

    if (!skill) continue;

    let skillLevel: SkillLevelType | undefined;

    if (skillTreeProgress) {
      for (const [, progress] of Object.entries(skillTreeProgress)) {
        if (progress.unlockedSkills?.includes(skillId) && progress.level) {
          skillLevel = progress.level;

          break;
        }
      }
    }

    const spellsToAdd = getSpellsToAddForSkill(skill, allSpells, skillLevel);

    newSpellIds.push(...spellsToAdd);
  }

  return Array.from(new Set(newSpellIds));
}
