import type { Prisma } from '@prisma/client';

import { skillTreeContext } from './context';

import { prisma } from '@/lib/db';
import type { CharacterContextLoader } from '@/lib/server/systems/types';
import { referencedSkillIds } from '@/lib/utils/battle/participant/extract-skills';
import type { CharacterFromPrisma } from '@/lib/utils/battle/types/participant';
import { normalizeTree, resolveLearned } from '@/lib/utils/skills/progression';

type Tree = Prisma.SkillTreeGetPayload<object>;

function learnedNeeds(character: CharacterFromPrisma, tree: Tree | null) {
    const normalized = tree ? normalizeTree(tree) : null;

    const learned = normalized
        ? resolveLearned(normalized, character.skillTreeProgress)
        : [];

    return {
        learned: learned.length > 0,
        skillIds: referencedSkillIds([character], tree ? [tree] : []),
        branchIds: normalized?.branches.map((b) => b.id) ?? [],
        branchGroupIds: (normalized?.branches ?? []).flatMap((b) =>
            b.spellGroupId ? [b.spellGroupId] : []
        ),
    };
}

type LearnedNeeds = ReturnType<typeof learnedNeeds>;

async function loadLibrary(campaignId: string, needs: LearnedNeeds) {
    if (!(needs.skillIds.length > 0 || needs.learned)) return null;

    return prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
            ...(needs.skillIds.length > 0 && {
                skills: { where: { id: { in: needs.skillIds } } },
            }),
            ...(needs.learned && {
                mainSkills: {
                    where: { id: { in: needs.branchIds } },
                    select: {
                        id: true,
                        spellGroupId: true,
                        name: true,
                        role: true,
                    },
                },
                spells: {
                    where: {
                        OR: [
                            { groupId: { in: needs.branchGroupIds } },
                            {
                                spellGroup: {
                                    mainSkills: {
                                        some: { id: { in: needs.branchIds } },
                                    },
                                },
                            },
                            {
                                spellGroup: {
                                    skills: {
                                        some: { id: { in: needs.skillIds } },
                                    },
                                },
                            },
                        ],
                    },
                    select: { id: true, level: true, groupId: true },
                },
            }),
        },
    });
}

export const skillTreeCharacterContext: CharacterContextLoader = {
    load: async ({ character, campaignId }) => {
        const tree: Tree | null = await prisma.skillTree.findFirst({
            where: { campaignId, race: character.race },
        });

        const library = await loadLibrary(
            campaignId,
            learnedNeeds(character, tree)
        );

        const holder = { ext: {} };

        skillTreeContext.write(holder, {
            treeByRace: { [character.race]: tree },
            mainSkills: library?.mainSkills ?? [],
        });

        return {
            ext: holder.ext,
            tree,
            skills: library?.skills ?? [],
            spells: (library?.spells ?? []).map((s) => ({
                id: s.id,
                level: s.level,
                spellGroup: s.groupId ? { id: s.groupId } : null,
            })),
        };
    },
};
