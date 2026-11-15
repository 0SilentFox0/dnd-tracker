import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const RETALIATION_META = {
    module: 'retaliation',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    after: ['opportunity'],
    i18n: {},
} as const satisfies SystemMeta;
