import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const OPPORTUNITY_META = {
    module: 'opportunity',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
} as const satisfies SystemMeta;
