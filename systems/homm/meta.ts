import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const HOMM_META = {
    module: 'homm',
    kind: 'preset',
    keys: ['homm'],
    tokens: ['homm'],
    preset: {
        base: 'd20',
        modules: [
            'morale',
            'retaliation',
            'heroscaling',
            'skilltrees',
            'artifactsets',
            'unitstacks',
            'deathsaves',
            'inspiration',
            'lair',
            'offhand',
            'opportunity',
        ],
    },
    i18n: {},
} as const satisfies SystemMeta;
