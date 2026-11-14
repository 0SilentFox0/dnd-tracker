import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const D20_META = {
    module: 'd20',
    kind: 'base',
    previewSandbox: true,
    keys: ['d20'],
    tokens: ['dnd5e'],
    distance: { unit: 'ft', perCell: 5 },
    i18n: {},
    dmSections: ['classes', 'backgrounds'],
    contentKinds: ['classes', 'backgrounds'],
} as const satisfies SystemMeta;
