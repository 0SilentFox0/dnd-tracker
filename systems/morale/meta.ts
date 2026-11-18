import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const MORALE_META = {
    module: 'morale',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    characteristicsColumns: [
        { column: 'morale', path: ['ext', 'morale', 'value'] },
    ],
    i18n: {
        battle: ['battleMorale'],
        rules: ['rulesMorale'],
        log: ['moraleLog'],
        legacyKeys: {
            'battleLog.morale.': 'moraleLog.check.',
            'battleLog.reject.moraleFirst': 'moraleLog.rejectFirst',
            'battleCommon.actionKinds.morale_skip': 'moraleLog.actionKind',
        },
    },
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
        logFields: [{ id: 'morale', code: 'm', prefix: 'moraleLog.check.' }],
        actionTypes: [{ id: 'morale_skip', logged: true }],
        unitImportFields: [{ id: 'morale', type: 'int' }],
    },
} as const satisfies SystemMeta;
