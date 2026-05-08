/**
 * Хелпери для зчитування позицій (рівень + коло) скілів із SkillTree.skills JSON.
 *
 * Skill row у БД не зберігає level/circle — ці дані живуть лише в JSON
 * `SkillTree.skills` (per-race). Для довідника "вся кампанія" ми обходимо
 * усі дерева кампанії й беремо першу знайдену позицію для кожного skill id.
 */

import { getSkillName } from "./skill-helpers";

import type { GroupedSkill, Skill } from "@/types/skills";

export type SkillLevelKey = "basic" | "advanced" | "expert";

export interface SkillTreePosition {
  level: SkillLevelKey;
  circle: 1 | 2 | 3;
}

const LEVEL_KEYS: readonly SkillLevelKey[] = [
  "basic",
  "advanced",
  "expert",
] as const;

const CIRCLE_KEYS: readonly ["circle1" | "circle2" | "circle3", 1 | 2 | 3][] = [
  ["circle1", 1],
  ["circle2", 2],
  ["circle3", 3],
];

/**
 * Будує мапу skillId → позиція в дереві, обходячи всі передані дерева.
 * Перша знайдена позиція виграє.
 */
export function buildSkillPositionMap(
  skillTrees: Array<{ skills: unknown }>,
): Map<string, SkillTreePosition> {
  const result = new Map<string, SkillTreePosition>();

  for (const tree of skillTrees) {
    const mainSkills = Array.isArray(tree.skills) ? tree.skills : [];

    for (const ms of mainSkills) {
      if (!ms || typeof ms !== "object") continue;

      const levels = (ms as { levels?: unknown }).levels;

      if (!levels || typeof levels !== "object") continue;

      const levelMap = levels as Record<string, unknown>;

      for (const levelKey of LEVEL_KEYS) {
        const levelData = levelMap[levelKey];

        if (!levelData || typeof levelData !== "object") continue;

        const circles = levelData as Record<string, unknown>;

        for (const [circleKey, circleNum] of CIRCLE_KEYS) {
          const slots = circles[circleKey];

          if (!Array.isArray(slots)) continue;

          for (const slot of slots) {
            if (
              slot &&
              typeof slot === "object" &&
              "id" in slot &&
              typeof (slot as { id: unknown }).id === "string"
            ) {
              const id = (slot as { id: string }).id;

              if (!result.has(id)) {
                result.set(id, { level: levelKey, circle: circleNum });
              }
            }
          }
        }
      }
    }
  }

  return result;
}

export interface SkillsByLevel<T> {
  basic: T[];
  advanced: T[];
  expert: T[];
  /** Скіли, що не з'являються в жодному дереві кампанії */
  other: T[];
}

/**
 * Групує скіли за рівнем (basic/advanced/expert/other) на основі мапи позицій.
 * Усередині кожного рівня сортує по колу 1→3, потім за назвою.
 */
export function groupSkillsByLevel(
  skills: (Skill | GroupedSkill)[],
  positions: Map<string, SkillTreePosition>,
): SkillsByLevel<Skill | GroupedSkill> {
  const result: SkillsByLevel<Skill | GroupedSkill> = {
    basic: [],
    advanced: [],
    expert: [],
    other: [],
  };

  for (const skill of skills) {
    const pos = positions.get(skill.id);

    if (pos) {
      result[pos.level].push(skill);
    } else {
      result.other.push(skill);
    }
  }

  const sortByCircleThenName = (
    a: Skill | GroupedSkill,
    b: Skill | GroupedSkill,
  ) => {
    const ca = positions.get(a.id)?.circle ?? Number.POSITIVE_INFINITY;

    const cb = positions.get(b.id)?.circle ?? Number.POSITIVE_INFINITY;

    if (ca !== cb) return ca - cb;

    return getSkillName(a).localeCompare(getSkillName(b));
  };

  result.basic.sort(sortByCircleThenName);
  result.advanced.sort(sortByCircleThenName);
  result.expert.sort(sortByCircleThenName);
  result.other.sort(sortByCircleThenName);

  return result;
}

export const SKILL_LEVEL_LABEL: Record<SkillLevelKey | "other", string> = {
  basic: "Базовий",
  advanced: "Просунутий",
  expert: "Експертний",
  other: "Інше",
};
