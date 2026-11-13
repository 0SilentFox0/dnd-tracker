import type { SystemBalance } from '@/lib/server/systems/types';
import { applyBakedAuras } from '@/lib/utils/abilities/build/bake';
import {
    getCharacterStats,
    magicMainSkillIds,
} from '@/lib/utils/battle/balance';
import {
    branchLevels,
    normalizeTree,
    resolveLearned,
} from '@/lib/utils/skills/progression';

export const D20_BALANCE: SystemBalance = {
    heroPower: ({ built, character, campaignContext }) => {
        const [participant] = applyBakedAuras(
            [built],
            new Set([built.basicInfo.id])
        );

        const treeRow = campaignContext?.skillTreeByRace[character.race];

        const levels = treeRow
            ? branchLevels(
                  resolveLearned(
                      normalizeTree(treeRow),
                      character.skillTreeProgress
                  )
              )
            : {};

        const mainSkills = campaignContext?.mainSkills ?? [];

        return {
            levels,
            stats: getCharacterStats({
                participant,
                branchLevels: levels,
                magicMainSkillIds: magicMainSkillIds(mainSkills),
            }),
        };
    },
    edition: (rules) => rules.encounters.edition,
    unitStats: (base) => base,
};
