import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const LAIR_META = {
    module: 'lair',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {},
    vocab: {
        abilityLimitFlags: [
            { id: 'lair', clears: ['legendaryCost'], needsActionTrigger: true },
        ],
        legendaryKinds: [{ id: 'lair', lair: true }],
    },
} as const satisfies SystemMeta;
