import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/utils/logger";
import { normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";
import { learnedSpellIdsFromNodes, toSpellSkillInfo } from "@/lib/utils/spells";

export async function resolveLearnedSpellsFromCharacter(character: CharacterFromPrisma, baseKnownSpells: string[], context?: CampaignSpellContext): Promise<string[]> {
  try {
    const treeRow = context ? (context.skillTreeByRace[character.race] ?? null) : await prisma.skillTree.findFirst({ where: { campaignId: character.campaignId, race: character.race } });

    if (!treeRow) return baseKnownSpells;

    const tree = normalizeTree(treeRow);

    const learned = resolveLearned(tree, character.skillTreeProgress);

    if (learned.length === 0) return baseKnownSpells;

    const skillIds = learned.map((n) => n.skillId).filter((id): id is string => !!id);

    const branchIds = tree.branches.map((b) => b.id);

    const [skills, spells, mainSkills] = context
      ? [context.allSkills.filter((s) => skillIds.includes(s.id)), context.spells, context.mainSkills]
      : await Promise.all([
          prisma.skill.findMany({ where: { campaignId: character.campaignId, id: { in: skillIds } } }),
          prisma.spell.findMany({ where: { campaignId: character.campaignId }, select: { id: true, level: true, spellGroup: { select: { id: true } } } }),
          prisma.mainSkill.findMany({ where: { id: { in: branchIds } }, select: { id: true, spellGroupId: true } }),
        ]);

    const branchSpellGroup = Object.fromEntries(tree.branches.map((b) => [b.id, mainSkills.find((m) => m.id === b.id)?.spellGroupId ?? b.spellGroupId]));

    const fromTree = learnedSpellIdsFromNodes(learned, {
      branchSpellGroup,
      skills: Object.fromEntries(skills.map((s) => [s.id, toSpellSkillInfo(s as never)])),
      spells,
    });

    return [...new Set([...baseKnownSpells, ...fromTree])];
  } catch (e) {
    logger.error("[battle/learned-spells] load from tree failed", { characterId: character.id, race: character.race }, e);

    return baseKnownSpells;
  }
}
