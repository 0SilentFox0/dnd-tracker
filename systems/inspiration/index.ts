import { INSPIRATION_RULES } from './rules/inspiration';
import { inspirationFromStored, inspirationPersist } from './rules/state-parts';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const INSPIRATION_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: { inspiration: INSPIRATION_RULES },
    participant: {
        fromStored: [inspirationFromStored],
        persist: [inspirationPersist],
    },
}));
