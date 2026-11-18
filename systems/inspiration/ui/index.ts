import { InspirationItem } from './InspirationItem';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const INSPIRATION_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesItems: { 'outOfCombat.inspiration': InspirationItem },
}));
