import { LAIR_RULES } from './rules/lair';
import { lairRoundStart } from './rules/round-start';
import { lairUnitPart } from './rules/unit-part';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const LAIR_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: {
        sceneActions: LAIR_RULES,
        turn: { onRoundStart: [lairRoundStart] },
    },
    participant: { fromUnit: [lairUnitPart] },
}));
