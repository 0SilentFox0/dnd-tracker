import { opportunityOnMove } from './rules/on-move';
import { d20ProvokedOpportunity } from './rules/provoked';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const OPPORTUNITY_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: {
        actions: { onMove: [opportunityOnMove] },
        afterAttack: [d20ProvokedOpportunity],
    },
}));
