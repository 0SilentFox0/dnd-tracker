import { skillTreeContext } from './context';

import { prisma } from '@/lib/db';
import type { ContextPreparer } from '@/lib/server/systems/types';
import { referencedSkillIds } from '@/lib/utils/battle/participant/extract-skills';
import { normalizeTree } from '@/lib/utils/skills/progression';

export const prepareSkillTreeContext: ContextPreparer = async (
    campaignId,
    context,
    { characters }
) => {
    const races = [...new Set(characters.map((c) => c.race).filter(Boolean))];

    const trees =
        characters.length > 0 && races.length > 0
            ? await prisma.skillTree.findMany({
                  where: { campaignId, race: { in: races } },
              })
            : [];

    const treeByRace: Record<string, (typeof trees)[number] | null> = {};

    for (const tree of trees) treeByRace[tree.race] = tree;

    for (const race of races) treeByRace[race] ??= null;

    const skillIds = referencedSkillIds(characters, trees);

    const branchIds = [
        ...new Set(
            trees.flatMap((t) => normalizeTree(t).branches.map((b) => b.id))
        ),
    ];

    const [skills, mainSkills] = await Promise.all([
        skillIds.length > 0
            ? prisma.skill.findMany({
                  where: { campaignId, id: { in: skillIds } },
              })
            : [],
        branchIds.length > 0
            ? prisma.mainSkill.findMany({
                  where: { campaignId, id: { in: branchIds } },
                  select: {
                      id: true,
                      spellGroupId: true,
                      name: true,
                      role: true,
                  },
              })
            : [],
    ]);

    context.allSkills = [...context.allSkills, ...skills];
    context.skillsById = {
        ...context.skillsById,
        ...Object.fromEntries(skills.map((s) => [s.id, s])),
    };
    skillTreeContext.write(context, { treeByRace, mainSkills });
};
