import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const LAIR_META = {
    module: 'lair',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
} as const satisfies SystemMeta;
