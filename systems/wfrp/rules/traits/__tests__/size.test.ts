import { describe, expect, it } from 'vitest';

import { sizeDamageBonus, sizeHitMod, wardRoll } from '../size';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';

const sized = (id: string, size?: TraitSize, ward?: number) => {
    const p = makeParticipant({ id });

    return withStats(
        {
            ...p,
            abilities: {
                ...p.abilities,
                ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS),
            },
        },
        { ...(size && { size }), ...(ward !== undefined && { ward }) }
    );
};

describe('size', () => {
    it('smaller attacker gets -10 per step, never a bonus', () => {
        expect(sizeHitMod(sized('a'), sized('t', 'large'))).toBe(10);
        expect(sizeHitMod(sized('a', 'large'), sized('t'))).toBe(0);
        expect(sizeHitMod(sized('a', 'small'), sized('t', 'enormous'))).toBe(
            30
        );
    });

    it('larger attacker adds damage per step of base', () => {
        expect(sizeDamageBonus(sized('a', 'large'), sized('t'), 6)).toBe(6);
        expect(
            sizeDamageBonus(sized('a', 'enormous'), sized('t', 'small'), 6)
        ).toBe(18);
        expect(sizeDamageBonus(sized('a', 'large'), sized('t'), 0)).toBe(0);
        expect(sizeDamageBonus(sized('a'), sized('t', 'large'), 6)).toBe(0);
    });
});

describe('wardRoll', () => {
    const rollOf = (d10: number) => () => (d10 - 1) / 10 + 0.01;

    it('is null without ward and consumes no rng', () => {
        expect(
            wardRoll(sized('t'), () => {
                throw new Error('rng used');
            })
        ).toBeNull();
    });

    it('saves on d10 >= ward', () => {
        expect(wardRoll(sized('t', undefined, 7), rollOf(7))).toEqual({
            roll: 7,
            saved: true,
        });
        expect(wardRoll(sized('t', undefined, 7), rollOf(6))).toEqual({
            roll: 6,
            saved: false,
        });
        expect(wardRoll(sized('t', undefined, 10), rollOf(9))?.saved).toBe(
            false
        );
        expect(wardRoll(sized('t', undefined, 10), rollOf(10))?.saved).toBe(
            true
        );
        expect(wardRoll(sized('t', undefined, 1), rollOf(1))?.saved).toBe(true);
    });
});
