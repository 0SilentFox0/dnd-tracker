import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const INSPIRATION_META = {
    module: 'inspiration',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    characteristicsColumns: [
        { column: 'inspiration', path: ['ext', 'inspiration', 'available'] },
    ],
    i18n: {
        campaign: ['inspiration'],
        rules: ['rulesInspiration'],
        log: ['inspirationLog'],
        legacyKeys: {
            'battleLog.rollMode.inspiration': 'inspirationLog.rollMode',
        },
    },
    vocab: {
        characterLogTypes: [{ id: 'inspiration', toggle: true }],
    },
} as const satisfies SystemMeta;
