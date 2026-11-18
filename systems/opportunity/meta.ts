import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const OPPORTUNITY_META = {
    module: 'opportunity',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
    vocab: {
        actionTypes: [
            {
                id: 'opportunity',
                counter: true,
                serverLabel: true,
                label: {
                    title: 'battleLog.offTurn.titles.opportunity',
                    noun: 'battleLog.offTurn.nouns.opportunity',
                },
            },
        ],
    },
} as const satisfies SystemMeta;
