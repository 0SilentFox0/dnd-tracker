import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const OFFHAND_META = {
    module: 'offhand',
    kind: 'addon',
    keys: [],
    aliases: ['offHand'],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
    vocab: {
        equipSlots: [{ id: 'offHand', weapon: true, needsLight: true }],
    },
} as const satisfies SystemMeta;
