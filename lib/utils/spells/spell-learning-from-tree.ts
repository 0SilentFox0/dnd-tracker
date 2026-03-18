/**
 * Обчислення вивчених заклинань з дерева прокачки та з progress (без дерева).
 */

import {
  getSkillName,
  getSkillSpellGroupId,
  getSkillSpellNewSpellId,
  getSpellLevelsForSkillLevel,
  MAIN_SKILL_LEVEL_RE,
  SKILL_LEVEL_ORDER,
  type SkillLike,
} from "./spell-learning-internals";

import { SkillLevel, type SkillLevelType, type SkillTree } from "@/types/skill-tree";
import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";

/**
 * Будує мапу: id скіла з бібліотеки (у слоті дерева) → рівень у дереві.
 */
function buildSkillIdToLevelMap(
  skillTree: SkillTree | null,
  librarySkillIds: Set<string>,
): Map<string, SkillLevelType> {
  const map = new Map<string, SkillLevelType>();

  if (!skillTree?.mainSkills) return map;

  const levels: SkillLevelType[] = [
    SkillLevel.BASIC,
    SkillLevel.ADVANCED,
    SkillLevel.EXPERT,
  ];

  for (const mainSkill of skillTree.mainSkills) {
    for (const level of levels) {
      const circles = mainSkill.levels[level] as {
        circle1: { id: string }[];
        circle2: { id: string }[];
        circle3: { id: string }[];
      };

      for (const circle of [circles.circle1, circles.circle2, circles.circle3]) {
        for (const slot of circle || []) {
          if (librarySkillIds.has(slot.id)) {
            const existing = map.get(slot.id);

            const existingOrder = existing ? SKILL_LEVEL_ORDER[existing] : 0;

            if (SKILL_LEVEL_ORDER[level] >= existingOrder) {
              map.set(slot.id, level);
            }
          }
        }
      }
    }
  }

  return map;
}

/**
 * Парсить ID рівня основної навички.
 */
function parseMainSkillLevelId(
  skillId: string,
): { mainSkillId: string; level: SkillLevelType } | null {
  const match = skillId.match(MAIN_SKILL_LEVEL_RE);

  if (!match) return null;

  const level = match[1] as SkillLevelType;

  const mainSkillId = skillId.slice(0, match.index);

  return mainSkillId ? { mainSkillId, level } : null;
}

/**
 * Обчислює ID заклинань з progress: main-skill-level (школи магії) та звичайні скіли з spellGroupId.
 */
export function getLearnedSpellIdsFromProgress(
  progress: Record<string, { unlockedSkills?: string[] }>,
  mainSkills: Array<{ id: string; spellGroupId?: string | null }>,
  spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }>,
  librarySkills?: Array<{ id: string; spellGroupId?: string | null }>,
): string[] {
  const groupMaxLevel = new Map<string, SkillLevelType>();

  for (const treeProgress of Object.values(progress)) {
    const unlocked = treeProgress.unlockedSkills ?? [];

    for (const skillId of unlocked) {
      const parsed = parseMainSkillLevelId(skillId);

      if (parsed) {
        const mainSkill = mainSkills.find((m) => m.id === parsed.mainSkillId);

        const spellGroupId = mainSkill?.spellGroupId;

        if (!spellGroupId) continue;

        const current = groupMaxLevel.get(spellGroupId);

        const currentOrder = current ? SKILL_LEVEL_ORDER[current] : 0;

        if (SKILL_LEVEL_ORDER[parsed.level] > currentOrder) {
          groupMaxLevel.set(spellGroupId, parsed.level);
        }

        continue;
      }

      if (librarySkills?.length) {
        const skill = librarySkills.find((s) => s.id === skillId);

        const spellGroupId = skill?.spellGroupId;

        if (spellGroupId) {
          const current = groupMaxLevel.get(spellGroupId);

          const currentOrder = current ? SKILL_LEVEL_ORDER[current] : 0;

          if (SKILL_LEVEL_ORDER[SkillLevel.BASIC] > currentOrder) {
            groupMaxLevel.set(spellGroupId, SkillLevel.BASIC);
          }
        }
      }
    }
  }

  const result: string[] = [];

  for (const [groupId, level] of groupMaxLevel) {
    const spellLevels = getSpellLevelsForSkillLevel(level);

    const groupSpells = spells.filter(
      (s) => s.spellGroup?.id === groupId && spellLevels.includes(s.level),
    );

    result.push(...groupSpells.map((s) => s.id));
  }

  return Array.from(new Set(result));
}

/**
 * Обчислює список ID заклинань, вивчених героєм за прокачаними школами магії (з дерева прокачки).
 */
export function getLearnedSpellIdsFromTree(
  skillTree: SkillTree | null,
  progress: Record<string, { unlockedSkills?: string[] }>,
  allSkills: Skill[],
  allSpells: Spell[],
): string[] {
  const librarySkillIds = new Set(allSkills.map((s) => s.id));

  const skillIdToLevel = buildSkillIdToLevelMap(skillTree, librarySkillIds);

  const groupMaxLevel = new Map<string, SkillLevelType>();

  const extraSpellIds = new Set<string>();

  const mainSkills = skillTree?.mainSkills ?? [];

  const learnedLog: { skillId: string; name: string; level?: SkillLevelType; spellGroupId?: string }[] = [];

  const seen = new Set<string>();

  for (const [, treeProgress] of Object.entries(progress)) {
    const unlocked = treeProgress.unlockedSkills ?? [];

    for (const skillId of unlocked) {
      if (seen.has(skillId)) continue;

      seen.add(skillId);

      const parsed = parseMainSkillLevelId(skillId);

      if (parsed) {
        const mainSkill = mainSkills.find((m) => m.id === parsed.mainSkillId);

        const spellGroupId = mainSkill?.spellGroupId;

        const displayName = mainSkill?.name ? `${mainSkill.name} (${parsed.level})` : skillId;

        learnedLog.push({ skillId, name: displayName, level: parsed.level, spellGroupId: spellGroupId ?? undefined });

        if (spellGroupId) {
          const current = groupMaxLevel.get(spellGroupId);

          const currentOrder = current ? SKILL_LEVEL_ORDER[current] : 0;

          if (SKILL_LEVEL_ORDER[parsed.level] > currentOrder) {
            groupMaxLevel.set(spellGroupId, parsed.level);
          }
        }

        continue;
      }

      const skill = allSkills.find((s) => s.id === skillId) as SkillLike | undefined;

      if (!skill) continue;

      const spellGroupId = getSkillSpellGroupId(skill);

      const level = skillIdToLevel.get(skillId) ?? (spellGroupId ? SkillLevel.BASIC : undefined);

      learnedLog.push({
        skillId,
        name: getSkillName(skill),
        level,
        spellGroupId: spellGroupId ?? undefined,
      });

      if (spellGroupId && level) {
        const current = groupMaxLevel.get(spellGroupId);

        const currentOrder = current ? SKILL_LEVEL_ORDER[current] : 0;

        if (SKILL_LEVEL_ORDER[level] > currentOrder) {
          groupMaxLevel.set(spellGroupId, level);
        }
      }

      const newSpellId = getSkillSpellNewSpellId(skill);

      if (newSpellId) extraSpellIds.add(newSpellId);
    }
  }

  const result: string[] = [];

  for (const [groupId, level] of groupMaxLevel) {
    const spellLevels = getSpellLevelsForSkillLevel(level);

    const groupSpells = allSpells.filter(
      (s) => s.spellGroup?.id === groupId && spellLevels.includes(s.level),
    );

    result.push(...groupSpells.map((s) => s.id));
  }
  result.push(...extraSpellIds);

  if (typeof window !== "undefined") {
    console.info("[Книга заклинань] Вивчені скіли:", learnedLog);

    const schoolsLog = Array.from(groupMaxLevel.entries()).map(([groupId, level]) => {
      const groupName = allSpells.find((s) => s.spellGroup?.id === groupId)?.spellGroup?.name ?? groupId;

      return { groupId, groupName, level };
    });

    console.info("[Книга заклинань] Вивчені школи магії:", schoolsLog);
    console.info("[Книга заклинань] Окремо додані заклинання (spellNewSpellId):", Array.from(extraSpellIds));
    console.info("[Книга заклинань] Всього ID заклинань у книзі:", result.length);
  }

  return Array.from(new Set(result));
}
