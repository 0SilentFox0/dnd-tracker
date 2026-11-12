import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const D6POOL_META = {
    module: 'd6pool',
    keys: ['d6pool'],
    distance: { unit: 'yd', perCell: 1 },
    i18n: { battle: ['battleD6pool'], pages: { draft: ['d6poolCreation'] } },
} as const satisfies SystemMeta;
