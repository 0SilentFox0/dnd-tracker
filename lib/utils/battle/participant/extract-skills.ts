import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import type { SkillEntry } from "@/lib/utils/abilities/build/collect";
import { normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";

/** Скіли, на які посилаються вивчені вузли дерева раси персонажів і їхні personalSkillId. */
export function referencedSkillIds(
  characters: Array<Pick<CharacterFromPrisma, "race" | "skillTreeProgress" | "personalSkillId">>,
  trees: Array<Prisma.SkillTreeGetPayload<object>>,
): string[] {
  const treeByRace = new Map(trees.map((t) => [t.race, t]));

  const ids = new Set<string>();

  for (const c of characters) {
    const tree = treeByRace.get(c.race);

    if (tree) {
      for (const n of resolveLearned(normalizeTree(tree), c.skillTreeProgress)) if (n.skillId) ids.add(n.skillId);
    }

    const personal = c.personalSkillId?.trim();

    if (personal) ids.add(personal);
  }

  return [...ids];
}

export type SkillRowEntry = SkillEntry & { row: Prisma.SkillGetPayload<object> };
