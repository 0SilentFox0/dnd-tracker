import { OFF_HAND_RULES, offHandResetState } from './rules/off-hand';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const OFFHAND_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: {
        secondaryAttack: OFF_HAND_RULES,
        turn: { resetState: [offHandResetState] },
    },
}));
