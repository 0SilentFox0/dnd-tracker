import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const UNITSTACKS_META = {
    module: 'unitstacks',
    kind: 'addon',
    keys: [],
    requires: ['d20'],
    claims: ['combat.hitModel.damage'],
    i18n: {},
} as const satisfies SystemMeta;
