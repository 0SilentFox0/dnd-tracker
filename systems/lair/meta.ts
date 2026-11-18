import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const LAIR_META = {
    module: 'lair',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    toggle: 'free',
    i18n: {
        log: ['lairLog'],
        legacyKeys: {
            'battleLog.reject.abilityIsLair': 'lairLog.rejectAbility',
            'battleLog.dm.lairIn': 'lairLog.dmIn',
            'battleLog.dm.lairOut': 'lairLog.dmOut',
            'battleLog.legendary.useLair': 'lairLog.use',
            'battleLog.legendary.runLair': 'lairLog.run',
            'battleLog.round.lair': 'lairLog.round',
        },
    },
    vocab: {
        abilityLimitFlags: [
            { id: 'lair', clears: ['legendaryCost'], needsActionTrigger: true },
        ],
        legendaryKinds: [{ id: 'lair', lair: true }],
    },
} as const satisfies SystemMeta;
