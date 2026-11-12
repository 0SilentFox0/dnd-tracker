import { z } from 'zod';

import type { SystemBalance, SystemServer } from '@/lib/server/systems/types';

export const D6POOL_SERVER: SystemServer = {
    balance: {
        heroPower: () => ({
            levels: {},
            stats: {} as ReturnType<SystemBalance['heroPower']>['stats'],
        }),
        unitStats: (base) => base,
        readsBuiltRules: false,
    },
    schemas: { characteristics: z.object({ pool: z.number().int().min(1) }) },
};
