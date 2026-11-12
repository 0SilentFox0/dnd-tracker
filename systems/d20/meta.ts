import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const D20_META = {
    module: 'd20',
    kind: 'base',
    keys: ['dnd5e'],
    tokens: ['dnd5e'],
    distance: { unit: 'ft', perCell: 5 },
    i18n: {},
    contentKinds: ['classes', 'backgrounds'],
} as const satisfies SystemMeta;
