import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const INSPIRATION_META = {
    module: 'inspiration',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
} as const satisfies SystemMeta;
