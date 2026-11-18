import { INSPIRATION_OPERATIONS } from './operation';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const INSPIRATION_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    operations: INSPIRATION_OPERATIONS,
    routes: {
        character: {
            'inspiration.set': { POST: { operation: 'inspiration' } },
        },
    },
}));
