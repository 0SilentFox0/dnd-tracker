/**
 * Логіка злиття дерева скілів з main skills раси та формування mainSkillsForSelector.
 */

import { createMainSkillFromApi } from "@/lib/utils/skills/skill-tree-mock";
import type { MainSkill as MainSkillApi } from "@/types/main-skills";
import type { MainSkill, SkillTree } from "@/types/skill-tree";

export function mergeRaceMainSkillsIntoTree(
  baseSkillTree: SkillTree | null,
  selectedRaceObject: { availableSkills?: unknown } | null,
  mainSkills: Array<{ id: string; name?: string; spellGroupId?: string | null }>,
): SkillTree | null {
  const availableSkillsArray = Array.isArray(selectedRaceObject?.availableSkills)
    ? selectedRaceObject.availableSkills
    : [];

  if (
    !baseSkillTree ||
    !availableSkillsArray.length ||
    !mainSkills.length
  ) {
    return baseSkillTree;
  }

  const orderIds = availableSkillsArray.filter(
    (id: string) => id !== "racial" && id !== "ultimate",
  );

  const existingById = new Map(
    baseSkillTree.mainSkills.map((ms) => [ms.id, ms]),
  );

  const mergedMainSkills: MainSkill[] = [];

  for (const id of orderIds) {
    const existing = existingById.get(id);

    if (existing) {
      const apiMs = mainSkills.find((m) => m.id === id);

      mergedMainSkills.push({
        ...existing,
        ...(apiMs?.spellGroupId !== undefined && {
          spellGroupId: apiMs.spellGroupId ?? undefined,
        }),
      });
    } else {
      const apiMs = mainSkills.find((m) => m.id === id);

      if (apiMs) {
        mergedMainSkills.push(createMainSkillFromApi(apiMs as MainSkillApi));
      }
    }
  }

  for (const ms of baseSkillTree.mainSkills) {
    if (ms.id === "racial" || ms.id === "ultimate") {
      if (!mergedMainSkills.some((m) => m.id === ms.id)) {
        mergedMainSkills.push(ms);
      }
    }
  }

  if (!mergedMainSkills.some((m) => m.id === "racial")) {
    mergedMainSkills.push(
      createMainSkillFromApi({
        id: "racial",
        name: "Раса",
        color: "gainsboro",
        campaignId: baseSkillTree.campaignId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  return {
    ...baseSkillTree,
    mainSkills: mergedMainSkills,
  };
}

export function getMainSkillsForSelector(
  mainSkills: Array<{ id: string; name?: string }>,
  campaignId: string,
): Array<{
  id: string;
  name: string;
  color?: string;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}> {
  const hasRacial = mainSkills.some((m: { id: string }) => m.id === "racial");

  const hasUltimate = mainSkills.some((m: { id: string }) => m.id === "ultimate");

  if (hasRacial && hasUltimate) return mainSkills as never;

  const now = new Date().toISOString();

  return [
    ...mainSkills,
    ...(!hasRacial
      ? [
          {
            id: "racial",
            name: "Раса",
            color: "gainsboro",
            campaignId,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []),
    ...(!hasUltimate
      ? [
          {
            id: "ultimate",
            name: "Ультимат",
            color: "gainsboro",
            campaignId,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []),
  ] as never;
}
