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
    whatsNew: [
        { id: '2026-11-14-d20-modules', date: '2026-11-14', audience: 'dm' },
    ],
} as const satisfies SystemMeta;
