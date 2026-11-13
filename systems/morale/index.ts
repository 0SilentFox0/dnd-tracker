import { moraleCapPart } from './rules/cap';
import { applyPendingMorale } from './rules/turn/apply-pending';
import { moraleGate } from './rules/turn/gate';
import { moraleOutcomeOf } from './rules/turn/outcome';

import { awaitsMoraleCheck } from '@/lib/utils/battle/morale/awaits-check';
import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const MORALE_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: {
        turn: {
            beforeAdvance: [applyPendingMorale],
            actGates: [moraleGate],
            startCheck: { due: awaitsMoraleCheck, outcomeOf: moraleOutcomeOf },
        },
    },
    participant: { fromCharacter: [moraleCapPart], fromUnit: [moraleCapPart] },
}));
