import type { D20Rules } from '@/lib/utils/rules/legacy-sections';
import type { Ruleset } from '@/lib/utils/rules/section-shapes';

export const d20Rules = ({
    criticals,
    formulas,
    initiative,
    saves,
    deathSaves,
    concentration,
    conditions,
    classes,
    outOfCombat,
    encounters,
    items,
    actions,
}: Ruleset): D20Rules => {
    const { retaliation: _retaliation, ...d20Actions } = actions;

    return {
        criticals,
        formulas,
        initiative,
        saves,
        deathSaves,
        concentration,
        conditions,
        classes,
        outOfCombat,
        encounters,
        items,
        actions: d20Actions,
    };
};
