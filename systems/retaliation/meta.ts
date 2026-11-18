import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const RETALIATION_META = {
    module: 'retaliation',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    after: ['opportunity'],
    i18n: {
        log: ['retaliationLog'],
        legacyKeys: {
            'battleLog.offTurn.titles.retaliation': 'retaliationLog.title',
            'battleLog.offTurn.nouns.retaliation': 'retaliationLog.noun',
            'battleCommon.actionKinds.retaliation': 'retaliationLog.actionKind',
            'battle.result.retaliation': 'retaliationLog.result',
        },
    },
    vocab: {
        actionTypes: [
            {
                id: 'retaliation',
                counter: true,
                serverLabel: true,
                fx: 'attack',
                logged: true,
                blockFlag: 'noRetaliation',
                label: {
                    title: 'retaliationLog.title',
                    noun: 'retaliationLog.noun',
                },
            },
        ],
    },
} as const satisfies SystemMeta;
