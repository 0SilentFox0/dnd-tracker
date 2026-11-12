import { SKILLTREES_OPERATIONS } from './operations';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const SKILLTREES_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    operations: SKILLTREES_OPERATIONS,
}));
