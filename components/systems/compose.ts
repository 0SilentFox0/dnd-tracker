import type { SystemUi } from './types';

import { type Addon, composeParts } from '@/lib/utils/rules/systems/compose';

export const useNoSkillSummary = (): { treeSkillCount: number | null } => ({
    treeSkillCount: 0,
});

export const composeUi = (
    base: SystemUi,
    addons: readonly Addon<SystemUi>[]
): SystemUi => {
    const ui = composeParts(base, addons, {
        dictionaries: ['rulesSections', 'rulesItems', 'dmPages', 'fx.badges'],
    });

    return ui.races
        ? ui
        : { ...ui, races: { useSkillSummary: useNoSkillSummary } };
};
