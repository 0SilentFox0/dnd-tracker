import { describe, expect, it } from 'vitest';

import { consumeRider, dieSizeOf, HELD_DIE_EFFECT, heldRider } from '../held';

import {
    makeEffect,
    makeParticipant,
} from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleParticipant } from '@/types/battle';

const holding = (...dice: number[]): BattleParticipant => {
    const p = makeParticipant({ id: 'h' });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            activeEffects: dice.map((value, i) =>
                makeEffect(`e${i}`, { effects: [{ type: HELD_DIE_EFFECT, value }] })
            ),
        },
    };
};

describe('dieSizeOf', () => {
    it.each([
        ['D6', 0, 6],
        ['1d8', 0, 8],
        [10, 10, 10],
        [{ formula: '6 + 2' }, 8, 8],
        ['nope', 0, 0],
    ])('%j resolves to %i', (amount, resolved, size) => {
        expect(dieSizeOf(amount as never, resolved)).toBe(size);
    });
});

describe('heldRider', () => {
    it('is null without a die', () => {
        expect(heldRider(holding())).toBeNull();
    });

    it('picks the biggest die', () => {
        expect(heldRider(holding(6, 10, 8))).toEqual({
            effectId: 'e1',
            die: 10,
        });
    });
});

describe('consumeRider', () => {
    it('removes only the spent effect of the holder', () => {
        const other = makeParticipant({ id: 'o' });

        const [h, o] = consumeRider([holding(6, 8), other], 'h', 'e0');

        expect(h.battleData.activeEffects.map((e) => e.id)).toEqual(['e1']);
        expect(o).toBe(other);
    });
});
