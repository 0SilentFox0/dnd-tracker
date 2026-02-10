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
  SkillLevel,
  type SkillLevelType,
  type SkillTree,
} from "@/types/skill-tree";
import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";

// ---------------------------------------------------------------------------
//  Допоміжні типи і функції для роботи зі скілами з API
// ---------------------------------------------------------------------------

/** Скіл з API може мати spellGroupId у spellData, name у basicInfo */
type SkillLike = Skill & {
  spellData?: { spellGroupId?: string };
  basicInfo?: { name?: string };
  spellEnhancementData?: { spellNewSpellId?: string };
  spellGroup?: { id: string; name?: string } | null;
};

function getSkillSpellGroupId(skill: SkillLike): string | null | undefined {
  return (
    skill.spellGroupId ??
    skill.spellData?.spellGroupId ??
    skill.spellGroup?.id
  );
}

function getSkillName(skill: SkillLike): string {
  return skill.name ?? skill.basicInfo?.name ?? "";
}

function getSkillSpellNewSpellId(skill: SkillLike): string | null | undefined {
  return skill.spellNewSpellId ?? skill.spellEnhancementData?.spellNewSpellId;
}

// ---------------------------------------------------------------------------
//  Константи
// ---------------------------------------------------------------------------

const SKILL_LEVEL_ORDER: Record<SkillLevelType, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/** Формат ID рівня основної навички: ${mainSkillId}_${level}_level */
const MAIN_SKILL_LEVEL_RE = /_(basic|advanced|expert)_level$/;

// ---------------------------------------------------------------------------
//  Публічні утиліти
// ---------------------------------------------------------------------------

/**
 * Визначає рівні магії (кумулятивно) на основі прокачки школи магії.
 *   Базовий    → заклинання 1–2 рівня
 *   Просунутий → заклинання 1–4 рівня
 *   Експертний → заклинання 1–5 рівня
 */
export function getSpellLevelsForSkillLevel(
  skillLevel: SkillLevelType
): number[] {
  switch (skillLevel) {
    case SkillLevel.BASIC:
      return [1, 2];
    case SkillLevel.ADVANCED:
      return [1, 2, 3, 4];
    case SkillLevel.EXPERT:
      return [1, 2, 3, 4, 5];
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
 * Отримує всі заклинання, які мають бути автоматично додані при вивченні скілу.
 *
 * 1. Якщо скіл має spellGroupId → заклинання цієї групи відповідних рівнів
 * 2. Якщо скіл має spellNewSpellId → це окреме заклинання
 */
export function getSpellsToAddForSkill(
  skill: SkillLike,
  allSpells: Spell[],
  skillLevel?: SkillLevelType
): string[] {
  const spellIdsToAdd: string[] = [];

  const spellGroupId = getSkillSpellGroupId(skill);

  if (spellGroupId && skillLevel) {
    const levels = getSpellLevelsForSkillLevel(skillLevel);

    const groupSpells = allSpells.filter(
      (spell) =>
        spell.spellGroup?.id === spellGroupId && levels.includes(spell.level)
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
  skillTreeProgress?: Record<string, { level?: SkillLevelType; unlockedSkills?: string[] }>
): string[] {
  const newSpellIds: string[] = [];

  for (const skillId of unlockedSkillIds) {
    const skill = allSkills.find((s) => s.id === skillId);

    if (!skill) continue;

    let skillLevel: SkillLevelType | undefined;

    if (skillTreeProgress) {
      for (const [, progress] of Object.entries(skillTreeProgress)) {
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

  return Array.from(new Set(newSpellIds));
}

// ---------------------------------------------------------------------------
//  Внутрішні функції для getLearnedSpellIdsFromTree
// ---------------------------------------------------------------------------

/**
 * Будує мапу: id скіла з бібліотеки (у слоті дерева) → рівень у дереві.
 */
function buildSkillIdToLevelMap(
  skillTree: SkillTree | null,
  librarySkillIds: Set<string>
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

            const existingOrder = existing
              ? SKILL_LEVEL_ORDER[existing]
              : 0;

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
 * Формат: `${mainSkillId}_basic_level`, `${mainSkillId}_advanced_level`, `${mainSkillId}_expert_level`
 */
function parseMainSkillLevelId(
  skillId: string
): { mainSkillId: string; level: SkillLevelType } | null {
  const match = skillId.match(MAIN_SKILL_LEVEL_RE);

  if (!match) return null;

  const level = match[1] as SkillLevelType;

  const mainSkillId = skillId.slice(0, match.index);

  return mainSkillId ? { mainSkillId, level } : null;
}

/**
 * Обчислює ID заклинань з progress: main-skill-level (школи магії) та звичайні скіли з spellGroupId.
 * Для використання в бою, коли немає повного дерева скілів.
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
      // Звичайний скіл з бібліотеки (id скіла): якщо має spellGroupId — вважаємо базовий рівень школи
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

// ---------------------------------------------------------------------------
//  Основна функція — обчислення заклинань з дерева прокачки
// ---------------------------------------------------------------------------

/**
 * Обчислює список ID заклинань, вивчених героєм за прокачаними школами магії
 * (з дерева прокачки).
 *
 * Алгоритм:
 * 1. Проходимо по всіх unlockedSkills з progress.
 * 2. Для main-skill-level ID (формат ${mainSkillId}_${level}_level):
 *    - Знаходимо mainSkill у дереві.
 *    - Беремо mainSkill.spellGroupId — пряма прив'язка до групи заклинань.
 *    - Визначаємо рівень (basic/advanced/expert) з ID.
 * 3. Для звичайних скілів з бібліотеки:
 *    - Беремо spellGroupId з самого скіла.
 *    - Визначаємо рівень за позицією у дереві.
 * 4. Для кожної групи беремо максимальний рівень.
 * 5. Збираємо заклинання цієї групи з відповідних рівнів (кумулятивно).
 */
export function getLearnedSpellIdsFromTree(
  skillTree: SkillTree | null,
  progress: Record<string, { unlockedSkills?: string[] }>,
  allSkills: Skill[],
  allSpells: Spell[]
): string[] {
  const librarySkillIds = new Set(allSkills.map((s) => s.id));

  const skillIdToLevel = buildSkillIdToLevelMap(skillTree, librarySkillIds);

  /** spellGroupId → максимальний досягнутий рівень */
  const groupMaxLevel = new Map<string, SkillLevelType>();

  /** Окремі заклинання, додані через spellNewSpellId */
  const extraSpellIds = new Set<string>();

  const mainSkills = skillTree?.mainSkills ?? [];

  // Для логування
  const learnedLog: { skillId: string; name: string; level?: SkillLevelType; spellGroupId?: string }[] = [];

  const seen = new Set<string>();

  for (const [, treeProgress] of Object.entries(progress)) {
    const unlocked = treeProgress.unlockedSkills ?? [];

    for (const skillId of unlocked) {
      if (seen.has(skillId)) continue;

      seen.add(skillId);

      // ------ 1. Спробувати як main-skill-level ------
      const parsed = parseMainSkillLevelId(skillId);

      if (parsed) {
        const mainSkill = mainSkills.find((m) => m.id === parsed.mainSkillId);

        const spellGroupId = mainSkill?.spellGroupId;

        const displayName = mainSkill?.name
          ? `${mainSkill.name} (${parsed.level})`
          : skillId;

        learnedLog.push({
          skillId,
          name: displayName,
          level: parsed.level,
          spellGroupId: spellGroupId ?? undefined,
        });

        if (spellGroupId) {
          const current = groupMaxLevel.get(spellGroupId);

          const currentOrder = current ? SKILL_LEVEL_ORDER[current] : 0;

          if (SKILL_LEVEL_ORDER[parsed.level] > currentOrder) {
            groupMaxLevel.set(spellGroupId, parsed.level);
          }
        }

        continue;
      }

      // ------ 2. Звичайний скіл з бібліотеки ------
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

      if (newSpellId) {
        extraSpellIds.add(newSpellId);
      }
    }
  }

  // ------ Збираємо результат ------
  const result: string[] = [];

  for (const [groupId, level] of groupMaxLevel) {
    const spellLevels = getSpellLevelsForSkillLevel(level);

    const groupSpells = allSpells.filter(
      (s) => s.spellGroup?.id === groupId && spellLevels.includes(s.level)
    );

    result.push(...groupSpells.map((s) => s.id));
  }

  result.push(...extraSpellIds);

  // ------ Логування ------
  if (typeof window !== "undefined") {
    console.info("[Книга заклинань] Вивчені скіли:", learnedLog);

    const schoolsLog = Array.from(groupMaxLevel.entries()).map(
      ([groupId, level]) => {
        const groupName =
          allSpells.find((s) => s.spellGroup?.id === groupId)?.spellGroup
            ?.name ?? groupId;

        return { groupId, groupName, level };
      }
    );

    console.info("[Книга заклинань] Вивчені школи магії:", schoolsLog);

    console.info(
      "[Книга заклинань] Окремо додані заклинання (spellNewSpellId):",
      Array.from(extraSpellIds)
    );

    console.info(
      "[Книга заклинань] Всього ID заклинань у книзі:",
      result.length
    );
  }

  return Array.from(new Set(result));
}
