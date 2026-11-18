import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const MORALE_META = {
    module: 'morale',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    i18n: { battle: ['battleMorale'], rules: ['rulesMorale'] },
    vocab: {
        abilityStats: [
            {
                id: 'morale',
                baked: true,
                timed: true,
                capped: true,
                defaultValue: 0,
                sheetKey: 'morale',
                needsDuration: true,
                areaOk: true,
                fearBlock: true,
            },
        ],
        combatStats: [{ id: 'morale', hidden: true, neutral: 0 }],
        rollKinds: [{ id: 'morale', after: 'heal' }],
        logFields: [{ id: 'morale', code: 'm' }],
        unitImportFields: [{ id: 'morale', type: 'int' }],
    },
} as const satisfies SystemMeta;
