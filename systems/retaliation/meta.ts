import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const RETALIATION_META = {
    module: 'retaliation',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    after: ['opportunity'],
    i18n: {},
    vocab: {
        actionTypes: [
            {
                id: 'retaliation',
                counter: true,
                serverLabel: true,
                fx: 'attack',
            },
        ],
    },
} as const satisfies SystemMeta;
