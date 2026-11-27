import { describe, expect, it } from 'vitest';

import { rollAppearance } from '../appearance';

import type { SpeciesProfile } from '@/systems/wfrp/rules/creation/profile';

const a: NonNullable<SpeciesProfile['appearance']> = {
    age: { base: 14, dice: 2 },
    heightCm: { base: 145, dice: 2 },
    eyes: ['blue', 'green', 'brown'],
    hair: ['black', 'red'],
};

const fixed = (v: number) => () => v;

describe('rollAppearance', () => {
    it.each([0, 0.5, 0.99])(
        'age stays within base + dice..10*dice (rng %s)',
        (r) => {
            const { value } = rollAppearance(a, 'age', fixed(r));

            expect(Number(value)).toBeGreaterThanOrEqual(14 + 2);
            expect(Number(value)).toBeLessThanOrEqual(14 + 20);
        }
    );

    it('height converts inches to cm', () => {
        expect(rollAppearance(a, 'height', fixed(0)).value).toBe(
            String(145 + Math.round(2 * 2.54))
        );
        expect(rollAppearance(a, 'height', fixed(0.99)).value).toBe(
            String(145 + Math.round(20 * 2.54))
        );
    });

    it('colours come from the list by d100 index', () => {
        expect(rollAppearance(a, 'eyes', fixed(0))).toEqual({
            roll: 1,
            value: 'blue',
        });
        expect(rollAppearance(a, 'eyes', fixed(0.99)).value).toBe('brown');
        expect(rollAppearance(a, 'hair', fixed(0.5)).value).toBe('red');
    });

    it('zero dice give the base', () => {
        expect(
            rollAppearance(
                { ...a, age: { base: 20, dice: 0 } },
                'age',
                fixed(0.3)
            ).value
        ).toBe('20');
    });
});
