import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const DND5E_META = {
    module: 'dnd5e',
    kind: 'preset',
    keys: ['dnd5e'],
    fallback: true,
    tokens: ['dnd5e'],
    preset: {
        base: 'd20',
        modules: [
            'deathsaves',
            'inspiration',
            'lair',
            'offhand',
            'opportunity',
        ],
    },
    i18n: {},
} as const satisfies SystemMeta;
