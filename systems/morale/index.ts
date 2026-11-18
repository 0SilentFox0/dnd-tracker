import { moraleCapPart } from './rules/cap';
import { resetPendingMorale, upgradePendingMorale } from './rules/state';
import { applyPendingMorale } from './rules/turn/apply-pending';
import { moraleGate } from './rules/turn/gate';
import { moraleOutcomeOf } from './rules/turn/outcome';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';
import { awaitsMoraleCheck } from '@/systems/morale/rules/awaits-check';
import { effectiveMorale } from '@/systems/morale/rules/effective-morale';

export const MORALE_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: {
        turn: {
            beforeAdvance: [applyPendingMorale],
            resetScene: [resetPendingMorale],
            upgradeScene: [upgradePendingMorale],
            actGates: [moraleGate],
            startCheck: {
                due: awaitsMoraleCheck,
                valueOf: (p, all) => effectiveMorale(p, all).value,
                outcomeOf: moraleOutcomeOf,
            },
        },
    },
    participant: { fromCharacter: [moraleCapPart], fromUnit: [moraleCapPart] },
}));
