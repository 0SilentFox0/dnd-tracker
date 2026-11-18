import type { SystemBalance } from '@/lib/server/systems/types';
import { applyBakedAuras } from '@/lib/utils/abilities/build/bake';
import {
    getCharacterStats,
    magicMainSkillIds,
} from '@/lib/utils/battle/balance';
import { defineContextExt } from '@/lib/utils/battle/types/context-ext';
import {
    branchLevels,
    normalizeTree,
    resolveLearned,
} from '@/lib/utils/skills/progression';

/** Slice written by the skill-tree module; a base cannot import its addon, so the key and the read shape are repeated here */
const skillTreeContext = defineContextExt<{
    treeByRace: Record<string, Parameters<typeof normalizeTree>[0] | null>;
    mainSkills: Parameters<typeof magicMainSkillIds>[0];
    progress?: Record<string, unknown>;
}>('skilltrees');

export const D20_BALANCE: SystemBalance = {
    heroPower: ({ built, rules, character, campaignContext }) => {
        const [participant] = applyBakedAuras(
            [built],
            new Set([built.basicInfo.id])
        );

        const treeCtx = skillTreeContext.read(campaignContext);

        const row = character.row as { id?: string; skillTreeProgress?: unknown };

        const progress =
            (row.id ? treeCtx?.progress?.[row.id] : undefined) ??
            row.skillTreeProgress;

        const treeRow = treeCtx?.treeByRace[character.race];

        const levels = treeRow
            ? branchLevels(resolveLearned(normalizeTree(treeRow), progress))
            : {};

        const mainSkills = treeCtx?.mainSkills ?? [];

        return {
            levels,
            stats: getCharacterStats({
                participant,
                rules,
                branchLevels: levels,
                magicMainSkillIds: magicMainSkillIds(mainSkills),
            }),
        };
    },
    edition: (rules) => rules.encounters.edition,
    unitStats: (base) => base,
};
