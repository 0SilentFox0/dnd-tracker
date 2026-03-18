/**
 * Визначення списку вивчених заклинань з character (skill tree / progress)
 */

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import {
  getLearnedSpellIdsFromProgress,
  getLearnedSpellIdsFromTree,
} from "@/lib/utils/spells";
import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";

export async function resolveLearnedSpellsFromCharacter(
  character: CharacterFromPrisma,
  baseKnownSpells: string[],
  context?: CampaignSpellContext,
): Promise<string[]> {
  let knownSpells = baseKnownSpells;

  try {
    const progress =
      (character.skillTreeProgress as Record<string, { unlockedSkills?: string[] }>) ?? {};

    const rawSkillTree = context
      ? context.skillTreeByRace[character.race]
      : await prisma.skillTree.findFirst({
          where: {
            campaignId: character.campaignId,
            race: character.race,
          },
        });

    const mainSkills = context ? context.mainSkills : await prisma.mainSkill.findMany({
      where: { campaignId: character.campaignId },
      select: { id: true, spellGroupId: true, name: true },
    });

    const spells = context ? context.spells : await prisma.spell.findMany({
      where: { campaignId: character.campaignId },
      include: { spellGroup: { select: { id: true } } },
    });

    const allSkills = context ? context.allSkills : await prisma.skill.findMany({
      where: { campaignId: character.campaignId },
      include: { spellGroup: { select: { id: true } } },
    });

    const spellsForLearning = spells as unknown as Spell[];

    const skillsForLearning = allSkills as unknown as Skill[];

    let learnedFromTree: string[] = [];

    if (rawSkillTree && Object.keys(progress).length > 0) {
      const skillTree = convertPrismaToSkillTree({
        ...rawSkillTree,
        createdAt:
          rawSkillTree.createdAt instanceof Date
            ? rawSkillTree.createdAt
            : new Date(String(rawSkillTree.createdAt)),
      });

      if (
        skillTree &&
        mainSkills.length > 0 &&
        skillsForLearning.length > 0 &&
        spellsForLearning.length > 0
      ) {
        const treeWithSpellGroups = {
          ...skillTree,
          mainSkills: skillTree.mainSkills.map((ms) => {
            const apiMs = mainSkills.find((m) => m.id === ms.id);

            return apiMs?.spellGroupId
              ? { ...ms, spellGroupId: apiMs.spellGroupId }
              : ms;
          }),
        };

        learnedFromTree = getLearnedSpellIdsFromTree(
          treeWithSpellGroups,
          progress,
          skillsForLearning,
          spellsForLearning,
        );
      }
    }

    if (learnedFromTree.length === 0) {
      const librarySkills = skillsForLearning.filter((s) => s.spellGroupId != null);

      learnedFromTree = getLearnedSpellIdsFromProgress(
        progress,
        mainSkills,
        spellsForLearning,
        librarySkills,
      );
    }

    if (learnedFromTree.length > 0) {
      knownSpells = Array.from(new Set([...baseKnownSpells, ...learnedFromTree]));
    }
  } catch (e) {
    console.error("Error loading learned spells from tree:", e);
  }

  return knownSpells;
}
