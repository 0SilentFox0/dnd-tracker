import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { movementOf } from '@/lib/utils/battle/view';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

describe('movementOf', () => {
    it('counts cells, not feet, and adds extra movement', () => {
        const p = createMockParticipant();

        p.combatStats.speed = 30;
        p.battleData.movementUsed = 2;
        p.battleData.extraMovement = 1;

        expect(movementOf(p, DEFAULT_RULES)).toEqual({ used: 2, max: 7 });
    });

    it('is hidden for a participant that cannot move', () => {
        const p = createMockParticipant();

        p.combatStats.speed = 0;

        expect(movementOf(p, DEFAULT_RULES)).toBeUndefined();
    });
});
