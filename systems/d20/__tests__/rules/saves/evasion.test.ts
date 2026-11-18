import { describe, expect, it } from 'vitest';

import {
    createMockParticipant,
    grantPassive,
} from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { evasionFactor, hasEvasion } from '@/systems/d20/rules/saves/evasion';
import type { BattleParticipant } from '@/types/battle';

const rogue = (): BattleParticipant =>
    grantPassive(createMockParticipant(), [{ kind: 'flag', flag: 'evasion' }]);

describe('evasionFactor', () => {
    it.each([
        [true, false, 0.5],
        [false, false, 1],
        [true, true, 0],
        [false, true, 0.5],
    ])('success=%s evasive=%s gives x%s damage', (ok, ev, factor) => {
        expect(evasionFactor(ok, ev)).toBe(factor);
    });
});

describe('hasEvasion', () => {
    it('is true for a participant with the evasion flag', () => {
        const p = rogue();

        expect(hasEvasion([p], p)).toBe(true);
    });

    it('is false without the flag', () => {
        const p = createMockParticipant();

        expect(hasEvasion([p], p)).toBe(false);
    });

    it('is lost while incapacitated', () => {
        const p = rogue();

        p.battleData.activeEffects = [
            {
                id: 'i',
                name: 'i',
                type: 'debuff',
                duration: 1,
                appliedAt: { round: 1, timestamp: new Date(0) },
                effects: [{ type: 'incapacitated', value: 1 }],
            },
        ];

        expect(hasEvasion([p], p)).toBe(false);
    });
});
