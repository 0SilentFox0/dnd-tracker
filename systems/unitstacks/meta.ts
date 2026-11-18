import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

/** Marker module: the stacking mechanism is core, this module only flags a composition as using it and has no rule hooks or claims. */
export const UNITSTACKS_META = {
    module: 'unitstacks',
    kind: 'addon',
    keys: [],
    aliases: ['unitStack'],
    requires: ['d20'],
    i18n: {},
} as const satisfies SystemMeta;
