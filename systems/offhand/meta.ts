import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const OFFHAND_META = {
    module: 'offhand',
    kind: 'addon',
    keys: [],
    aliases: ['offHand'],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
} as const satisfies SystemMeta;
