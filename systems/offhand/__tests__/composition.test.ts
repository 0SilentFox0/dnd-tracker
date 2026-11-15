import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { resetSystemState } from '@/lib/utils/battle/turn/turn-state';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { d20State, withD20State } from '@/systems/d20/rules/state';

describe('offhand module composition', () => {
    it('the module adds the off-hand hook and the turn reset', () => {
        const { combat } = ruleSystemOf(dnd5eRules());

        expect(combat.offHand).toBeDefined();
        expect(combat.turn?.resetState).toHaveLength(1);
    });

    it('bare d20 has neither', () => {
        const { combat } = ruleSystemOf(bareD20Rules());

        expect(combat.offHand).toBeUndefined();
        expect(combat.turn?.resetState ?? []).toHaveLength(0);
    });

    it('attackedWithLight resets at turn end only with the module', () => {
        const armed = withD20State(createMockParticipant(), {
            attackedWithLight: true,
        });

        expect(
            d20State(resetSystemState(armed, 'turn', dnd5eRules()))
                .attackedWithLight
        ).toBeUndefined();
        expect(
            d20State(resetSystemState(armed, 'turn', bareD20Rules()))
                .attackedWithLight
        ).toBe(true);
    });
});
